import assert from "node:assert/strict";
import { test } from "node:test";
import { distanceKm, townPoint, nearbyReports, nationalReports } from "../dist/market/nearby.js";

test("distance uses a 200 km radius rather than state boundaries", () => {
  const origin = { latitude: 17.2473, longitude: 80.1514 }; // Khammam, Telangana
  const reports = [
    { state: "Andhra Pradesh", district: "NTR", market: "Vijayawada", commodity: "Rice" },
    { state: "Telangana", district: "Adilabad", market: "Adilabad", commodity: "Cotton" },
    { state: "Andhra Pradesh", district: "Krishna", market: "Unknown market XYZ", commodity: "Rice" },
  ];
  const result = nearbyReports(reports, origin, 200);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].state, "Andhra Pradesh");
  assert.ok(result.records[0].distanceKm > 50 && result.records[0].distanceKm < 200);
  assert.equal(result.unresolvedMarkets, 1);
  assert.equal(distanceKm(origin, origin), 0);
});

test("town lookup handles aliases and never substitutes an unknown town", () => {
  assert.ok(townPoint("Telangana", "Warangal", "Warangal"));
  assert.ok(townPoint("Andhra Pradesh", "NTR", "Vijayawada (F&V)"));
  assert.ok(townPoint("Andhra Pradesh", "NTR", "Vijayawada (F&V) APMC"));
  assert.ok(townPoint("Keralam", "Idukki", "Munnar Market"));
  assert.ok(townPoint("Andhra Pradesh", "Alluri Sitharama Raju", "Rampachodvaram APMC"));
  assert.equal(townPoint("Telangana", "Suryapet", "Tirumalagiri APMC"), undefined);
  assert.equal(townPoint("Telangana", "Warangal", "Unknown market XYZ"), undefined);
});

test("national feed paginates without district or state filters and caches results", async () => {
  const previous = globalThis.fetch;
  const offsets = [];
  try {
    globalThis.fetch = async url => {
      assert.equal(url.searchParams.get("api-key"), "nearby-test");
      assert.equal(url.searchParams.has("filters[state]"), false);
      assert.equal(url.searchParams.has("filters[district]"), false);
      const offset = Number(url.searchParams.get("offset"));
      offsets.push(offset);
      return { ok: true, json: async () => ({ total: 1001, records: Array.from({ length: offset ? 1 : 1000 }, () => ({ market: "Vijayawada" })) }) };
    };
    const result = await nationalReports("nearby-test");
    assert.equal(result.records.length, 1001);
    assert.equal(result.truncated, false);
    await nationalReports("nearby-test");
    assert.deepEqual(offsets, [0, 1000]);
  } finally { globalThis.fetch = previous; }
});
