import { commodityKey } from "./commodity.js";
import { distanceKm, locationKeys, type Point } from "./nearby.js";
import { indiaDate, importWindow } from "./import.js";

export async function storedReports(db: { execute: (sql: string, values?: any[]) => Promise<any> }, options: { state?: string; district?: string; origin?: Point; radiusKm?: number; crop?: string; offset?: number }) {
  const clauses = [], parameters: any[] = [];
  if (options.origin) {
    const deltaLat = options.radiusKm! / 110;
    const deltaLon = options.radiusKm! / (110 * Math.cos((Math.abs(options.origin.latitude) + deltaLat) * Math.PI / 180));
    clauses.push("m.latitude BETWEEN ? AND ? AND m.longitude BETWEEN ? AND ?");
    parameters.push(options.origin.latitude - deltaLat, options.origin.latitude + deltaLat, options.origin.longitude - deltaLon, options.origin.longitude + deltaLon);
  } else {
    const keys = locationKeys(options.state!, options.district!);
    clauses.push(`REGEXP_REPLACE(LOWER(s.name),'[^a-z0-9]','') IN (${keys.states.map(() => "?").join(",")}) AND REGEXP_REPLACE(LOWER(TRIM(REGEXP_REPLACE(d.name,' district$',''))),'[^a-z0-9]','') IN (${keys.districts.map(() => "?").join(",")})`);
    parameters.push(...keys.states, ...keys.districts);
  }
  // Filter crop availability before pagination, so an uncommon crop is not
  // hidden behind many pages of markets that never reported it.
  if (options.crop) {
    clauses.push("EXISTS (SELECT 1 FROM market_prices p JOIN market_varieties v ON v.id=p.variety_id JOIN market_commodities c ON c.id=v.commodity_id WHERE p.mandi_id=m.id AND c.commodity_key=? AND p.report_date BETWEEN ? AND ?)");
    parameters.push(commodityKey(options.crop), importWindow(true).from, indiaDate());
  }
  const [mandis] = await db.execute(`SELECT m.id,m.name AS market,m.latitude,m.longitude,d.name AS district,s.name AS state FROM market_mandis m JOIN market_districts d ON d.id=m.district_id JOIN market_states s ON s.id=d.state_id WHERE ${clauses.join(" AND ")}`, parameters);
  const nearby = mandis.flatMap((m: any) => {
    const distance = options.origin ? distanceKm(options.origin, { latitude: Number(m.latitude), longitude: Number(m.longitude) }) : undefined;
    return distance === undefined || distance <= options.radiusKm! ? [{ ...m, distanceKm: distance === undefined ? undefined : Math.round(distance * 10) / 10 }] : [];
  }).sort((a: any, b: any) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.id - b.id);
  const selected = nearby.slice(options.offset ?? 0, (options.offset ?? 0) + 50);
  const [crops] = await db.execute("SELECT name FROM market_commodities ORDER BY name");
  const [runs] = await db.execute("SELECT DATE_FORMAT(finished_at,'%Y-%m-%dT%H:%i:%s.000Z') AS syncedAt FROM market_import_runs WHERE status='success' ORDER BY id DESC LIMIT 1");
  const metadata = {
    recentNextOffset: (options.offset ?? 0) + selected.length < nearby.length ? (options.offset ?? 0) + selected.length : null,
    supportedRecentCrops: crops.map((c: any) => c.name), syncedAt: runs[0]?.syncedAt ?? null,
  };
  if (!selected.length) return { records: [], ...metadata };
  const cropFilter = options.crop ? " AND c.commodity_key=?" : "";
  const [reports] = await db.execute(`WITH ranked AS (
    SELECT p.mandi_id,p.variety_id,p.grade_id,p.report_date,p.min_price,p.max_price,p.modal_price,
      c.name AS commodity,v.name AS variety,g.name AS grade,
      ROW_NUMBER() OVER (PARTITION BY p.mandi_id,p.variety_id,p.grade_id ORDER BY p.report_date DESC) AS position
    FROM market_prices p JOIN market_varieties v ON v.id=p.variety_id
    JOIN market_commodities c ON c.id=v.commodity_id JOIN market_grades g ON g.id=p.grade_id
    WHERE p.mandi_id IN (${selected.map(() => "?").join(",")}) AND p.report_date BETWEEN ? AND ?${cropFilter}
  ) SELECT a.*,DATE_FORMAT(a.report_date,'%Y-%m-%d') AS date,b.modal_price AS previousPrice,
      DATE_FORMAT(b.report_date,'%Y-%m-%d') AS previousDate
    FROM ranked a LEFT JOIN ranked b ON b.mandi_id=a.mandi_id AND b.variety_id=a.variety_id AND b.grade_id=a.grade_id AND b.position=2
    WHERE a.position=1 ORDER BY a.commodity,a.variety,a.grade`, [...selected.map((m: any) => m.id), importWindow(true).from, indiaDate(), ...(options.crop ? [commodityKey(options.crop)] : [])]);
  const markets = new Map(selected.map((m: any) => [m.id, m]));
  const num = (v: any) => v == null ? null : Number(v);
  return {
    ...metadata,
    records: reports.map((r: any) => {
      const m: any = markets.get(r.mandi_id);
      const modal = num(r.modal_price), previousPrice = num(r.previousPrice);
      return { commodity: r.commodity, variety: r.variety, grade: r.grade, market: m.market, state: m.state, district: m.district, distanceKm: m.distanceKm, date: r.date,
        min: num(r.min_price), max: num(r.max_price), modal, previousPrice, previousDate: r.previousDate,
        change: modal !== null && previousPrice !== null ? Math.round((modal - previousPrice) * 100) / 100 : null,
        priceKind: "modal", source: "AGMARKNET / data.gov.in" };
    }).sort((a: any, b: any) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)),
  };
}
