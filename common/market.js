export const marketSource = "https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi";
export const mspSource = "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2260618&lang=2&reg=3";
export const mspSeason = "Kharif 2026-27";
export const mspPrices = [
  ["Paddy (Common)",2441],["Paddy (Grade A)",2461],
  ["Cotton (Medium staple)",8267],["Cotton (Long staple)",8667],
  ["Maize",2410],["Tur / Arhar",8450],["Moong",8780],["Urad",8200],
  ["Groundnut",7517],["Soybean (Yellow)",5708],["Jowar (Hybrid)",4023],
  ["Jowar (Maldandi)",4073],["Bajra",2900],["Ragi",5205],
  ["Sunflower seed",8343],["Sesamum",10346],["Nigerseed",10052],
];
export const mandiNote = "Local mandi prices are actual wholesale market reports, not government-fixed prices. Prices vary by mandi, variety, quality and reporting date.";
export const mspNote = "MSP is set by the Government of India for specified crops and grades. It does not vary by your location. Procurement depends on eligibility, quality and available government purchase arrangements.";
export const riceNote = "Rice is milled grain; the government MSP applies to paddy, not milled rice. Mirchi (chilli) has no central MSP under this schedule.";
export function price(value) { return value == null ? "Not reported" : `\u20b9${Number(value).toLocaleString("en-IN")} / quintal`; }
