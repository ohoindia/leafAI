import assert from "node:assert/strict";
import { test } from "node:test";
import { weeklyRecords, latestReports } from "../dist/market/recent.js";

test("recent prices compare the previous reported day for the same variety, skipping NR", () => {
  const data = {
    columns: ["2026-10-11", "2026-10-10", "2026-10-09", "2026-10-08"].map(
      (key) => ({ key }),
    ),
    data: [
      {
        variety: "Cotton - Cotton (Unginned)",
        unitOfPrice: "Rs./Quintal",
        "2026-10-11": "NR",
        "2026-10-10": "NR",
        "2026-10-09": 7900,
        "2026-10-08": 8200,
      },
    ],
  };
  const [record] = weeklyRecords(data, "Cotton", "2026-10-13");
  assert.equal(record.modal_price, 7900);
  assert.equal(record.arrival_date, "2026-10-09");
  assert.equal(record.previousDate, "2026-10-08");
  assert.equal(record.change, -300);
  assert.equal(record.variety, "Cotton (Unginned)");
  assert.equal(record.min_price, null);
  assert.equal(record.max_price, null);
});
test("missing history and incompatible units never create fake trends or prices", () => {
  const columns = [
    { key: "2026-10-09" },
    { key: "2026-10-08" },
    { key: "2026-10-14" },
  ];
  const records = weeklyRecords(
    {
      columns,
      data: [
        {
          variety: "Cotton - Other",
          unitOfPrice: "Rs./Quintal",
          "2026-10-09": 7900,
          "2026-10-08": "",
          "2026-10-14": 9500,
        },
        { variety: "Tomato - Local", unitOfPrice: "Rs./kg", "2026-10-09": 20 },
      ],
    },
    "Cotton",
    "2026-10-13",
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].change, null);
  assert.equal(records[0].previousPrice, null);
  assert.equal(records[0].modal_price, 7900);
});
test("a newer daily report replaces a recent report without keeping an incompatible trend", () => {
  const common = {
    state: "Telangana",
    district: "Warangal",
    market: "Warangal APMC",
    commodity: "Cotton",
    variety: "Other",
    distanceKm: 10,
  };
  const records = latestReports([
    {
      ...common,
      arrival_date: "2026-10-09",
      modal_price: 7900,
      change: -300,
      priceKind: "reported",
    },
    {
      ...common,
      arrival_date: "13/10/2026",
      modal_price: 8000,
      priceKind: "modal",
    },
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].modal_price, 8000);
  assert.equal(records[0].change, undefined);
});
