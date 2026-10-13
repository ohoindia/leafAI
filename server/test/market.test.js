import assert from "node:assert/strict";
import { test } from "node:test";
Object.assign(process.env, { NODE_ENV: "test", DB_HOST: "localhost", DB_NAME: "test", DB_USER: "test", DB_PASSWORD: "test", OPENAI_API_KEY: "test", JWT_ACCESS_SECRET: "a".repeat(32), JWT_REFRESH_SECRET: "b".repeat(32), UPLOAD_ENCRYPTION_KEY: "c".repeat(64) });
const { MarketService, reportedPrice } = await import("../dist/market/market.service.js");
const req = (query) => ({ query, user: { sub: "7" } });
function database({ unavailable = false, empty = false } = {}) {
  return { execute: async (sql, values) => {
    if (sql.includes("FarmDetails")) return [[{ state: "Telangana", district: "Khammam", latitude: "17.2473", longitude: "80.1514" }]];
    if (unavailable) throw Error("DB unavailable");
    if (sql.includes("FROM market_mandis")) return [empty ? [] : [{ id: 1, market: "Khammam", state: "Telangana", district: "Khammam", latitude: 17.2473, longitude: 80.1514 }]];
    if (sql.includes("FROM market_commodities")) return [[{ name: "Cotton" }]];
    if (sql.includes("market_import_runs")) return [[{ syncedAt: "2026-10-13T09:30:00.000Z" }]];
    assert.match(sql, /WITH ranked/);
    return [[{ mandi_id: 1, commodity: "Cotton", variety: "Other", grade: "FAQ", date: "2026-10-13", modal_price: "8000.00", min_price: null, max_price: "8500.00", previousPrice: "7900.00", previousDate: "2026-10-12" }]];
  } };
}
test("missing and invalid prices never become misleading zero prices", () => {
  for (const value of [null, undefined, "", "NA", -1]) assert.equal(reportedPrice(value), null);
  assert.equal(reportedPrice("2441"), 2441);
});
test("validates coordinates and requires a saved or entered location", async () => {
  const service = new MarketService({ execute: async () => [[]] });
  assert.equal((await service.prices(req({}))).status, "location_required");
  await assert.rejects(service.prices(req({ latitude: "17" })));
  await assert.rejects(service.prices(req({ latitude: "91", longitude: "78" })));
});
test("district and nearby prices use the database even when government APIs are offline", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => { assert.fail("Mandi requests must never fetch external data"); };
  try {
    const service = new MarketService(database());
    for (const query of [{}, { radiusKm: "200" }, { latitude: "17.2473", longitude: "80.1514" }, { radiusKm: "200", recentCrop: "Cotton" }]) {
      const result = await service.prices(req(query));
      assert.equal(result.status, "ok"); assert.equal(result.dataSource, "database");
      assert.equal(result.records[0].modal, 8000); assert.equal(result.records[0].min, null);
      assert.equal(result.records[0].change, 100); assert.equal(result.records[0].date, "2026-10-13");
      assert.equal(result.syncedAt, "2026-10-13T09:30:00.000Z");
    }
  } finally { globalThis.fetch = previous; }
});
test("empty storage and database failures do not invent market prices", async () => {
  assert.equal((await new MarketService(database({ empty: true })).prices(req({}))).status, "empty");
  assert.equal((await new MarketService(database({ unavailable: true })).prices(req({}))).status, "unavailable");
  assert.equal((await new MarketService(database()).prices(req({ radiusKm: "200", latitude: "0", longitude: "0" }))).status, "location_required");
});
