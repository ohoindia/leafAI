import assert from "node:assert/strict";
import { test } from "node:test";
Object.assign(process.env, {
  NODE_ENV: "test",
  DB_HOST: "localhost",
  DB_NAME: "test",
  DB_USER: "test",
  DB_PASSWORD: "test",
  OPENAI_API_KEY: "test",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  UPLOAD_ENCRYPTION_KEY: "c".repeat(64),
});
const { MarketService, reportedPrice } =
  await import("../dist/market/market.service.js");
const req = (query) => ({ query, user: { sub: "7" } });
test("missing and invalid prices never become misleading zero prices", () => {
  for (const value of [null, undefined, "", "NA", -1])
    assert.equal(reportedPrice(value), null);
  assert.equal(reportedPrice("2441"), 2441);
});
test("requires a local district and validates coordinates", async () => {
  const service = new MarketService({ execute: async () => [[]] });
  assert.equal((await service.prices(req({}))).status, "location_required");
  await assert.rejects(service.prices(req({ latitude: "17" })));
  await assert.rejects(
    service.prices(req({ latitude: "91", longitude: "78" })),
  );
});
test("saved farm loads real reports with district filters and dates; feed failure does not invent prices", async () => {
  const previous = globalThis.fetch,
    key = process.env.DATA_GOV_IN_API_KEY;
  process.env.DATA_GOV_IN_API_KEY = "test";
  const service = new MarketService({
    execute: async () => [[{ state: "Telangana", district: "Warangal" }]],
  });
  try {
    globalThis.fetch = async (url) => {
      assert.equal(url.searchParams.get("api-key"), "test");
      assert.equal(url.searchParams.has("api_key"), false);
      assert.equal(url.searchParams.get("filters[district]"), "Warangal");
      assert.equal(url.searchParams.get("filters[state]"), "Telangana");
      return {
        ok: true,
        json: async () => ({
          total: 1,
          records: [
            {
              state: "Telangana",
              district: "Warangal",
              commodity: "Cotton",
              variety: "Other",
              market: "Warangal",
              arrival_date: "10/10/2026",
              modal_price: "8000",
              min_price: "",
              max_price: "8500",
            },
          ],
        }),
      };
    };
    const result = await service.prices(req({}));
    assert.equal(result.status, "ok");
    assert.equal(result.records[0].modal, 8000);
    assert.equal(result.records[0].min, null);
    assert.equal(result.records[0].date, "10/10/2026");
    globalThis.fetch = async () => {
      throw Error("offline");
    };
    assert.equal((await service.prices(req({}))).status, "unavailable");
    delete process.env.DATA_GOV_IN_API_KEY;
    assert.deepEqual((await service.prices(req({}))).records, []);
  } finally {
    globalThis.fetch = previous;
    if (key === undefined) delete process.env.DATA_GOV_IN_API_KEY;
    else process.env.DATA_GOV_IN_API_KEY = key;
  }
});

test("device coordinates resolve district; unsupported locations require manual selection", async () => {
  const previous = globalThis.fetch,
    key = process.env.DATA_GOV_IN_API_KEY;
  delete process.env.DATA_GOV_IN_API_KEY;
  try {
    globalThis.fetch = async (url) => {
      assert.equal(url.searchParams.get("zoom"), "10");
      return {
        ok: true,
        json: async () => ({
          address: {
            country_code: "in",
            state: "Telangana",
            state_district: "Warangal District",
          },
        }),
      };
    };
    const service = new MarketService({ execute: async () => [[]] });
    const result = await service.prices(
      req({ latitude: "17", longitude: "78" }),
    );
    assert.equal(result.location.district, "Warangal");
    assert.equal(result.status, "unavailable");
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ address: { country_code: "us" } }),
    });
    assert.equal(
      (await service.prices(req({ latitude: "17", longitude: "78" }))).status,
      "location_required",
    );
  } finally {
    globalThis.fetch = previous;
    if (key !== undefined) process.env.DATA_GOV_IN_API_KEY = key;
  }
});
