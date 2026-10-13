import assert from "node:assert/strict";
import { test } from "node:test";
import {
  groupMarkets,
  groupCommodityPrices,
  mergeMarketRecords,
  priceChange,
  marketDate,
  marketSyncTime,
} from "../../common/market.js";

test("mandi browsing keeps equally named markets in different states separate and orders nearby markets first", () => {
  const records = [
    {
      state: "Telangana",
      district: "A",
      market: "Main market",
      commodity: "Rice",
      distanceKm: 90,
    },
    {
      state: "Andhra Pradesh",
      district: "B",
      market: "Main market",
      commodity: "Cotton",
      distanceKm: 20,
    },
    {
      state: "Andhra Pradesh",
      district: "B",
      market: "Main market",
      commodity: "Tomato",
      distanceKm: 20,
    },
  ];
  const groups = groupMarkets(records);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].state, "Andhra Pradesh");
  assert.deepEqual(
    groups[0].records.map((r) => r.commodity),
    ["Cotton", "Tomato"],
  );
  assert.equal(groups[1].state, "Telangana");
  assert.notEqual(groups[0].key, groups[1].key);
});

test("stored grades remain separate across pages and sync times use India time", () => {
  const base = { state: "Telangana", district: "Khammam", market: "Khammam", commodity: "Cotton", variety: "Other", date: "2026-10-13" };
  const records = mergeMarketRecords([{ ...base, grade: "FAQ", modal: 8000 }], [{ ...base, grade: "A", modal: 8500 }]);
  assert.equal(records.length, 2);
  assert.match(marketSyncTime("2026-10-12T21:30:00Z"), /13 Oct 2026/);
  assert.match(marketSyncTime("2026-10-12T21:30:00Z"), /3:00/);
  assert.equal(marketSyncTime("invalid"), "");
});
test("crop-first results keep all mandi rows and preserve the latest report across pages", () => {
  const base = {
    state: "Telangana",
    district: "Warangal",
    market: "Warangal",
    commodity: "Cotton",
    variety: "Other",
    distanceKm: 20,
  };
  const records = mergeMarketRecords(
    [{ ...base, date: "13/10/2026", modal: 8000 }],
    [{ ...base, date: "2026-10-09", modal: 7900 }],
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].modal, 8000);
  const groups = groupCommodityPrices([
    ...records,
    { ...base, market: "Khammam", date: "2026-10-08", modal: 7800 },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].records.length, 2);
  assert.equal(priceChange(-300), "↓ ₹300");
  assert.equal(priceChange(null), "No previous report");
  assert.match(marketDate("2026-10-09"), /9 October 2026/);
});
