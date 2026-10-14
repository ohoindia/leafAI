import assert from "node:assert/strict";
import { test } from "node:test";
Object.assign(process.env, {
  NODE_ENV: "test",
  DB_HOST: "localhost",
  DB_NAME: "test",
  DB_USER: "test",
  DB_PASSWORD: "test",
  OPENAI_API_KEY: "test",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  UPLOAD_ENCRYPTION_KEY: "c".repeat(64),
});
const { AuthService } = await import("../dist/auth/auth.service.js");
const { farmDetailsSchema } = await import("../dist/auth/farm-schema.js");
test("farm validation rejects malformed dates, measurements and unknown fields", () => {
  for (const farm of [
    { sowingDate: "2026-02-30" },
    { latitude: "91" },
    { soilPh: "15" },
    { area: "-1" },
    { area: "abc" },
    { soilType: "unsupported" },
    { unknown: "value" },
    { notes: "x".repeat(2001) },
  ]) {
    assert.equal(farmDetailsSchema.safeParse(farm).success, false);
  }
  assert.deepEqual(
    farmDetailsSchema.parse({
      area: "2.5",
      previousCrop: " Rice ",
      sowingDate: "2026-06-01",
    }),
    { area: "2.5", previousCrop: "Rice", sowingDate: "2026-06-01" },
  );
  assert.equal(
    farmDetailsSchema.safeParse({ area: "", sowingDate: "" }).success,
    true,
  );
});
const { saveFarm, readFarms } = await import("../dist/auth/farm-records.js");
function store() {
  const farms = [],
    crops = [];
  return {
    farms,
    crops,
    async execute(sql, args) {
      if (sql.startsWith("SELECT id FROM users")) return [[{ id: args[0] }]];
      if (sql.includes("SELECT c.*"))
        return [
          crops.filter((c) =>
            farms.some((f) => f.id === c.farm_id && f.user_id === args[0]),
          ),
        ];
      if (sql.includes("FROM FarmDetails"))
        return [farms.filter((f) => f.user_id === args[0])];
      if (sql.includes("FROM farm_crops"))
        return [crops.filter((c) => c.farm_id === args[0])];
      if (sql.startsWith("INSERT INTO FarmDetails"))
        farms.push({ id: args[0], user_id: args[1] });
      else if (sql.startsWith("INSERT INTO farm_crops"))
        crops.push({
          id: args[0],
          farm_id: args[1],
          status: sql.includes("'CURRENT'") ? "CURRENT" : "PREVIOUS",
        });
      else if (sql.startsWith("UPDATE farm_crops SET status"))
        crops.find((c) => c.id === args[0]).status = "PREVIOUS";
      else if (sql.startsWith("UPDATE")) {
        const row = (sql.includes("UPDATE FarmDetails") ? farms : crops).find(
          (r) => r.id === args.at(-1),
        );
        const columns = sql
          .match(/SET (.*) WHERE/)[1]
          .split(",")
          .map((v) => v.split("=")[0]);
        columns.forEach((column, i) => (row[column] = args[i]));
      } else assert.fail(sql);
      return [{ affectedRows: 1 }];
    },
  };
}
test("land identifiers preserve text across save, update and read", async () => {
  const db = store();
  const details = farmDetailsSchema.parse({ ppbNo: " 00123 ", syNo: "007/2-A" });
  const id = await saveFarm(db, "7", details, "new");
  assert.equal(db.farms[0].ppb_no, "00123");
  assert.equal(db.farms[0].sy_no, "007/2-A");
  assert.deepEqual((await readFarms(db, "7"))[0].details, details);
  await saveFarm(db, "7", { syNo: "007/3-B" }, id);
  assert.deepEqual((await readFarms(db, "7"))[0].details, {
    ppbNo: "00123", syNo: "007/3-B",
  });
  await saveFarm(db, "7", { ppbNo: "", syNo: "" }, id);
  assert.deepEqual((await readFarms(db, "7"))[0].details, {});
  assert.equal(farmDetailsSchema.safeParse({ ppbNo: "x".repeat(301) }).success, false);
  assert.equal(farmDetailsSchema.safeParse({ syNo: 123 }).success, false);
});

test("multiple farms are owner scoped and every new crop retains the full earlier record", async () => {
  const db = store();
  const id = await saveFarm(db, "7", {
    farmName: "North",
    presentCrop: "Rice",
    season: "2025",
    fertilizers: "Compost",
    previousCrop: "Maize",
  });
  await saveFarm(db, "7", { farmName: "South", presentCrop: "Cotton" }, "new");
  await saveFarm(
    db,
    "7",
    {
      presentCrop: "Wheat",
      season: "2026",
      fertilizers: "",
      previousCrop: "Maize",
    },
    id,
    true,
  );
  await saveFarm(db, "7", { presentCrop: "Rice", season: "2027" }, id, true);
  const farms = await readFarms(db, "7");
  assert.equal(farms.length, 2);
  assert.equal(farms[0].crops.length, 4);
  assert.equal(
    farms[0].crops.find((c) => c.details.season === "2025").details.fertilizers,
    "Compost",
  );
  assert.equal(farms[0].details.presentCrop, "Rice");
  assert.equal(farms[1].details.presentCrop, "Cotton");
  assert.deepEqual(await readFarms(db, "8"), []);
  await assert.rejects(
    saveFarm(db, "8", { farmName: "Stolen" }, id),
    /Farm not found/,
  );
});
test("editing current details does not append a season", async () => {
  const db = store();
  const id = await saveFarm(db, "7", { presentCrop: "Rice" });
  await saveFarm(db, "7", { growthStage: "Flowering" }, id);
  assert.equal(db.crops.length, 1);
  assert.equal((await readFarms(db, "7"))[0].details.growthStage, "Flowering");
});

test("adding optional previous crops appends history without changing current crop or older seasons", async () => {
  const db = store();
  const id = await saveFarm(db, "7", {
    farmName: "North",
    presentCrop: "Cotton",
    season: "2026",
  });
  await saveFarm(
    db,
    "7",
    { previousCrop: "Rice", previousSeason: "2025", previousYield: "20 bags" },
    id,
    false,
    false,
    true,
  );
  await saveFarm(
    db,
    "7",
    {
      previousCrop: "Maize",
      previousSeason: "2024",
      previousTreatment: "Neem",
    },
    id,
    false,
    false,
    true,
  );
  const farm = (await readFarms(db, "7"))[0];
  assert.equal(farm.details.presentCrop, "Cotton");
  assert.equal(farm.crops.length, 3);
  assert.equal(
    farm.crops.find((c) => c.details.previousSeason === "2025").details
      .previousYield,
    "20 bags",
  );
  assert.equal(
    farm.crops.find((c) => c.details.previousSeason === "2024").details
      .previousTreatment,
    "Neem",
  );
  await assert.rejects(
    saveFarm(
      db,
      "7",
      { previousCrop: "", previousSeason: "" },
      id,
      false,
      false,
      true,
    ),
    /at least one/,
  );
  assert.equal(db.crops.length, 3);
  await assert.rejects(
    saveFarm(db, "8", { previousCrop: "Rice" }, id, false, false, true),
    /Farm not found/,
  );
});
