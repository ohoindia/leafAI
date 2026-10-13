// Keep feed aliases aligned with common/market.js. The server is packaged
// independently, so its runtime cannot import files outside server/.
export function commodityKey(name = "") {
  const base = name.toLowerCase().replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
  const aliases: Record<string, string> = {
    bajira: "bajra", "pearl millet": "bajra", cumbu: "bajra",
    sorghum: "jowar", "finger millet": "ragi",
    corn: "maize", soyabean: "soybean", "soya bean": "soybean",
    "green gram": "moong", "black gram": "urad", urd: "urad",
    "bengal gram": "gram", chickpea: "gram", chickpeas: "gram",
    sesame: "sesamum", "sesame seed": "sesamum", "sesamum seed": "sesamum",
    "paddy common": "paddy", "paddy grade a": "paddy",
    arhar: "tur", "tur arhar": "tur",
    bhindi: "okra", "ladies finger": "okra",
    cucumbar: "cucumber", kheera: "cucumber", eggplant: "brinjal",
    "sunflower seed": "sunflower", "niger seed": "nigerseed",
  };
  return aliases[base] || base;
}
