import { db } from "../dist/db.js";

try {
  for (const name of ["ppb_no", "sy_no"]) {
    const [columns] = await db.query("SHOW COLUMNS FROM FarmDetails LIKE ?", [name]);
    if (!columns.length)
      await db.query(`ALTER TABLE FarmDetails ADD COLUMN ${name} VARCHAR(300) NULL`);
    const [verified] = await db.query("SHOW COLUMNS FROM FarmDetails LIKE ?", [name]);
    if (verified.length !== 1 || verified[0].Type.toLowerCase() !== "varchar(300)" || verified[0].Null !== "YES")
      throw new Error(`Unexpected ${name} column`);
    console.log(`Verified FarmDetails.${name}.`);
  }
} catch (error) {
  console.error("Farm land identifier migration failed:", error.code || error.name);
  process.exitCode = 1;
} finally {
  await db.end();
}
