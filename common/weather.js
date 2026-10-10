import { translate } from './locale.js';

export function condition(code) {
  const codes = { 0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle", 56: "Freezing drizzle", 57: "Heavy freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Heavy freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Light rain showers", 81: "Rain showers", 82: "Violent rain showers", 85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail" };
  return codes[code] || "Conditions unavailable";
}
const fields = {
 temperature_2m: "Temperature", relative_humidity_2m: "Humidity", apparent_temperature: "Feels like", precipitation: "Precipitation", rain: "Rain", showers: "Showers", snowfall: "Snowfall", cloud_cover: "Cloud cover", pressure_msl: "Sea-level pressure", surface_pressure: "Surface pressure", wind_speed_10m: "Wind speed", wind_direction_10m: "Wind direction", wind_gusts_10m: "Wind gusts", dew_point_2m: "Dew point", precipitation_probability: "Rain chance", visibility: "Visibility", uv_index: "UV index", soil_temperature_0cm: "Soil temperature (surface)", soil_temperature_6cm: "Soil temperature (6 cm)", soil_moisture_0_to_1cm: "Soil moisture (0-1 cm)", soil_moisture_3_to_9cm: "Soil moisture (3-9 cm)", et0_fao_evapotranspiration: "Reference evapotranspiration", temperature_2m_max: "High temperature", temperature_2m_min: "Low temperature", apparent_temperature_max: "Feels-like high", apparent_temperature_min: "Feels-like low", sunrise: "Sunrise", sunset: "Sunset", daylight_duration: "Daylight", sunshine_duration: "Sunshine", uv_index_max: "Peak UV index", precipitation_sum: "Total precipitation", rain_sum: "Rain total", showers_sum: "Showers total", snowfall_sum: "Snowfall total", precipitation_hours: "Precipitation duration", precipitation_probability_max: "Maximum rain chance", wind_speed_10m_max: "Maximum wind", wind_gusts_10m_max: "Maximum gusts", wind_direction_10m_dominant: "Dominant wind", is_day: "Day / night"
};
export function formatValue(value, unit = "", field = "") {
 if (value === null || value === undefined || value === "") return "Unavailable";
 if (field === "sunrise" || field === "sunset") return String(value).slice(11,16);
 if (field === "is_day") return value === 1 ? "Day" : "Night";
 if (unit === "s") return `${(Number(value)/3600).toFixed(1)} h`;
 if (field === "visibility") return `${(Number(value)/1000).toFixed(1)} km`;
 if (field.includes("direction")) return `${["N","NE","E","SE","S","SW","W","NW"][Math.round(Number(value)/45)%8]} (${Math.round(Number(value))}°)`;
 const digits = field.includes("soil_moisture") ? 3 : 1;
 return `${Number(value).toLocaleString("en-IN", { maximumFractionDigits: digits })}${unit ? ` ${unit}` : ""}`;
}
export function weatherMetrics(record, units) {
 return Object.entries(fields).filter(([key]) => key in record).map(([key, label]) => ({ key, label, value: formatValue(record[key], units[key], key) }));
}
export function forecastSummary(days, language = "en") {
 const next = days.slice(1, 6);
 const message = (template, value) => translate(language, template).replace('{value}', value);
 const available = key => next.map(day => day[key]).filter(value => typeof value === "number");
 const rain = available("precipitation_sum"); const temp = available("temperature_2m_max"); const gusts = available("wind_gusts_10m_max");
 const summary = [];
 if (rain.length) summary.push(message('Next five days: about {value} mm total precipitation forecast.', rain.reduce((a,b)=>a+b,0).toFixed(1)));
 if (temp.length) summary.push(message('Highest daytime temperature: {value} °C.', Math.max(...temp).toFixed(1)));
 if (gusts.length) summary.push(message('Strongest forecast gusts: {value} km/h.', Math.max(...gusts).toFixed(1)));
 const storm = next.find(day => Number(day.weather_code) >= 95);
 if (storm) summary.push(message('Thunderstorms are possible on {value}.', dayLabel(storm.time, language)));
 return summary;
}
export function weatherQuery(place) {
 return place ? `?${new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), ...(place.label ? {label:place.label} : {}) })}` : "";
}
export function dayLabel(date, language = "en") {
 return new Date(`${date}T12:00:00Z`).toLocaleDateString({ en:"en-IN",te:"te-IN",hi:"hi-IN" }[language] || "en-IN", { weekday:"short", day:"numeric", month:"short", timeZone:"UTC" });
}
