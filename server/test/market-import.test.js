import assert from "node:assert/strict";
import { test } from "node:test";
import { feedPages, importWindow, indiaDate, normalizeReport, reportDate, runMarketImport, savePage } from "../dist/market/import.js";
import { scheduledSlot } from "../dist/market/scheduler.js";
const row = { state: "Telangana", district: "Khammam", market: "Khammam", commodity: "Cotton", variety: "Other", grade: "FAQ", arrival_date: "13/10/2026", min_price: "", max_price: "8500", modal_price: "8000" };
test("import dates and both scheduler slots use India time across UTC midnight", () => {
  assert.equal(indiaDate(new Date("2026-10-12T21:30:00Z")), "2026-10-13");
  assert.equal(scheduledSlot(new Date("2026-10-12T21:30:00Z")), "2026-10-13:3");
  assert.equal(scheduledSlot(new Date("2026-10-13T09:30:00Z")), "2026-10-13:15");
  assert.equal(scheduledSlot(new Date("2026-10-13T10:30:00Z")), null);
  assert.deepEqual(importWindow(true, "2026-10-13"), { from: "2026-06-15", to: "2026-10-13" });
  assert.deepEqual(importWindow(false, "2026-10-13"), { from: "2026-10-03", to: "2026-10-13" });
});
test("validates dates, labels and missing prices before any write", () => {
  assert.equal(normalizeReport(row).min, null);
  assert.equal(normalizeReport({ ...row, min_price: "  " }).min, null);
  assert.equal(normalizeReport(row).modal, 8000);
  assert.throws(() => reportDate("31/02/2026"));
  assert.throws(() => normalizeReport({ ...row, state: "" }));
  assert.throws(() => normalizeReport({ ...row, modal_price: -1 }));
});
test("provider pagination reads every page and fails on incomplete snapshots", async () => {
  let calls = 0;
  const fetcher = async (url) => {
    assert.equal(url.searchParams.get("offset"), String(calls)); calls++;
    return { ok: true, json: async () => ({ total: 22, records: [row] }) };
  };
  const rows = [];
  for await (const page of feedPages("test", fetcher)) rows.push(...page);
  assert.equal(rows.length, 22); assert.equal(calls, 22);
  await assert.rejects(async () => { for await (const page of feedPages("test", async () => ({ ok: true, json: async () => ({ total: 1, records: [] }) }))) void page; }, /incomplete page/);
});
function memoryConnection() {
  const dimensions = new Map(), prices = new Map();
  let nextId = 1, writes = 0;
  return {
    prices, get writes() { return writes; },
    execute: async (sql, values) => {
      if (sql.startsWith("SELECT id FROM market_")) {
        const table = sql.match(/FROM (\w+)/)[1];
        const id = dimensions.get(JSON.stringify([table, values]));
        return [id ? [{ id }] : []];
      }
      if (sql.startsWith("INSERT INTO market_") && !sql.startsWith("INSERT INTO market_prices")) {
        const table = sql.match(/INTO (\w+)/)[1];
        const lookup = table === "market_mandis" ? values.slice(0, 2) : table === "market_commodities" ? values.slice(0, 1) : values;
        const id = nextId++; dimensions.set(JSON.stringify([table, lookup]), id);
        return [{ insertId: id }];
      }
      if (sql.startsWith("SELECT mandi_id")) {
        const result = [];
        for (let i = 0; i < values.length; i += 4) {
          const key = JSON.stringify(values.slice(i, i + 4)), old = prices.get(key);
          if (old) result.push({ mandi_id: values[i], variety_id: values[i + 1], grade_id: values[i + 2], date: values[i + 3], min_price: old[0], max_price: old[1], modal_price: old[2] });
        }
        return [result];
      }
      assert.match(sql, /^INSERT INTO market_prices/); writes++;
      for (let i = 0; i < values.length; i += 7) prices.set(JSON.stringify(values.slice(i, i + 4)), values.slice(i + 4, i + 7));
      return [{}];
    },
  };
}
test("duplicate runs do no price writes; corrections update, grades and dates stay separate", async () => {
  const db = memoryConnection();
  assert.deepEqual(await savePage(db, [normalizeReport(row), normalizeReport(row)]), { inserted: 1, updated: 0, unchanged: 0 });
  assert.deepEqual(await savePage(db, [normalizeReport(row)]), { inserted: 0, updated: 0, unchanged: 1 });
  assert.equal(db.writes, 1);
  assert.deepEqual(await savePage(db, [normalizeReport({ ...row, modal_price: 8100 })]), { inserted: 0, updated: 1, unchanged: 0 });
  assert.deepEqual(await savePage(db, [normalizeReport({ ...row, grade: "A" }), normalizeReport({ ...row, arrival_date: "12/10/2026" })]), { inserted: 2, updated: 0, unchanged: 0 });
  assert.equal(db.prices.size, 3);
});
test("overlapping imports skip work and always release their connection", async () => {
  const previous = process.env.DATA_GOV_IN_API_KEY; process.env.DATA_GOV_IN_API_KEY = "test";
  let released = false;
  try {
    const result = await runMarketImport({ getConnection: async () => ({ execute: async () => [[{ acquired: 0 }]], release: () => { released = true; } }) });
    assert.equal(result.status, "already_running"); assert.equal(released, true);
  } finally { if (previous === undefined) delete process.env.DATA_GOV_IN_API_KEY; else process.env.DATA_GOV_IN_API_KEY = previous; }
});

test("a provider failure retains committed pages, records failure and releases the import lock", async () => {
  const previous = process.env.DATA_GOV_IN_API_KEY; process.env.DATA_GOV_IN_API_KEY = "test";
  const saved = memoryConnection();
  const statuses = [], sqlCalls = [];
  let released = false, commits = 0;
  const connection = {
    execute: async (sql, values = []) => {
      sqlCalls.push(sql);
      if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }]];
      if (sql.includes("RELEASE_LOCK")) return [[{ released: 1 }]];
      if (sql.startsWith("SELECT id,") || sql.includes("WHERE status='success'")) return [[]];
      if (sql.startsWith("INSERT INTO market_import_runs")) return [{ insertId: 1 }];
      if (sql.startsWith("UPDATE market_import_runs")) { statuses.push(sql); return [{}]; }
      return saved.execute(sql, values);
    },
    beginTransaction: async () => {}, commit: async () => { commits++; }, rollback: async () => {},
    release: () => { released = true; },
  };
  const signal = AbortSignal.abort();
  try {
    let calls = 0;
    await assert.rejects(runMarketImport({ getConnection: async () => connection }, {
      now: new Date("2026-10-13T00:00:00Z"),
      fetcher: async () => {
        if (++calls === 1) return { ok: true, json: async () => ({ total: 2, records: [row] }) };
        return { ok: true, json: async () => ({ total: 2, records: [{ ...row, arrival_date: "invalid" }] }) };
      },
    }), /Market import failed/);
    assert.equal(commits, 1); assert.equal(saved.prices.size, 1);
    assert.ok(statuses.some((sql) => sql.includes("error_message=?")));
    assert.ok(sqlCalls.some((sql) => sql.includes("RELEASE_LOCK")));
    assert.equal(released, true);
    // Cancellation stops work before any additional page can be committed.
    await assert.rejects(runMarketImport({ getConnection: async () => connection }, {
      signal, fetcher: async () => ({ ok: true, json: async () => ({ total: 1, records: [row] }) }),
    }), /Market import failed/);
    assert.equal(commits, 1);
  } finally { if (previous === undefined) delete process.env.DATA_GOV_IN_API_KEY; else process.env.DATA_GOV_IN_API_KEY = previous; }
});
