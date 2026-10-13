import { readFile } from "node:fs/promises";
import { db } from "../dist/db.js";
try {
  const sql = await readFile(new URL("../../database/migrations/010_market_prices.sql", import.meta.url), "utf8");
  for (const statement of sql.split(";").filter((s) => s.trim())) await db.query(statement);
  console.log("Normalized market price tables are ready.");
} catch {
  console.error("Market table migration failed. Check database connectivity and schema permissions.");
  process.exitCode = 1;
} finally { await db.end(); }
