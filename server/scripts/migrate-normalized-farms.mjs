import { readFile } from "node:fs/promises";
import { db } from "../dist/db.js";
import { saveFarm, readFarms } from "../dist/auth/farm-records.js";
const numeric = new Set(["latitude", "longitude", "area", "soilPh", "cropArea"]);
const differs = (details, migrated) => Object.entries(details).some(([key,value]) => value && (numeric.has(key) ? Number(migrated?.[key]) !== Number(value) : migrated?.[key] !== String(value)));
try {
  const sql = await readFile(new URL("../../database/migrations/004_normalized_farms.sql", import.meta.url), "utf8");
  for (const statement of sql.split(";").filter(s => s.trim())) await db.query(statement);
  const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'farm_details'");
  if (columns.length) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.query("SELECT id,farm_details FROM users WHERE farm_details IS NOT NULL FOR UPDATE");
      for (const user of users) {
        const details = typeof user.farm_details === "string" ? JSON.parse(user.farm_details) : user.farm_details;
        if (!Object.keys(details).length) continue;
        const existing = await readFarms(connection, String(user.id));
        if (existing.length) {
          if (differs(details, existing[0].details)) throw new Error(`Existing farm differs for user ${user.id}; resolve before retrying migration`);
        } else await saveFarm(connection, String(user.id), details, undefined, false, true);
        const migrated = await readFarms(connection, String(user.id));
        if (differs(details, migrated[0]?.details)) throw new Error(`Backfill verification failed for user ${user.id}`);
      }
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
    await db.query("ALTER TABLE users DROP COLUMN farm_details");
  }
  console.log("Normalized farms migrated and verified.");
} catch (error) { console.error(error); process.exitCode = 1; }
finally { await db.end(); }
