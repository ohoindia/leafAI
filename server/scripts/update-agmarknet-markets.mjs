// Public AGMARKNET metadata, verified against the official frontend and API.
// No token or captcha-protected report endpoints are used.
import fs from "node:fs";
const base = "https://api.agmarknet.gov.in/v1";
async function get(path) {
  const response = await fetch(base + path, { headers: { "User-Agent": "LeafAI-Market/1.0" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error(`AGMARKNET metadata returned ${response.status}`);
  return response.json();
}
const filters = (await get("/daily-price-arrival/filters")).data;
const commonNames = /^(Paddy\(Common\)|Cotton|Tomato|Rice|Maize|Wheat|Onion|Potato|Green Chilli|Brinjal|Bhindi\(Ladies Finger\)|Cucumbar\(Kheera\)|Cabbage|Cauliflower|Lemon|Mango|Banana|Groundnut|Turmeric|Soyabean|Bengal Gram\(Gram\)\(Whole\)|Black Gram\(Urd Beans\)\(Whole\)|Green Gram\(Moong\)\(Whole\)|Arhar\(Tur\/Red Gram\)\(Whole\)|Jowar\(Sorghum\)|Bajra\(Pearl Millet\/Cumbu\)|Ragi\(Finger Millet\)|Sunflower|Mustard|Sesamum\(Sesame,Gingelly,Til\))$/i;
const commodities = [];
for (const c of filters.cmdt_data.filter(c => commonNames.test(c.cmdt_name))) {
  const data = await get(`/list-comm/${c.cmdt_id}`);
  commodities.push({ id: c.cmdt_id, name: c.cmdt_name, marketIds: [...new Set(data.data.map(m => m.market_id))] });
  await new Promise(resolve => setTimeout(resolve, 1000));
}
const result = { updatedAt: new Date().toISOString(), source: base,
  states: filters.state_data.filter(s => s.state_id < 100000),
  districts: filters.district_data.filter(d => d.id < 100000),
  markets: filters.market_data.filter(m => m.id < 100000), commodities };
const target = new URL("../assets/agmarknet-markets.json", import.meta.url);
fs.writeFileSync(target, JSON.stringify(result));
console.log(`Saved ${commodities.length} common crop associations and ${result.markets.length} markets.`);
