import { Injectable, BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { DatabaseService } from "../common/database.service.js";
import type { ApiRequest } from "../common/api-request.js";
const querySchema = z.object({
  state: z.string().trim().min(2).max(100).optional(),
  district: z.string().trim().min(2).max(100).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
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
}
