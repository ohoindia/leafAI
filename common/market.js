export const marketSource =
  "https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi";
export function commodityKey(name = "") {
  const base = name.toLowerCase().replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
  const aliases = {
    bajira: "bajra", "pearl millet": "bajra", cumbu: "bajra",
    sorghum: "jowar", "finger millet": "ragi",
    corn: "maize", "soyabean": "soybean", "soya bean": "soybean",
    "green gram": "moong", "black gram": "urad", "urd": "urad",
    "bengal gram": "gram", chickpea: "gram", chickpeas: "gram",
    sesame: "sesamum", "sesame seed": "sesamum", "sesamum seed": "sesamum",
    "paddy common": "paddy", "paddy grade a": "paddy",
    "arhar": "tur", "tur arhar": "tur",
    "bhindi": "okra", "ladies finger": "okra",
    "cucumbar": "cucumber", kheera: "cucumber", eggplant: "brinjal",
    "sunflower seed": "sunflower", "niger seed": "nigerseed",
  };
  return aliases[base] || base;
}
export const mspSource =
  "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2260618&lang=2&reg=3";
export const mspSeason = "Kharif 2026-27";
export const mspPrices = [
  ["Paddy (Common)", 2441],
  ["Paddy (Grade A)", 2461],
  ["Cotton (Medium staple)", 8267],
  ["Cotton (Long staple)", 8667],
  ["Maize", 2410],
  ["Tur / Arhar", 8450],
  ["Moong", 8780],
  ["Urad", 8200],
  ["Groundnut", 7517],
  ["Soybean (Yellow)", 5708],
  ["Jowar (Hybrid)", 4023],
  ["Jowar (Maldandi)", 4073],
  ["Bajra", 2900],
  ["Ragi", 5205],
  ["Sunflower seed", 8343],
  ["Sesamum", 10346],
  ["Nigerseed", 10052],
];
export const mandiNote =
  "Local mandi prices are actual wholesale market reports, not government-fixed prices. Prices vary by mandi, variety, quality and reporting date.";
export const mspNote =
  "MSP is set by the Government of India for specified crops and grades. It does not vary by your location. Procurement depends on eligibility, quality and available government purchase arrangements.";
export const riceNote =
  "Rice is milled grain; the government MSP applies to paddy, not milled rice. Mirchi (chilli) has no central MSP under this schedule.";
export function price(value, t = (text) => text) {
  return value == null
    ? t("Not reported")
    : `\u20b9${Number(value).toLocaleString("en-IN")} / ${t("quintal")}`;
}

export function groupMarkets(records) {
  const groups = new Map();
  for (const record of records) {
    const key = JSON.stringify([
      record.state || "",
      record.district || "",
      record.market,
    ]);
    if (!groups.has(key))
      groups.set(key, {
        key,
        market: record.market,
        state: record.state || "",
        district: record.district || "",
        distanceKm: record.distanceKm,
        records: [],
      });
    groups.get(key).records.push(record);
  }
  return [...groups.values()].sort(
    (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
  );
}
export function groupCommodityPrices(records) {
  const groups = new Map();
  for (const record of records) {
    if (!groups.has(record.commodity))
      groups.set(record.commodity, {
        commodity: record.commodity,
        records: [],
      });
    groups.get(record.commodity).records.push(record);
  }
  return [...groups.values()].sort((a, b) =>
    a.commodity.localeCompare(b.commodity),
  );
}
export function marketDate(value) {
  if (!value) return "";
  const iso = /^\d{2}\/\d{2}\/\d{4}$/.test(value)
    ? value.split("/").reverse().join("-")
    : value;
  const date = new Date(iso + "T00:00:00Z");
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}
export function priceChange(value, t = (text) => text) {
  if (value == null) return t("No previous report");
  if (value === 0) return t("No change");
  return `${value > 0 ? "↑" : "↓"} ${price(Math.abs(value), t).split(" / ")[0]}`;
}
export function mergeMarketRecords(previous, incoming) {
  const rows = new Map();
  for (const row of [...previous, ...incoming]) {
    const key = JSON.stringify([
      row.state,
      row.district,
      row.market,
      row.commodity,
      row.variety,
    ]);
    const old = rows.get(key);
    const iso = (value) =>
      /^\d{2}\/\d{2}\/\d{4}$/.test(value)
        ? value.split("/").reverse().join("-")
        : value;
    if (!old || iso(row.date) >= iso(old.date)) rows.set(key, row);
  }
  return [...rows.values()].sort(
    (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
  );
}
