import { Injectable, BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { DatabaseService } from "../common/database.service.js";
import type { ApiRequest } from "../common/api-request.js";
import {
  nationalReports,
  nearbyReports,
  nearestTown,
  townPoint,
  type Point,
} from "./nearby.js";
import { latestReports, recentNearbyReports } from "./recent.js";
import { commodityKey } from "./commodity.js";
const querySchema = z.object({
  state: z.string().trim().min(2).max(100).optional(),
  district: z.string().trim().min(2).max(100).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().int().min(200).max(200).optional(),
  recentOffset: z.coerce.number().int().min(0).max(100000).optional(),
  recentCrop: z.string().trim().min(2).max(100).optional(),
});
export function reportedPrice(value: unknown) {
  if (value == null || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
@Injectable()
export class MarketService {
  constructor(private readonly db: DatabaseService) {}
  async prices(req: ApiRequest) {
    const q = querySchema.parse(req.query);
    if (q.radiusKm !== undefined) return this.nearbyPrices(req, q);
    let state = q.state || "",
      district = q.district || "";
    let locationError = "";
    if (q.latitude !== undefined || q.longitude !== undefined) {
      if (q.latitude === undefined || q.longitude === undefined)
        throw new BadRequestException("Both coordinates are required.");
      try {
        const url = new URL("https://nominatim.openstreetmap.org/reverse");
        url.search = new URLSearchParams({
          lat: String(q.latitude),
          lon: String(q.longitude),
          format: "json",
          zoom: "10",
          "accept-language": "en",
        }).toString();
        const response = await fetch(url, {
          headers: { "User-Agent": "LeafAI-Market/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw Error();
        const data = (await response.json()) as any;
        if (data.address?.country_code !== "in") throw Error();
        state = data.address.state || "";
        district = (
          data.address.state_district ||
          data.address.county ||
          ""
        ).replace(/ district$/i, "");
        if (!state || !district) throw Error();
      } catch {
        locationError =
          "Could not identify your Indian district. Enter state and district below.";
        state = "";
        district = "";
      }
    } else if (!state && !district) {
      const [farms] = await this.db.execute(
        "SELECT state,district FROM FarmDetails WHERE user_id=? ORDER BY created_at,id",
        [req.user.sub],
      );
      const farm = farms.find((f: any) => f.state && f.district);
      state = farm?.state || "";
      district = farm?.district || "";
    }
    const base = {
      location: { state, district },
      records: [] as any[],
      fetchedAt: new Date().toISOString(),
      truncated: false,
    };
    if (!state || !district)
      return {
        ...base,
        status: "location_required",
        message:
          locationError ||
          "Save a farm location or enter your state and district to load local mandi prices.",
      };
    const key = process.env.DATA_GOV_IN_API_KEY;
    if (!key)
      return {
        ...base,
        status: "unavailable",
        message:
          "Local mandi data is not connected yet. Government MSPs are available below.",
      };
    try {
      const url = new URL(
        "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
      );
      url.search = new URLSearchParams({
        "api-key": key,
        format: "json",
        limit: "1000",
        "filters[state]": state,
        "filters[district]": district,
      }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw Error();
      const data = (await response.json()) as any;
      if (!Array.isArray(data.records)) throw Error();
      const records = data.records
        .filter(
          (r: any) =>
            String(r.state).toLowerCase() === state.toLowerCase() &&
            String(r.district).toLowerCase() === district.toLowerCase(),
        )
        .map((r: any) => ({
          commodity: r.commodity,
          variety: r.variety,
          market: r.market,
          date: r.arrival_date,
          min: reportedPrice(r.min_price),
          max: reportedPrice(r.max_price),
          modal: reportedPrice(r.modal_price),
        }));
      return {
        ...base,
        records,
        truncated: Number(data.total) > 1000,
        status: records.length ? "ok" : "empty",
        message: records.length
          ? "Latest available government market reports. Check each reporting date; these may not be today's prices."
          : "No market reports found for this district. Check the spelling or try a nearby district.",
      };
    } catch {
      return {
        ...base,
        status: "unavailable",
        message:
          "Government mandi data is temporarily unavailable. Please try again.",
      };
    }
  }
  private async nearbyPrices(req: ApiRequest, q: z.infer<typeof querySchema>) {
    if ((q.latitude === undefined) !== (q.longitude === undefined))
      throw new BadRequestException("Both coordinates are required.");
    let state = q.state || "",
      district = q.district || "";
    let origin: Point | undefined =
      q.latitude !== undefined && q.longitude !== undefined
        ? { latitude: q.latitude, longitude: q.longitude }
        : undefined;
    let originApproximate = false;
    if (!origin && !state && !district) {
      const [farms] = await this.db.execute(
        "SELECT state,district,latitude,longitude FROM FarmDetails WHERE user_id=? ORDER BY created_at,id",
        [req.user.sub],
      );
      const farm =
        farms.find((f: any) => f.latitude != null && f.longitude != null) ||
        farms.find((f: any) => f.state && f.district);
      state = farm?.state || "";
      district = farm?.district || "";
      if (
        farm?.latitude != null &&
        farm?.longitude != null &&
        Number.isFinite(Number(farm.latitude)) &&
        Number.isFinite(Number(farm.longitude)) &&
        Math.abs(Number(farm.latitude)) <= 90 &&
        Math.abs(Number(farm.longitude)) <= 180
      )
        origin = {
          latitude: Number(farm.latitude),
          longitude: Number(farm.longitude),
        };
    }
    if (!origin && state && district) {
      origin = townPoint(state, district, district);
      originApproximate = !!origin;
    }
    const base = {
      location: {
        state,
        district,
        ...origin,
        ...(!district && origin ? { nearbyTown: nearestTown(origin) } : {}),
      },
      radiusKm: q.radiusKm!,
      originApproximate,
      records: [] as any[],
      fetchedAt: new Date().toISOString(),
      truncated: false,
      unresolvedMarkets: 0,
    };
    if (!origin)
      return {
        ...base,
        status: "location_required",
        message:
          "Use my location to find mandis within 200 km across all states.",
      };
    if (
      origin.latitude < 6 ||
      origin.latitude > 38 ||
      origin.longitude < 68 ||
      origin.longitude > 98
    )
      return {
        ...base,
        status: "location_required",
        message:
          "Your device coordinates are outside the supported Indian market area. Enter your state and district.",
      };
    const key = process.env.DATA_GOV_IN_API_KEY;
    try {
      const [dailyResult, recentResult] = await Promise.allSettled([
        key
          ? nationalReports(key)
          : Promise.reject(Error("Daily feed not configured")),
        recentNearbyReports(
          origin,
          q.radiusKm!,
          q.recentOffset || 0,
          q.recentCrop,
        ),
      ]);
      const feed =
        dailyResult.status === "fulfilled"
          ? dailyResult.value
          : { records: [], truncated: false };
      const nearby = nearbyReports(feed.records, origin, q.radiusKm!);
      const recent =
        recentResult.status === "fulfilled"
          ? recentResult.value
          : {
              records: [],
              unresolvedMarkets: 0,
              failedRequests: 1,
              nextOffset: null,
              supportedCrops: [],
            };
      const cropReports = [...nearby.records, ...recent.records].filter(
        (record) => !q.recentCrop || commodityKey(record.commodity) === commodityKey(q.recentCrop),
      );
      const records = latestReports(cropReports).map(
        (r) => ({
          commodity: r.commodity,
          variety: r.variety,
          market: r.market,
          state: r.state,
          district: r.district,
          date: r.arrival_date,
          distanceKm: r.distanceKm,
          min: reportedPrice(r.min_price),
          max: reportedPrice(r.max_price),
          modal: reportedPrice(r.modal_price),
          source: r.source || "AGMARKNET / data.gov.in",
          priceKind: r.priceKind || "modal",
          previousPrice: r.previousPrice ?? null,
          previousDate: r.previousDate ?? null,
          change: r.change ?? null,
        }),
      );
      return {
        ...base,
        records,
        truncated: feed.truncated,
        unresolvedMarkets: nearby.unresolvedMarkets + recent.unresolvedMarkets,
        recentNextOffset: recent.nextOffset,
        recentPricesIncomplete: recent.failedRequests > 0,
        supportedRecentCrops: recent.supportedCrops,
        status: records.length
          ? "ok"
          : recent.failedRequests
            ? "unavailable"
            : "empty",
        message: records.length
          ? "Latest available daily and recent reports within 200 km. Check the price date; these may not be today's prices."
          : recent.failedRequests
            ? "Government mandi data is temporarily unavailable. Please try again."
            : recent.nextOffset != null
              ? "No prices in this batch. Load more recent reports to check other nearby markets."
              : "No available government reports within 200 km. Markets may not have reported prices yet.",
      };
    } catch {
      return {
        ...base,
        status: "unavailable",
        message:
          "Government mandi data is temporarily unavailable. Please try again.",
      };
    }
  }
}
