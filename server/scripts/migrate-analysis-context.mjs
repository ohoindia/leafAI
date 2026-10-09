import { db } from "../dist/db.js";

try {
  const [columns] = await db.query("SHOW COLUMNS FROM leaf_analyses");
  for (const [name, definition] of [
    ["provided_plant_name", "VARCHAR(150) NULL"],
    ["plant_location", "VARCHAR(255) NULL"],
  ]) {
    if (!columns.some((column) => column.Field === name)) {
      await db.query(
        `ALTER TABLE leaf_analyses ADD COLUMN ${name} ${definition}`,
      );
      console.log(`Added ${name}`);
    } else console.log(`${name} already exists`);
  }
  console.log("Analysis context migration complete.");
} catch (error) {
  console.error("Migration failed:", error.code || error.name);
  process.exitCode = 1;
} finally {
  await db.end();
}
