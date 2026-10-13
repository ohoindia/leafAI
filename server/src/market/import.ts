import { setTimeout as delay } from "node:timers/promises";
import { commodityKey } from "./commodity.js";
import { townPoint } from "./nearby.js";

export const dailyResource = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";
export function indiaDate(now = new Date()) {
  return new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
}
export function importWindow(initial: boolean, today = indiaDate()) {
  // Include today and the previous 120/10 calendar days, in Indian time.
  return { from: new Date(Date.parse(today) - (initial ? 120 : 10) * 86400000).toISOString().slice(0, 10), to: today };
}
export function reportDate(value: unknown) {
  const raw = String(value ?? "");
  const date = /^\d{2}\/\d{2}\/\d{4}$/.test(raw) ? raw.split("/").reverse().join("-") : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
    throw Error("Invalid market report date");
  return date;
}
function name(value: unknown, max: number, optional = false) {
  const result = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if ((!result && !optional) || result.length > max) throw Error("Invalid market report label");
  return result;
}
function price(value: unknown) {
  if (value == null || String(value).trim() === "" || /^(NA|NR|N\/A)$/i.test(String(value).trim())) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n >= 1e12) throw Error("Invalid market price");
  return Math.round(n * 100) / 100;
}
export function normalizeReport(row: any) {
  const result = {
    state: name(row.state, 100), district: name(row.district, 100), market: name(row.market, 200),
    commodity: name(row.commodity, 200), variety: name(row.variety, 200, true), grade: name(row.grade, 100, true),
    date: reportDate(row.arrival_date), min: price(row.min_price), max: price(row.max_price), modal: price(row.modal_price),
  };
  if (result.min !== null && result.max !== null && result.min > result.max) throw Error("Invalid market price range");
  return result;
}
export async function* feedPages(key: string, fetcher: typeof fetch = fetch, signal?: AbortSignal) {
  let offset = 0, total = Infinity;
  while (offset < total) {
    const url = new URL(dailyResource);
    url.search = new URLSearchParams({ "api-key": key, format: "json", limit: "1000", offset: String(offset) }).toString();
    let data: any;
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetcher(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) });
        if (!response.ok) throw Error(`Market provider HTTP ${response.status}`);
        data = await response.json();
        if (!Array.isArray(data.records) || !Number.isInteger(Number(data.total)) || Number(data.total) < 0)
          throw Error("Invalid market provider response");
        break;
      } catch (error) {
        if (attempt >= 2 || signal?.aborted) throw error;
        await delay(1000 * (attempt + 1), undefined, { signal });
      }
    }
    // A moving feed can grow during a scan. Read through its latest advertised count.
    total = Number(data.total);
    if (!data.records.length && offset < total) throw Error("Market provider returned an incomplete page");
    if (!data.records.length) return;
    yield data.records;
    offset += data.records.length;
  }
}

// The cache lives for one import only. Any rollback ends that import; IDs from
// a rolled-back transaction are never reused. The DB lock serializes importers.
export async function savePage(connection: any, rows: ReturnType<typeof normalizeReport>[], cache = new Map<string, number>()) {
  async function dimension(table: string, fields: Record<string, any>, extras: Record<string, any> = {}) {
    const key = JSON.stringify([table, fields]);
    if (cache.has(key)) return cache.get(key)!;
    const columns = Object.keys(fields);
    const [existing] = await connection.execute(`SELECT id FROM ${table} WHERE ${columns.map((c) => `${c}=?`).join(" AND ")}`, Object.values(fields));
    let id = existing[0]?.id;
    if (!id) {
      const values = { ...fields, ...extras };
      const [inserted] = await connection.execute(`INSERT INTO ${table} (${Object.keys(values).join(",")}) VALUES (${Object.keys(values).map(() => "?").join(",")})`, Object.values(values));
      id = inserted.insertId;
    }
    cache.set(key, id);
    return id as number;
  }
  const prepared = new Map<string, any[]>();
  for (const row of rows) {
    const state = await dimension("market_states", { name: row.state });
    const district = await dimension("market_districts", { state_id: state, name: row.district });
    const point = townPoint(row.state, row.district, row.market);
    const market = await dimension("market_mandis", { district_id: district, name: row.market }, { latitude: point?.latitude ?? null, longitude: point?.longitude ?? null });
    const commodity = await dimension("market_commodities", { name: row.commodity }, { commodity_key: commodityKey(row.commodity) });
    const variety = await dimension("market_varieties", { commodity_id: commodity, name: row.variety });
    const grade = await dimension("market_grades", { name: row.grade });
    const values = [market, variety, grade, row.date, row.min, row.max, row.modal];
    prepared.set(JSON.stringify(values.slice(0, 4)), values);
  }
  const counts = { inserted: 0, updated: 0, unchanged: 0 };
  const values = [...prepared.values()];
  for (let start = 0; start < values.length; start += 250) {
    const batch = values.slice(start, start + 250);
    const [existing] = await connection.execute(`SELECT mandi_id,variety_id,grade_id,DATE_FORMAT(report_date,'%Y-%m-%d') AS date,min_price,max_price,modal_price FROM market_prices WHERE (mandi_id,variety_id,grade_id,report_date) IN (${batch.map(() => "(?,?,?,?)").join(",")}) FOR UPDATE`, batch.flatMap((r) => r.slice(0, 4)));
    const old = new Map(existing.map((r: any) => [JSON.stringify([r.mandi_id, r.variety_id, r.grade_id, r.date]), [r.min_price, r.max_price, r.modal_price].map((v) => v == null ? null : Number(v))]));
    const changed = batch.filter((r) => {
      const previous = old.get(JSON.stringify(r.slice(0, 4)));
      if (!previous) { counts.inserted++; return true; }
      if (JSON.stringify(previous) !== JSON.stringify(r.slice(4))) { counts.updated++; return true; }
      counts.unchanged++; return false;
    });
    if (changed.length) await connection.execute(`INSERT INTO market_prices(mandi_id,variety_id,grade_id,report_date,min_price,max_price,modal_price) VALUES ${changed.map(() => "(?,?,?,?,?,?,?)").join(",")} ON DUPLICATE KEY UPDATE min_price=VALUES(min_price),max_price=VALUES(max_price),modal_price=VALUES(modal_price),updated_at=CURRENT_TIMESTAMP(3)`, changed.flat());
  }
  return counts;
}

export async function runMarketImport(pool: any, options: { now?: Date; fetcher?: typeof fetch; signal?: AbortSignal } = {}) {
  const key = process.env.DATA_GOV_IN_API_KEY;
  if (!key) throw Error("DATA_GOV_IN_API_KEY is required for the market importer");
  const connection = await pool.getConnection();
  let locked = false, runId: number | undefined;
  const counts = { received: 0, inserted: 0, updated: 0, unchanged: 0, outside: 0 };
  let earliest: string | null = null, latest: string | null = null;
  try {
    const [lock] = await connection.execute("SELECT GET_LOCK('leafai_market_import',0) AS acquired");
    if (Number(lock[0].acquired) !== 1) return { status: "already_running" };
    locked = true;
    // Holding the lock proves any previous running job has lost its connection.
    await connection.execute("UPDATE market_import_runs SET status='failed',error_message='Import interrupted; retry is safe.',finished_at=CURRENT_TIMESTAMP(3) WHERE status='running'");
    const dimensions = new Map<string, number>();
    const tables: Record<string, string[]> = {
      market_states: ["name"], market_districts: ["state_id", "name"],
      market_mandis: ["district_id", "name"], market_commodities: ["name"],
      market_varieties: ["commodity_id", "name"], market_grades: ["name"],
    };
    for (const [table, fields] of Object.entries(tables)) {
      const [rows] = await connection.execute(`SELECT id,${fields.join(",")} FROM ${table}`);
      for (const row of rows) dimensions.set(JSON.stringify([table, Object.fromEntries(fields.map((field) => [field, row[field]]))]), row.id);
    }
    const [previous] = await connection.execute("SELECT id FROM market_import_runs WHERE status='success' ORDER BY id DESC LIMIT 1");
    const initial = !previous.length;
    const window = importWindow(initial, indiaDate(options.now));
    const [run] = await connection.execute("INSERT INTO market_import_runs(mode,from_date,to_date) VALUES(?,?,?)", [initial ? "bootstrap" : "refresh", window.from, window.to]);
    runId = run.insertId;
    for await (const page of feedPages(key, options.fetcher, options.signal)) {
      options.signal?.throwIfAborted();
      const normalized = page.map(normalizeReport);
      const rows = normalized.filter((r: ReturnType<typeof normalizeReport>) => r.date >= window.from && r.date <= window.to);
      await connection.beginTransaction();
      try {
        const saved = await savePage(connection, rows, dimensions);
        options.signal?.throwIfAborted();
        const next = { received: counts.received + page.length, inserted: counts.inserted + saved.inserted, updated: counts.updated + saved.updated, unchanged: counts.unchanged + saved.unchanged, outside: counts.outside + page.length - rows.length };
        let first: string | null = earliest, last: string | null = latest;
        for (const r of rows) { if (!first || r.date < first) first = r.date; if (!last || r.date > last) last = r.date; }
        await connection.execute("UPDATE market_import_runs SET records_received=?,records_inserted=?,records_updated=?,records_unchanged=?,records_outside_window=?,earliest_report=?,latest_report=? WHERE id=?", [next.received, next.inserted, next.updated, next.unchanged, next.outside, first, last, runId]);
        await connection.commit();
        Object.assign(counts, next); earliest = first; latest = last;
      } catch (error) { await connection.rollback(); throw error; }
    }
    // The configured government resource is a current snapshot, NOT a historical
    // archive. Never claim a 120-day backfill based on a successful snapshot scan.
    await connection.execute("UPDATE market_import_runs SET status='success',finished_at=CURRENT_TIMESTAMP(3) WHERE id=?", [runId]);
    return { status: "success", mode: initial ? "bootstrap" : "refresh", ...window, ...counts, earliest, latest, historicalBackfillComplete: false };
  } catch (error) {
    if (runId) await connection.execute("UPDATE market_import_runs SET status='failed',error_message=?,finished_at=CURRENT_TIMESTAMP(3) WHERE id=?", ["Market import failed; retry the importer. Previously saved prices are retained.", runId]);
    // Do not log provider URLs, API keys, or database connection details.
    throw Error("Market import failed; inspect provider access and database availability.");
  } finally {
    try { if (locked) await connection.execute("SELECT RELEASE_LOCK('leafai_market_import')"); }
    finally { connection.release(); }
  }
}
