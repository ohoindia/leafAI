import { db } from "../dist/db.js";
try {
  for (const name of ["user_details", "profile_photo"]) {
    const [columns] = await db.query("SHOW COLUMNS FROM users LIKE ?", [name]);
    if (!columns.length) await db.query(`ALTER TABLE users ADD COLUMN ${name} JSON NULL`);
    const [verified] = await db.query("SHOW COLUMNS FROM users LIKE ?", [name]);
    if (verified.length !== 1 || verified[0].Type.toLowerCase() !== "json") throw new Error(`Unexpected ${name} column`);
    console.log(`Verified users.${name}.`);
  }
} catch (error) { console.error("Migration failed:", error.code || error.name); process.exitCode = 1; }
finally { await db.end(); }
