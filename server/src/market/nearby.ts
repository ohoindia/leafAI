import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

export type Point = { latitude: number; longitude: number };
type Place = [string, string, string[], number, number, number];
const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const stateAliases: Record<string, string> = {
  keralam: "kerala", orissa: "odisha", uttaranchal: "uttarakhand", pondicherry: "puducherry",
  chattisgarh: "chhattisgarh", nctofdelhi: "delhi", andamanandnicobarislands: "andamanandnicobar",
  dadraandnagarhaveli: "dadraandnagarhavelianddamananddiu", damananddiu: "dadraandnagarhavelianddamananddiu",
};
export const stateName = (value: string) => {
  const name = normalize(value);
  return stateAliases[name] || name;
};
const districtAliases: Record<string, string> = {
  rangareddi: "rangareddy",
  hanumakonda: "hanamkonda",
  jagitial: "jagtial",
  jangoan: "jangaon",
  jayashankarbhupalapally: "bhupalapally",
  kumurambheemasifabad: "asifabad",
  rajannasircilla: "rajannasiricilla",
  mahaboobnagar: "mahbubnagar",
  mahabubnagar: "mahbubnagar",
  vizianagaram: "vijayanagaram",
};
export const districtName = (value: string) => {
  const name = normalize(value.replace(/ district$/i, ""));
  return districtAliases[name] || name;
};
export function locationKeys(state: string, district: string) {
  const stateKey = stateName(state), districtKey = districtName(district);
  return {
    states: [stateKey, ...Object.keys(stateAliases).filter(name => stateAliases[name] === stateKey)],
    districts: [...new Set([districtKey, normalize(district), ...Object.keys(districtAliases).filter(name => districtAliases[name] === districtKey)])],
  };
}
const indexes = new Map<string, Map<string, Place[]>>();
let bounds:
  | Record<
      string,
      { minLat: number; maxLat: number; minLon: number; maxLon: number }
    >
  | undefined;
export function possibleNearbyState(
  state: string,
  origin: Point,
  radiusKm: number,
) {
  bounds ??= JSON.parse(
    readFileSync(
      new URL("../../assets/market-places/bounds.json", import.meta.url),
      "utf8",
    ),
  );
  const b = bounds![stateName(state)];
  if (!b) return true;
  const deltaLat = radiusKm / 110;
  const deltaLon =
    radiusKm /
    (110 * Math.cos(((Math.abs(origin.latitude) + deltaLat) * Math.PI) / 180));
  return (
    b.minLat <= origin.latitude + deltaLat &&
    b.maxLat >= origin.latitude - deltaLat &&
    b.minLon <= origin.longitude + deltaLon &&
    b.maxLon >= origin.longitude - deltaLon
  );
}
function placeIndex(state: string) {
  const stateKey = stateName(state);
  if (indexes.has(stateKey)) return indexes.get(stateKey)!;
  const index = new Map<string, Place[]>();
  // Load only the queried state; the complete village registry stays compressed.
  let places: Place[];
  try {
    places = JSON.parse(
      gunzipSync(
        readFileSync(
          new URL(
            `../../assets/market-places/${stateKey}.json.gz`,
            import.meta.url,
          ),
        ),
      ).toString("utf8"),
    );
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
    indexes.set(stateKey, index);
    return index;
  }
  for (const place of places) {
    for (const name of new Set(place[2].map(normalize))) {
      const key = name;
      const list = index.get(key) || [];
      list.push(place);
      index.set(key, list);
    }
  }
  indexes.set(stateKey, index);
  return index;
}
export function distanceKm(a: Point, b: Point) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return (
    6371 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)))
  );
}
export function townPoint(
  state: string,
  district: string,
  town: string,
): Point | undefined {
  const cleaned = town
    .replace(/\b(APMC|RBZ)\b/gi, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\bmarket\s*$/i, "")
    .trim();
  // AGMARKNET's spelling omits the second 'a' in this GeoNames town name.
  const alias =
    stateName(state) === "andhrapradesh" &&
    normalize(cleaned) === "rampachodvaram"
      ? "Rampachodavaram"
      : cleaned;
  const names = [town, cleaned, alias];
  for (const name of names) {
    let places = placeIndex(state).get(normalize(name)) || [];
    const districtMatches = places.filter(
      (p) =>
        districtName(p[1]) === districtName(district) ||
        // Warangal's urban area is recorded under Hanamkonda after reorganisation.
        // https://hanumakonda.telangana.gov.in/district-profile/
        (stateName(state) === "telangana" &&
          normalize(name) === "warangal" &&
          districtName(district) === "warangal" &&
          districtName(p[1]) === "hanamkonda"),
    );
    // A same-named place in a different district is not the reported market.
    if (district && !districtMatches.length) continue;
    if (districtMatches.length) places = districtMatches;
    if (!places.length) continue;
    const point = { latitude: places[0][3], longitude: places[0][4] };
    // Reject ambiguous aliases rather than silently choosing a distant town.
    if (
      places.every(
        (p) => distanceKm(point, { latitude: p[3], longitude: p[4] }) < 5,
      )
    )
      return point;
  }
}
export function nearestTown(origin: Point) {
  bounds ??= JSON.parse(
    readFileSync(
      new URL("../../assets/market-places/bounds.json", import.meta.url),
      "utf8",
    ),
  );
  let best: { town: string; state: string; district: string; distance: number } | undefined;
  for (const state of Object.keys(bounds!)) {
    if (!possibleNearbyState(state, origin, 50)) continue;
    const seen = new Set<Place>();
    for (const list of placeIndex(state).values())
      for (const p of list) {
        if (seen.has(p) || p[5] < 10000) continue;
        seen.add(p);
        const distance = distanceKm(origin, {
          latitude: p[3],
          longitude: p[4],
        });
        if (distance <= 50 && (!best || distance < best.distance))
          best = { town: p[2][0], state: p[0], district: p[1], distance };
      }
  }
  return best;
}
export function nearbyReports(records: any[], origin: Point, radiusKm: number) {
  const locations = new Map<string, Point | undefined>();
  const unresolved = new Set<string>();
  const nearby = [];
  for (const r of records) {
    if (!possibleNearbyState(String(r.state), origin, radiusKm)) continue;
    const key = [r.state, r.district, r.market].join("|");
    if (!locations.has(key))
      locations.set(
        key,
        townPoint(String(r.state), String(r.district), String(r.market)),
      );
    const point = locations.get(key);
    if (!point) {
      unresolved.add(key);
      continue;
    }
    const distance = distanceKm(origin, point);
    if (distance <= radiusKm)
      nearby.push({ ...r, distanceKm: Math.round(distance * 10) / 10 });
  }
  nearby.sort((a, b) => a.distanceKm - b.distanceKm);
  return { records: nearby, unresolvedMarkets: unresolved.size };
}
let feed:
  | {
      key: string;
      expires: number;
      pending: Promise<{ records: any[]; truncated: boolean }>;
    }
  | undefined;
export function nationalReports(key: string) {
  if (feed?.key === key && feed.expires > Date.now()) return feed.pending;
  const pending = (async () => {
    const signal = AbortSignal.timeout(22000);
    async function page(offset: number) {
      const url = new URL(
        "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
      );
      url.search = new URLSearchParams({
        "api-key": key,
        format: "json",
        limit: "1000",
        offset: String(offset),
      }).toString();
      const response = await fetch(url, { signal });
      if (!response.ok) throw Error("Market feed unavailable");
      const data = (await response.json()) as any;
      if (!Array.isArray(data.records)) throw Error("Invalid market feed");
      return data;
    }
    const first = await page(0);
    const total = Number(first.total);
    if (!Number.isFinite(total) || total < 0)
      throw Error("Invalid report count");
    const records = [...first.records];
    const pages = Math.min(20, Math.ceil(total / 1000));
    for (let start = 1; start < pages; start += 3) {
      const results = await Promise.all(
        Array.from({ length: Math.min(3, pages - start) }, (_, i) =>
          page((start + i) * 1000),
        ),
      );
      for (const result of results) records.push(...result.records);
    }
    return { records, truncated: total > records.length };
  })();
  feed = { key, expires: Date.now() + 5 * 60 * 1000, pending };
  pending.catch(() => {
    if (feed?.pending === pending) feed = undefined;
  });
  return pending;
}
