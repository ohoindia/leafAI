import { readFileSync } from "node:fs";
import { distanceKm, possibleNearbyState, townPoint, type Point } from "./nearby.js";

type Commodity = { id: number; name: string; marketIds: number[] };
type Metadata = {
  states: { state_id: number; state_name: string }[];
  districts: { id: number; district_name: string }[];
  markets: { id: number; state_id: number; district_id: number; mkt_name: string }[];
  commodities: Commodity[];
};
let metadata: Metadata | undefined;
function registry(): Metadata {
  return metadata ??= JSON.parse(readFileSync(new URL("../../assets/agmarknet-markets.json", import.meta.url), "utf8"));
}
const priceCache = new Map<string, { expires: number; pending: Promise<any> }>();
async function weekly(marketId: number, stateId: number, commodityId: number, signal: AbortSignal) {
  const key = `${marketId}:${stateId}:${commodityId}`;
  const cached = priceCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.pending;
  const pending = (async () => {
    const url = new URL("https://api.agmarknet.gov.in/v1/prices-and-arrivals/commodity-price/lastweek");
    url.search = new URLSearchParams({ marketId: String(marketId), stateId: String(stateId), commodityId: String(commodityId), includeExcel: "false" }).toString();
    const response = await fetch(url, { headers: { "User-Agent": "LeafAI-Market/1.0" }, signal });
    if (response.status === 404) return { success: true, columns: [], data: [] };
    if (!response.ok) throw Error(`Recent reports unavailable (${response.status})`);
    const data = await response.json() as any;
    if (!data.success || !Array.isArray(data.data) || !Array.isArray(data.columns)) throw Error("Invalid recent report");
    return data;
  })();
  priceCache.set(key, { expires: Date.now() + 15 * 60 * 1000, pending });
  if (priceCache.size > 3000) priceCache.delete(priceCache.keys().next().value!);
  pending.catch(() => { if (priceCache.get(key)?.pending === pending) priceCache.delete(key); });
  return pending;
}
export function weeklyRecords(data: any, commodity: string, today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)) {
  const cutoff = new Date(Date.parse(today) - 14 * 86400000).toISOString().slice(0, 10);
  const dates = data.columns.map((c: any) => c.key).filter((key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key) &&
    Number.isFinite(Date.parse(key)) && key <= today && key >= cutoff).sort().reverse();
  return data.data.flatMap((row: any) => {
    if (!/^rs\.?\s*\/\s*quintal$/i.test(String(row.unitOfPrice)) || row.variety === "Unknown") return [];
    const points = dates.flatMap((date: string) => {
      if (row[date] == null || String(row[date]).trim() === "") return [];
      const value = Number(row[date]);
      return Number.isFinite(value) && value > 0 ? [{ date, value }] : [];
    });
    if (!points.length) return [];
    const [latest, previous] = points;
    const label = String(row.variety || "");
    return [{ commodity, variety: label.startsWith(commodity + " - ") ? label.slice(commodity.length + 3) : label,
      arrival_date: latest.date, min_price: null, max_price: null, modal_price: latest.value,
      priceKind: "reported", source: "AGMARKNET recent reports", previousPrice: previous?.value ?? null,
      previousDate: previous?.date ?? null, change: previous ? latest.value - previous.value : null }];
  });
}
export async function recentNearbyReports(origin: Point, radiusKm: number, offset = 0, crop?: string) {
  const meta = registry();
  const states = new Map(meta.states.map(s => [s.state_id, s.state_name]));
  const districts = new Map(meta.districts.map(d => [d.id, d.district_name]));
  const marketCrops = new Map<number, Commodity[]>();
  for (const c of meta.commodities.filter(c => !crop || c.name.toLowerCase() === crop.toLowerCase())) for (const id of c.marketIds) {
    const crops = marketCrops.get(id) || []; crops.push(c); marketCrops.set(id, crops);
  }
  let unresolvedMarkets = 0;
  const markets = meta.markets.flatMap(m => {
    const state = states.get(m.state_id) || "", district = districts.get(m.district_id) || "";
    if (!marketCrops.has(m.id) || !possibleNearbyState(state, origin, radiusKm)) return [];
    const point = townPoint(state, district, m.mkt_name);
    if (!point) { unresolvedMarkets++; return []; }
    const distance = distanceKm(origin, point);
    return distance <= radiusKm ? [{ ...m, state, district, distanceKm: Math.round(distance * 10) / 10 }] : [];
  }).sort((a, b) => a.distanceKm - b.distanceKm);
  const pairs = markets.flatMap(m => marketCrops.get(m.id)!.map(c => ({ m, c })));
  const signal = AbortSignal.timeout(18000);
  let cursor = offset, failedRequests = 0;
  const records: any[] = [];
  // A specific crop may not trade in the nearest markets. Check up to three
  // batches when the earlier batch is empty, within the same 18-second budget.
  for (let batch = 0; batch < (crop ? 3 : 1) && cursor < pairs.length && !signal.aborted; batch++) {
    const page = pairs.slice(cursor, cursor + 45);
    let index = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (index < page.length && !signal.aborted) {
        const { m, c } = page[index++];
        try {
          const data = await weekly(m.id, m.state_id, c.id, signal);
          for (const r of weeklyRecords(data, c.name)) records.push({ ...r, market: m.mkt_name, state: m.state, district: m.district, distanceKm: m.distanceKm });
        } catch { failedRequests++; }
      }
    }));
    failedRequests += page.length - index;
    cursor += index;
    if (records.length) break;
  }
  return { records, unresolvedMarkets, failedRequests,
    nextOffset: cursor < pairs.length ? cursor : null,
    supportedCrops: meta.commodities.map(c => c.name) };
}
export function latestReports(records: any[]) {
  const latest = new Map<string, any>();
  const dateNumber = (r: any) => {
    const date = String(r.arrival_date);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return Date.parse(date.split("/").reverse().join("-"));
    return Date.parse(date);
  };
  for (const r of records) {
    const key = JSON.stringify([r.state, r.district, r.market, r.commodity, r.variety]);
    const old = latest.get(key);
    if (!old || dateNumber(r) > dateNumber(old)) latest.set(key, r);
  }
  return [...latest.values()].sort((a, b) => a.distanceKm - b.distanceKm);
}
