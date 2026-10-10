import { Injectable, BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { z } from "zod";
import { DatabaseService } from "../common/database.service.js";
import type { ApiRequest } from "../common/api-request.js";

const currentFields = "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m";
const hourlyFields = "temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,soil_temperature_0cm,soil_temperature_6cm,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,et0_fao_evapotranspiration";
const dailyFields = "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,et0_fao_evapotranspiration";
const coordinates = z.object({ latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180) });
type Place = { label: string; latitude: number; longitude: number; source: string };
@Injectable()
export class WeatherService {
  private cache = new Map<string, { expires: number; value: any }>();
  constructor(private readonly db: DatabaseService) {}
  private async json(url: URL) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw Error();
      const data = await response.json() as any;
      if (data.error) throw Error();
      return data;
    } catch { throw new ServiceUnavailableException("Weather service is unavailable. Please try again."); }
  }
  async locations(query: unknown) {
    const name = z.string().trim().min(2).max(100).parse(query);
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({ name, count: "8", language: "en", format: "json" }).toString();
    const data = await this.json(url);
    return (data.results || []).map((r: any) => ({ label: [r.name, r.admin1, r.country].filter(Boolean).join(", "), latitude: r.latitude, longitude: r.longitude, source: "Selected place" }));
  }
  async forecast(req: ApiRequest) {
    const query = z.object({ latitude: z.string().min(1).optional(), longitude: z.string().min(1).optional(), label: z.string().trim().max(150).optional() }).parse(req.query);
    let place: Place;
    if (query.latitude !== undefined || query.longitude !== undefined) {
      if (query.latitude === undefined || query.longitude === undefined) throw new BadRequestException("Both latitude and longitude are required.");
      place = { ...coordinates.parse(query), label: query.label || "Current location", source: query.label ? "Selected location" : "Device location" };
    } else {
      const [farms] = await this.db.execute("SELECT latitude,longitude,farm_name,village,district,state FROM FarmDetails WHERE user_id=? ORDER BY created_at,id", [req.user.sub]);
      const farm = farms.find((f: any) => f.latitude != null && f.longitude != null) || farms.find((f: any) => f.village || f.district);
      if (farm?.latitude != null && farm.longitude != null) {
        place = { ...coordinates.parse(farm), label: farm.farm_name || [farm.village, farm.district].filter(Boolean).join(", ") || "Saved farm", source: "Saved farm coordinates" };
      } else {
        const [users] = await this.db.execute("SELECT user_details FROM users WHERE id=? AND is_active=1", [req.user.sub]);
        const details = typeof users[0]?.user_details === "string" ? JSON.parse(users[0].user_details) : users[0]?.user_details || {};
        const address = farm || details;
        const name = address.village || address.district;
        if (!name) throw new BadRequestException("Choose a location, use your device location, or save your farm location to see weather.");
        const matches = await this.locations(name);
        const matched = matches.find((p: Place) => address.state && p.label.toLowerCase().includes(String(address.state).toLowerCase()));
        if (!matched && matches.length !== 1) throw new BadRequestException("Select your town from the location search to get an accurate forecast.");
        place = { ...(matched || matches[0]), source: "Saved address (approximate)" };
      }
    }
    const key = `${place.latitude.toFixed(3)},${place.longitude.toFixed(3)}`;
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return { ...cached.value, location: place };
    const [settings] = await this.db.execute("SELECT ConfigKey,ConfigValue FROM ConfigSecrets WHERE ConfigKey='WEATHER_API_KEY'");
    const apiKey = settings[0]?.ConfigValue;
    const url = new URL(apiKey ? "https://customer-api.open-meteo.com/v1/forecast" : "https://api.open-meteo.com/v1/forecast");
    const params = new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), current: currentFields, hourly: hourlyFields, daily: dailyFields, forecast_days: "6", timezone: "auto", temperature_unit: "celsius", wind_speed_unit: "kmh", precipitation_unit: "mm" });
    if (apiKey) params.set("apikey", apiKey);
    url.search = params.toString();
    const raw = await this.json(url);
    if (!raw.current || !Array.isArray(raw.daily?.time) || raw.daily.time.length !== 6 || (!Array.isArray(raw.hourly?.time) || !raw.hourly.time.length)) throw new ServiceUnavailableException("Weather provider returned incomplete data. Please try again.");
    const records = (group: any) => group.time.map((time: string, index: number) => Object.fromEntries(Object.entries(group).map(([field, values]: [string, any]) => [field, field === "time" ? time : values[index] ?? null])));
    const hourly = records(raw.hourly);
    const days = records(raw.daily).map((day: any) => ({ ...day, hours: hourly.filter((hour: any) => hour.time.startsWith(day.time)) }));
    const nearest = [...hourly].reverse().find((hour: any) => hour.time <= raw.current.time) || hourly[0];
    const result = { location: place, timezone: raw.timezone, fetchedAt: new Date().toISOString(), current: raw.current, currentExtra: nearest, days, units: { current: raw.current_units, hourly: raw.hourly_units, daily: raw.daily_units }, attribution: "Open-Meteo", attributionUrl: "https://open-meteo.com/", modelNote: "Forecast and soil conditions are model estimates. Forecasts can change; soil values are not on-farm sensor readings." };
    for (const [k, entry] of this.cache) if (entry.expires <= Date.now()) this.cache.delete(k);
    if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, { expires: Date.now() + 10 * 60000, value: result });
    return result;
  }
}
