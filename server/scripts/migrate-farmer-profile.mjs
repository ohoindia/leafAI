import { db } from "../dist/db.js";

try {
  const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'farm_details'");
  if (!columns.length) {
    await db.query("ALTER TABLE users ADD COLUMN farm_details JSON NULL");
    console.log("Added users.farm_details.");
  } else {
    console.log("users.farm_details already exists.");
  }
  const [verified] = await db.query("SHOW COLUMNS FROM users LIKE 'farm_details'");
  if (verified.length !== 1 || verified[0].Type.toLowerCase() !== "json" || verified[0].Null !== "YES") {
    throw new Error("Unexpected farm_details column definition");
  }
  console.log("Verified users.farm_details: JSON, nullable. Farmer profile migration complete.");
} catch (error) {
  console.error("Migration failed:", error.code || error.name);
  process.exitCode = 1;
} finally {
  await db.end();
}
