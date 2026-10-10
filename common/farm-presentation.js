export const farmPresentation = {
  "Farm details": { description: "Your farm identity, area and land ownership.", basic: ["farmName", "phone", "area", "areaUnit", "ownership"], extra: "", empty: "Start with your farm name, area and ownership." },
  "Address": { description: "Where your farm is located.", basic: ["village", "district", "state", "country", "postalCode"], extra: "GPS coordinates", empty: "Add your village, district and state to locate your farm." },
  "Soil": { description: "Soil characteristics and your latest test.", basic: ["soilType", "soilPh", "soilTestDate"], extra: "", empty: "Record your soil type and pH, if known." },
  "Water": { description: "Water availability, irrigation and drainage.", basic: ["waterSource", "irrigation", "drainage"], extra: "", empty: "Add your water source and how you irrigate your farm." },
  "Present crop": { description: "What you are growing this season.", basic: ["presentCrop", "presentVariety", "season", "sowingDate", "harvestDate", "cropArea"], extra: "Crop care and current issues", empty: "Add your crop and planting dates to keep a seasonal record." },
  "Previous crop": { description: "A record of your last season and its results.", basic: ["previousCrop", "previousVariety", "previousSeason", "previousHarvestDate", "previousYield"], extra: "Issues, treatments and residues", empty: "Record your last crop and yield for future reference." },
  "Additional details": { description: "Your farming practices and observations.", basic: ["farmingMethod", "otherCrops"], extra: "Weather and notes", empty: "Add farming practices or observations you want to remember." },
};
export const farmPlaceholders = {
  farmName: "e.g. North field", waterSource: "e.g. Borewell, canal or rainwater", irrigation: "e.g. Drip, sprinkler or flood irrigation", drainage: "e.g. Well drained or waterlogging after rain", village: "e.g. Your village or town", area: "e.g. 2.5", cropArea: "e.g. 1.5", presentCrop: "e.g. Rice", previousCrop: "e.g. Cotton", presentVariety: "e.g. Variety or hybrid name", previousVariety: "e.g. Variety or hybrid name", season: "e.g. Kharif 2026", previousSeason: "e.g. Rabi 2025-26", previousYield: "e.g. 20 quintals per acre", soilPh: "e.g. 6.5", spacing: "e.g. 30 x 15 cm", fertilizers: "Product, quantity, unit and application date", pesticides: "Product, dose and application date", currentIssues: "Symptoms, when they started and affected area", irrigationSchedule: "e.g. Every 7 days", notes: "Any other information about your farm",
};
export function farmDisplayValue(field, details) {
  const value = details[field.key] || "";
  if (field.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + "T00:00:00Z");
    if (Number.isFinite(date.getTime())) return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }
  if (["area", "cropArea"].includes(field.key) && details.areaUnit) return `${value} ${details.areaUnit}`;
  return value;
}
