import crypto from "node:crypto";
import { BadRequestException } from "@nestjs/common";
export const farmColumns = {
  farmName: "farm_name",
  ppbNo: "ppb_no",
  syNo: "sy_no",
  phone: "phone",
  village: "village",
  district: "district",
  state: "state",
  country: "country",
  postalCode: "postal_code",
  latitude: "latitude",
  longitude: "longitude",
  area: "area",
  areaUnit: "area_unit",
  ownership: "ownership",
  soilType: "soil_type",
  soilPh: "soil_ph",
  soilTestDate: "soil_test_date",
  waterSource: "water_source",
  irrigation: "irrigation",
  drainage: "drainage",
  farmingMethod: "farming_method",
  otherCrops: "other_crops",
  weather: "weather",
  notes: "notes",
};
export const cropColumns = {
  presentCrop: "present_crop",
  presentVariety: "present_variety",
  season: "season",
  sowingDate: "sowing_date",
  harvestDate: "harvest_date",
  cropArea: "crop_area",
  growthStage: "growth_stage",
  seedSource: "seed_source",
  spacing: "spacing",
  irrigationSchedule: "irrigation_schedule",
  fertilizers: "fertilizers",
  pesticides: "pesticides",
  currentIssues: "current_issues",
};
export const previousColumns = {
  previousCrop: "present_crop",
  previousVariety: "present_variety",
  previousSeason: "season",
  previousHarvestDate: "harvest_date",
  previousYield: "yield_amount",
  previousIssues: "current_issues",
  previousTreatment: "treatment",
  residueManagement: "residue_management",
};
type Query = { execute: (sql: string, values?: any[]) => Promise<any> };
function values(row: any, map: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(map)
      .filter(([, column]) => row[column] != null)
      .map(([key, column]) => [
        key,
        row[column] instanceof Date
          ? row[column].toISOString().slice(0, 10)
          : String(row[column]),
      ]),
  );
}
export async function readFarms(db: Query, userId: string) {
  const [farms] = await db.execute(
    "SELECT * FROM FarmDetails WHERE user_id=? ORDER BY created_at,id",
    [userId],
  );
  const [crops] = await db.execute(
    "SELECT c.* FROM farm_crops c JOIN FarmDetails f ON f.id=c.farm_id WHERE f.user_id=? ORDER BY c.updated_at,c.created_at,c.id",
    [userId],
  );
  return farms.map((farm: any) => {
    const history = crops.filter((c: any) => c.farm_id === farm.id);
    const current = history.find((c: any) => c.status === "CURRENT");
    const previous = history.filter((c: any) => c.status === "PREVIOUS");
    return {
      id: farm.id,
      details: {
        ...values(farm, farmColumns),
        ...values(current || {}, cropColumns),
        ...values(previous.at(-1) || {}, previousColumns),
      },
      crops: history.map((c: any) => ({
        id: c.id,
        status: c.status,
        details: { ...values(c, cropColumns), ...values(c, previousColumns) },
      })),
    };
  });
}
async function write(
  db: Query,
  table: string,
  id: string,
  details: any,
  map: Record<string, string>,
) {
  const entries = Object.entries(map).filter(
    ([key]) => details[key] !== undefined,
  );
  if (entries.length)
    await db.execute(
      `UPDATE ${table} SET ${entries.map(([, column]) => `${column}=?`).join(",")} WHERE id=?`,
      [...entries.map(([key]) => details[key] || null), id],
    );
}
export async function saveFarm(
  db: Query,
  userId: string,
  details: any,
  farmId?: string,
  newCrop = false,
  includeInactive = false,
  addPreviousCrop = false,
) {
  if (
    addPreviousCrop &&
    !Object.keys(previousColumns).some((k) => details[k]?.trim())
  )
    throw new BadRequestException("Enter at least one previous crop detail");
  // Lock the owner to serialize farm creation and seasonal changes.
  const [owners] = await db.execute(
    `SELECT id FROM users WHERE id=? ${includeInactive ? "" : "AND is_active=1"} FOR UPDATE`,
    [userId],
  );
  if (!owners.length) throw new BadRequestException("User unavailable");
  const [farms] = await db.execute(
    "SELECT id FROM FarmDetails WHERE user_id=? ORDER BY created_at,id FOR UPDATE",
    [userId],
  );
  const id =
    farmId === "new"
      ? crypto.randomUUID()
      : farmId || farms[0]?.id || crypto.randomUUID();
  if (farmId && farmId !== "new" && !farms.some((f: any) => f.id === id))
    throw new BadRequestException("Farm not found");
  if (!farms.some((f: any) => f.id === id))
    await db.execute("INSERT INTO FarmDetails(id,user_id) VALUES(?,?)", [
      id,
      userId,
    ]);
  if (addPreviousCrop) {
    const cropId = crypto.randomUUID();
    await db.execute(
      "INSERT INTO farm_crops(id,farm_id,status) VALUES(?,?,'PREVIOUS')",
      [cropId, id],
    );
    await write(db, "farm_crops", cropId, details, previousColumns);
    return id;
  }
  await write(db, "FarmDetails", id, details, farmColumns);
  const [crops] = await db.execute(
    "SELECT * FROM farm_crops WHERE farm_id=? ORDER BY updated_at,created_at,id FOR UPDATE",
    [id],
  );
  let current = crops.find((c: any) => c.status === "CURRENT");
  if (newCrop && current) {
    await db.execute("UPDATE farm_crops SET status='PREVIOUS' WHERE id=?", [
      current.id,
    ]);
    current = undefined;
  }
  if (Object.keys(cropColumns).some((k) => details[k] !== undefined)) {
    if (!current) {
      current = { id: crypto.randomUUID() };
      await db.execute(
        "INSERT INTO farm_crops(id,farm_id,status) VALUES(?,?,'CURRENT')",
        [current.id, id],
      );
    }
    await write(db, "farm_crops", current.id, details, cropColumns);
  }
  // New-season saves preserve the just-archived record instead of replacing it with the legacy previous form.
  if (
    !newCrop &&
    Object.keys(previousColumns).some((k) => details[k] !== undefined)
  ) {
    let previous = crops.filter((c: any) => c.status === "PREVIOUS").at(-1);
    if (!previous && Object.keys(previousColumns).some((k) => details[k])) {
      previous = { id: crypto.randomUUID() };
      await db.execute(
        "INSERT INTO farm_crops(id,farm_id,status) VALUES(?,?,'PREVIOUS')",
        [previous.id, id],
      );
    }
    if (previous)
      await write(db, "farm_crops", previous.id, details, previousColumns);
  }
  return id;
}
