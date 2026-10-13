import { Injectable, BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { DatabaseService } from "../common/database.service.js";
import type { ApiRequest } from "../common/api-request.js";
import {
  nearestTown,
  townPoint,
  type Point,
} from "./nearby.js";
import { storedReports } from "./stored.js";
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
    if (q.latitude !== undefined || q.longitude !== undefined) {
      if (q.latitude === undefined || q.longitude === undefined)
        throw new BadRequestException("Both coordinates are required.");
      if (!state || !district) return this.nearbyPrices(req, { ...q, radiusKm: 200 });
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
          "Save a farm location or enter your state and district to load local mandi prices.",
      };
    try {
      const stored = await storedReports(this.db, { state, district, crop: q.recentCrop, offset: q.recentOffset });
      return {
        ...base, ...stored, dataSource: "database",
        status: stored.records.length ? "ok" : "empty",
        message: stored.records.length
          ? "Latest available government market reports. Check each reporting date; these may not be today's prices."
          : "No market reports found for this district. Check the spelling or try a nearby district.",
      };
    } catch {
      return { ...base, status: "unavailable", message: "Government mandi data is temporarily unavailable. Please try again." };
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
    try {
      const stored = await storedReports(this.db, { origin, radiusKm: q.radiusKm, crop: q.recentCrop, offset: q.recentOffset });
      return {
        ...base, ...stored, dataSource: "database", recentPricesIncomplete: false,
        status: stored.records.length ? "ok" : "empty",
        message: stored.records.length
          ? "Latest available daily and recent reports within 200 km. Check the price date; these may not be today's prices."
          : stored.recentNextOffset !== null
            ? "No prices in this batch. Load more recent reports to check other nearby markets."
            : "No available government reports within 200 km. Markets may not have reported prices yet.",
      };
    } catch {
      return { ...base, status: "unavailable", message: "Government mandi data is temporarily unavailable. Please try again." };
    }
  }
}
