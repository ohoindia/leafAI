import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NavigationIcon } from "./NavigationIcon";
import * as Location from "expo-location";
import { endpoints } from "../../common/api.js";
import {
  condition,
  dayLabel,
  formatValue,
  forecastSummary,
  weatherMetrics,
  weatherQuery,
  type WeatherData,
  type WeatherPlace,
  type WeatherPeriod,
} from "../../common/weather.js";
import { useLeafCare } from "./state";
import { useLocale } from "./locale";
import { request } from "./api";
import { Button, Card, Field, s } from "./ui";
function Metrics({
  record,
  units,
}: {
  record: Record<string, unknown>;
  units: Record<string, string>;
}) {
  const localize = useLocale();
  return (
    <View style={w.metrics}>
      {weatherMetrics(record, units).map((metric) => (
        <View key={metric.key} style={w.metric}>
          <Text style={s.muted}>{localize(metric.label)}</Text>
          <Text style={w.metricValue}>{localize(metric.value)}</Text>
        </View>
      ))}
    </View>
  );
}
function Expand({
  title,
  children,
  preview,
}: {
  title: string;
  children: React.ReactNode;
  preview?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={w.expand}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={({ pressed }) => [w.expandButton, pressed && { opacity: 0.6 }]}
      >
        <View style={w.expandContent}>
          <Text style={w.expandTitle}>{title}</Text>
          {preview}
        </View>
        <Text style={w.chevron}>{open ? "\u2212" : "+"}</Text>
      </Pressable>
      {open && <View style={w.details}>{children}</View>}
    </View>
  );
}

export function Weather({ summary = false }: { summary?: boolean }) {
  const a = useLeafCare();
  const localize = useLocale();
  const [data, setData] = useState<WeatherData>(),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [places, setPlaces] = useState<WeatherPlace[]>([]);
  const place = useRef<WeatherPlace | null>(null),
    sequence = useRef(0);
  async function load(selected = place.current) {
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    place.current = selected;
    try {
      const result = await request<WeatherData>(
        endpoints.weather + weatherQuery(selected || undefined),
        a.token,
      );
      if (id === sequence.current) setData(result);
    } catch (e) {
      if (id === sequence.current)
        setError(e instanceof Error ? e.message : "Unable to load weather.");
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    const id = ++sequence.current;
    void request<WeatherData>(endpoints.weather, a.token)
      .then((result) => {
        if (active && id === sequence.current) setData(result);
      })
      .catch((e) => {
        if (active && id === sequence.current)
          setError(e instanceof Error ? e.message : "Unable to load weather.");
      })
      .finally(() => {
        if (active && id === sequence.current) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [a.token]);
  async function search() {
    if (query.trim().length < 2) {
      setError("Enter at least two characters to search.");
      return;
    }
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    setPlaces([]);
    try {
      const results = await request<WeatherPlace[]>(
        `${endpoints.weatherLocations}?q=${encodeURIComponent(query.trim())}`,
        a.token,
      );
      if (id === sequence.current) {
        setPlaces(results);
        if (!results.length) setError("No matching places. Try a nearby town.");
      }
    } catch (e) {
      if (id === sequence.current)
        setError(e instanceof Error ? e.message : "Location search failed.");
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }
  async function locate() {
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error("Allow location access or search for your town.");
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const position = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                new Error("Location timed out. Search for your town instead."),
              ),
            15000,
          );
        }),
      ]).finally(() => clearTimeout(timeout));
      if (id === sequence.current)
        await load({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
    } catch (e) {
      if (id === sequence.current) {
        setError(
          e instanceof Error ? e.message : "Could not get your location.",
        );
        setBusy(false);
      }
    }
  }
  const extra = data
    ? Object.fromEntries(
        Object.entries(data.currentExtra).filter(([key]) =>
          [
            "soil_temperature_0cm",
            "soil_temperature_6cm",
            "soil_moisture_0_to_1cm",
            "soil_moisture_3_to_9cm",
            "uv_index",
            "visibility",
            "dew_point_2m",
            "et0_fao_evapotranspiration",
          ].includes(key),
        ),
      )
    : {};
  if (summary)
    return (
      <Card>
        <View style={{ gap: 4 }}>
          <Text style={s.heading}>{localize("Five-day outlook")}</Text>
          {data && (
            <Text style={[s.muted, { fontWeight: "600" }]}>
              {data.location.label}
            </Text>
          )}
        </View>
        {busy && (
          <Text accessibilityLiveRegion="polite" style={s.muted}>
            {localize("Loading weather...")}
          </Text>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {localize(error)}
          </Text>
        )}
        {data && (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {forecastSummary(data.days, a.lang).map((text) => (
                <View
                  key={text}
                  style={{
                    flexGrow: 1,
                    flexBasis: "45%",
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: "#f4f8fa",
                  }}
                >
                  <Text style={[s.muted, { fontSize: 13, lineHeight: 18 }]}>
                    {text}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 6 }}>
              {data.days.slice(1, 6).map((day) => (
                <View
                  key={day.time}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: "#edf8ff",
                  }}
                >
                  <View
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      flexBasis: 110,
                      gap: 2,
                    }}
                  >
                    <Text
                      style={[
                        s.body,
                        { fontSize: 14, lineHeight: 20, fontWeight: "600" },
                      ]}
                    >
                      {dayLabel(day.time, a.lang)}
                    </Text>
                    <Text style={[s.muted, { fontSize: 12, lineHeight: 17 }]}>
                      {localize(condition(day.weather_code))}
                    </Text>
                  </View>
                  <View
                    style={{ flexShrink: 1, gap: 2, alignItems: "flex-end" }}
                  >
                    <Text
                      style={[
                        s.body,
                        { fontSize: 14, lineHeight: 20, fontWeight: "600" },
                      ]}
                    >
                      {localize(formatValue(day.temperature_2m_max, "\u00b0C"))}{" "}
                      /{" "}
                      {localize(formatValue(day.temperature_2m_min, "\u00b0C"))}
                    </Text>
                    <Text style={[s.muted, { fontSize: 12, lineHeight: 17 }]}>
                      {localize("Rain chance")}{" "}
                      {localize(
                        formatValue(day.precipitation_probability_max, "%"),
                      )}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
        <Button
          secondary
          title={localize("View all weather")}
          onPress={() => a.go("weather")}
        />
      </Card>
    );
  return (
    <View style={w.screen}>
      <Card>
        <View style={w.sectionHeader}>
          <View style={w.expandContent}>
            <Text style={s.heading}>{localize("Local weather")}</Text>
            <Text style={s.muted}>{localize("Plan your next five days")}</Text>
          </View>
          <NavigationIcon route="weather" selected />
        </View>
        <View style={w.searchRow}>
          <View style={w.searchField}>
            <Field
              value={query}
              onChangeText={setQuery}
              maxLength={100}
              placeholder={localize("Town, city or postal code")}
              accessibilityLabel={localize("Find your town or village")}
              returnKeyType="search"
              onSubmitEditing={() => void search()}
            />
          </View>
          <Button
            title={localize("Search")}
            disabled={busy}
            onPress={() => void search()}
          />
        </View>
        <View style={w.actions}>
          <View style={w.action}>
            <Button
              secondary
              title={localize("Use my location")}
              disabled={busy}
              onPress={() => void locate()}
            />
          </View>
          <View style={w.action}>
            <Button
              secondary
              title={localize("Saved farm")}
              disabled={busy}
              onPress={() => void load(null)}
            />
          </View>
        </View>
        {places.map((p) => (
          <Button
            secondary
            key={`${p.latitude},${p.longitude}`}
            title={p.label || "Location"}
            disabled={busy}
            onPress={() => {
              setPlaces([]);
              void load(p);
            }}
          />
        ))}
        {busy && (
          <View style={w.loading} accessibilityLiveRegion="polite">
            <ActivityIndicator color="#007ca8" />
            <Text style={s.muted}>{localize("Loading weather...")}</Text>
          </View>
        )}
        {!!error && (
          <View style={w.error}>
            <Text accessibilityRole="alert" style={s.error}>
              {localize(error)}
            </Text>
            <Button
              secondary
              title={localize("Refresh")}
              disabled={busy}
              onPress={() => void load()}
            />
          </View>
        )}
      </Card>
      {data && (
        <>
          <LinearGradient
            colors={["#00536d", "#087e97"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={w.hero}
          >
            <View style={w.sectionHeader}>
              <Text style={w.heroLabel}>{localize("Local weather")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => void load()}
                style={({ pressed }) => [
                  w.refresh,
                  (pressed || busy) && { opacity: 0.55 },
                ]}
              >
                <Text style={w.heroLabel}>{localize("Refresh")}</Text>
              </Pressable>
            </View>
            <Text style={w.location}>
              {data.location.label ||
                `${data.location.latitude.toFixed(3)}, ${data.location.longitude.toFixed(3)}`}
            </Text>
            <Text style={w.temperature}>
              {localize(formatValue(data.current.temperature_2m, "\u00b0C"))}
            </Text>
            <Text style={w.condition}>
              {localize(condition(data.current.weather_code))}
            </Text>
            <Text style={w.heroText}>
              {localize("Feels like")}{" "}
              {localize(
                formatValue(data.current.apparent_temperature, "\u00b0C"),
              )}
            </Text>
            {data.days[0] && (
              <Text style={w.heroText}>
                {localize("High temperature")}{" "}
                {localize(
                  formatValue(data.days[0].temperature_2m_max, "\u00b0C"),
                )}{" "}
                {"\u00b7"} {localize("Low temperature")}{" "}
                {localize(
                  formatValue(data.days[0].temperature_2m_min, "\u00b0C"),
                )}
              </Text>
            )}
            <View style={w.heroFooter}>
              <Text style={w.heroText}>
                {localize("Conditions at")}{" "}
                {data.current.time.replace("T", " ")} ({data.timezone})
              </Text>
            </View>
          </LinearGradient>
          <Card>
            <Text style={s.heading}>
              {localize("All current weather details")}
            </Text>
            <Metrics
              record={Object.fromEntries(
                Object.entries(data.current).filter(([key]) =>
                  [
                    "relative_humidity_2m",
                    "wind_speed_10m",
                    "wind_gusts_10m",
                    "precipitation",
                  ].includes(key),
                ),
              )}
              units={data.units.current}
            />
            <Expand title={localize("All current weather details")}>
              <Metrics record={data.current} units={data.units.current} />
              <Text style={s.heading}>
                {localize("Hourly soil, UV and visibility estimates")}
              </Text>
              <Text style={s.muted}>
                {data.currentExtra.time.replace("T", " ")}
              </Text>
              <Metrics record={extra} units={data.units.hourly} />
            </Expand>
          </Card>
          <Card title={localize("Five-day outlook")}>
            <View style={w.insights}>
              {forecastSummary(data.days, a.lang).map((text) => (
                <View key={text} style={w.insight}>
                  <View style={w.dot} />
                  <Text style={[s.muted, w.expandContent]}>{text}</Text>
                </View>
              ))}
            </View>
            <Text style={s.muted}>
              {localize("Today and the next five days")}
            </Text>
            {data.days.map((day, index) => (
              <Expand
                key={day.time}
                title={
                  index === 0 ? localize("Today") : dayLabel(day.time, a.lang)
                }
                preview={
                  <View style={w.forecastPreview}>
                    <Text style={[s.muted, w.expandContent]}>
                      {localize(condition(day.weather_code))}
                    </Text>
                    <Text style={w.forecastTemperature}>
                      {localize(formatValue(day.temperature_2m_max, "\u00b0C"))}{" "}
                      /{" "}
                      {localize(formatValue(day.temperature_2m_min, "\u00b0C"))}
                    </Text>
                    <Text style={w.rain}>
                      {localize("Rain chance")}{" "}
                      {localize(
                        formatValue(day.precipitation_probability_max, "%"),
                      )}
                    </Text>
                  </View>
                }
              >
                <Metrics record={day} units={data.units.daily} />
                <Expand title={localize("Hour-by-hour forecast")}>
                  {day.hours.map((hour: WeatherPeriod) => (
                    <Expand
                      key={hour.time}
                      title={hour.time.slice(11, 16)}
                      preview={
                        <Text style={s.muted}>
                          {localize(condition(hour.weather_code))} {"\u00b7"}{" "}
                          {localize(
                            formatValue(hour.temperature_2m, "\u00b0C"),
                          )}{" "}
                          {"\u00b7"} {localize("Rain chance")}{" "}
                          {localize(
                            formatValue(hour.precipitation_probability, "%"),
                          )}
                        </Text>
                      }
                    >
                      <Metrics record={hour} units={data.units.hourly} />
                    </Expand>
                  ))}
                </Expand>
              </Expand>
            ))}
          </Card>
          <View style={w.attribution}>
            <Text style={s.muted}>{localize(data.modelNote)}</Text>
            <Text style={s.muted}>
              {localize("Retrieved")}{" "}
              {new Date(data.fetchedAt).toLocaleString("en-IN", {
                timeZone: data.timezone,
              })}
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(data.attributionUrl)}
              style={w.attributionLink}
            >
              <Text style={s.small}>
                {localize("Weather data by")} {data.attribution}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const w = StyleSheet.create({
  screen: { gap: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  searchField: { flexGrow: 1, flexBasis: 180, minWidth: 0 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: { flexGrow: 1, flexBasis: 130 },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  error: { backgroundColor: "#fff4f2", borderRadius: 12, padding: 12, gap: 8 },
  hero: { borderRadius: 22, padding: 22, gap: 8 },
  heroLabel: { color: "#e0f4f8", fontSize: 14, fontWeight: "600" },
  refresh: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ffffff18",
  },
  location: { color: "#fff", fontSize: 22, lineHeight: 30, fontWeight: "700" },
  temperature: {
    color: "#fff",
    fontSize: 56,
    fontWeight: "700",
    letterSpacing: -2,
    marginTop: 6,
  },
  condition: { color: "#fff", fontSize: 20, lineHeight: 28, fontWeight: "600" },
  heroText: { color: "#e0f4f8", fontSize: 14, lineHeight: 22 },
  heroFooter: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#ffffff30",
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: {
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: 0,
    backgroundColor: "#f3f7fa",
    padding: 14,
    borderRadius: 14,
    gap: 4,
  },
  metricValue: {
    color: "#142b41",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
  },
  expand: { borderTopWidth: 1, borderTopColor: "#e0e9ef" },
  expandButton: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  expandContent: { flex: 1, minWidth: 0 },
  expandTitle: {
    color: "#142b41",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  chevron: { color: "#007ca8", fontSize: 24, width: 24, textAlign: "center" },
  details: { gap: 12, paddingBottom: 14 },
  forecastPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 8,
    rowGap: 4,
    marginTop: 4,
  },
  forecastTemperature: {
    color: "#142b41",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
  },
  rain: { width: "100%", color: "#00708b", fontSize: 13, lineHeight: 20 },
  insights: {
    backgroundColor: "#edf8ff",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  insight: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#007ca8",
    marginTop: 9,
  },
  attribution: { paddingHorizontal: 8, gap: 4 },
  attributionLink: { minHeight: 44, justifyContent: "center" },
});
