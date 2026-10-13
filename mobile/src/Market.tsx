import type { ReactNode } from "react";
import { typography } from "./theme";
import { Children, useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  Linking,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { CropIcon } from "./CropIcon";
import { NavigationIcon } from "./NavigationIcon";
import { categoryImages, cropDetails, groupCrops } from "../../common/crops.js";
import * as Location from "expo-location";
import { endpoints } from "../../common/api.js";
import { marketLocations, marketStates, matchMarketLocation } from "../../common/market-locations.js";
import {
  mspNote,
  riceNote,
  mspPrices,
  mspSeason,
  marketSource,
  mspSource,
  price,
  groupMarkets,
  groupCommodityPrices,
  marketDate,
  marketSyncTime,
  priceChange,
  mergeMarketRecords,
  commodityKey,
  type MarketData,
} from "../../common/market.js";
import { useLeafCare } from "./state";
import { useLocale } from "./locale";
import { request } from "./api";
import { Page, Button, Field, s } from "./ui";
export function MarketScreen() {
  const a = useLeafCare(),
    t = useLocale();
  const [data, setData] = useState<MarketData>(),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [locating, setLocating] = useState(false),
    [locationSearch, setLocationSearch] = useState(""),
    [state, setState] = useState(""),
    [district, setDistrict] = useState(""),
    [selectedMandi, setSelectedMandi] = useState(""),
    [search, setSearch] = useState(""),
    [recentCrop, setRecentCrop] = useState(""),
    [cropOptions, setCropOptions] = useState<string[]>([]),
    [showPriceInfo, setShowPriceInfo] = useState(false),
    [showMandiFilters, setShowMandiFilters] = useState(false),
    [mspCategory, setMspCategory] = useState("Cereals & Millets"),
    [showMspInfo, setShowMspInfo] = useState(false),
    [tab, setTab] = useState("mandi"),
    [showLocation, setShowLocation] = useState(false);
  const sequence = useRef(0);
  const lastParams = useRef("");
  async function load(params = "", append = false, crop = recentCrop) {
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    if (!append) {
      setData(undefined);
      setSelectedMandi("");
    }
    try {
      const query = new URLSearchParams(params.replace(/^\?/, ""));
      if (query.has("state") && query.has("district")) query.delete("radiusKm");
      else query.set("radiusKm", "200");
      if (crop) query.set("recentCrop", crop);
      else query.delete("recentCrop");
      lastParams.current = query.toString();
      const result = await request<MarketData>(
        endpoints.market + "?" + query,
        a.token,
      );
      if (id === sequence.current) {
        if (!append) {
          const location = result.location;
          const selected = matchMarketLocation(location.state || location.nearbyTown?.state, location.district || location.nearbyTown?.district);
          setShowLocation(false);
          setState(selected.state);
          setDistrict(selected.district);
        }
        setCropOptions((previous) => [
          ...previous,
          ...(result.supportedRecentCrops || []),
          ...result.records.map((record) => record.commodity),
        ].filter((name, index, names) =>
          names.findIndex((candidate) => commodityKey(candidate) === commodityKey(name)) === index,
        ));
        setData((previous) => {
          if (!append) return result;
          const records = mergeMarketRecords(
            previous?.records || [],
            result.records,
          );
          return {
            ...result,
            records,
            status: records.length ? "ok" : result.status,
            message: result.records.length
              ? result.message
              : previous?.message || result.message,
          };
        });
      }
    } catch (e) {
      if (id === sequence.current)
        setError(
          e instanceof Error ? e.message : "Unable to load market prices.",
        );
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }
  function chooseCrop(crop: string) {
    setRecentCrop(crop);
    setSearch("");
    const query = new URLSearchParams(lastParams.current);
    query.delete("recentOffset");
    void load("?" + query, false, crop);
  }
  function loadMore() {
    const query = new URLSearchParams(lastParams.current);
    query.set("recentOffset", String(data?.recentNextOffset));
    void load("?" + query, true);
  }
  async function locate() {
    const id = ++sequence.current;
    setBusy(true);
    setLocating(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (id !== sequence.current) return;
      if (permission.status !== "granted")
        throw Error("Allow location access or enter your state and district.");
      const p = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (id !== sequence.current) return;
      setLocating(false);
      await load(
        `?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}`,
      );
    } catch (e) {
      if (id !== sequence.current) return;
      setLocating(false);
      setShowLocation(true);
      setError(
        e instanceof Error ? e.message : "Unable to locate your district.",
      );
      setBusy(false);
    }
  }
  useEffect(() => {
    const requests = sequence;
    // Starting the device location request also sets its loading indicator.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void locate();
    return () => {
      requests.current++;
    };
    // Locate when the session changes; crop selection reloads via chooseCrop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.token]);
  const locationMatches = Object.entries(marketLocations).flatMap(([region, districts]) => districts.map(name => ({ region, name }))).filter(({ region, name }) => `${name} ${region}`.toLowerCase().includes(locationSearch.trim().toLowerCase()));
  const mspGroups = groupCrops(mspPrices, ([name]) => name);
  const markets = groupMarkets(data?.records || []);
  const filteredMarkets = markets
    .filter((g) => !selectedMandi || g.key === selectedMandi)
    .map((g) => ({
      ...g,
      records: g.records.filter(
        (r) =>
          (!recentCrop ||
            commodityKey(r.commodity) === commodityKey(recentCrop)) &&
          [r.commodity, r.variety, r.market].some((value) =>
            String(value).toLowerCase().includes(search.trim().toLowerCase()),
          ),
      ),
    }))
    .filter((g) => g.records.length);
  const records = filteredMarkets.flatMap((g) => g.records);
  const commodityGroups = groupCommodityPrices(records);
  const supportPrices = mspPrices.filter(
    ([name]) => cropDetails(name).category === mspCategory,
  );
  return (
    <Page title={t("Mandi prices")} flat>
      <View style={m.tabs}>
        {[
          ["mandi", "Mandi prices"],
          ["msp", "MSP"],
        ].map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === key }}
            onPress={() => setTab(key)}
            style={[m.tab, tab === key && m.activeTab]}
          >
            <Text style={[s.body, tab === key && m.selectedText]}>
              {t(label)}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === "mandi" && (
        <>
          <View style={m.locationRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showLocation }}
            onPress={() => { setShowLocation(!showLocation); setLocationSearch(""); }}
            style={m.locationBar}
          >
            <Text numberOfLines={1} ellipsizeMode="tail" style={[s.body, m.flex]}>
              {data?.location.district
                ? data.location.district + ", " + data.location.state
                : data?.location.nearbyTown
                  ? t("Near") +
                    " " +
                    data.location.nearbyTown.town +
                    (data.location.nearbyTown.district ? ", " + data.location.nearbyTown.district : "") +
                    ", " +
                    data.location.nearbyTown.state
                  : t(locating ? "Finding your location..." : "Choose location")}
            </Text>
            <Text style={m.selectedText}>{t(showLocation ? "Close" : "Change")} ›</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Use my location")} accessibilityState={{ disabled: busy, busy: locating }}
            disabled={busy} onPress={() => void locate()} style={[m.currentLocation, busy && { opacity: 0.55 }]}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#17673f" strokeWidth={1.8} accessible={false}>
              <Circle cx={12} cy={12} r={7} /><Circle cx={12} cy={12} r={2} /><Path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
            </Svg>
            <Text style={m.locationAction}>{t(locating ? "Locating..." : "Location")}</Text>
          </Pressable>
          </View>
          {showLocation && (
            <View style={m.locationPanel}>
              <Text style={s.heading}>{t("Explore another location")}</Text>
              <Text style={s.muted}>{t("Search for a district or choose your state and district.")}</Text>
              {!!error && <Text accessibilityRole="alert" style={s.body}>{t(error)}</Text>}
              <Field accessibilityLabel={t("Search districts or states")} placeholder={t("Type a district or state name")} value={locationSearch} onChangeText={setLocationSearch} />
              {!!locationSearch.trim() && <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {locationMatches.slice(0, 30).map(({ region, name }) => <Pressable key={`${region}-${name}`} accessibilityRole="button"
                  accessibilityState={{ selected: state === region && district === name, disabled: busy }} disabled={busy}
                  style={m.locationMatch} onPress={() => { setState(region); setDistrict(name); setLocationSearch(""); }}>
                  <Text style={s.body}>{name}</Text><Text style={s.muted}>{region}</Text>
                </Pressable>)}
                {!locationMatches.length && <Text style={s.muted}>{t("No districts found. Try another name.")}</Text>}
                {locationMatches.length > 30 && <Text style={s.muted}>{t("Keep typing to narrow your search.")}</Text>}
              </ScrollView>}
              <View style={m.locationFields}>
                <View style={m.flex}>
                  <LocationSelect
                    label={t("State")}
                    value={state}
                    options={marketStates}
                    disabled={busy}
                    onSelect={(name) => { setState(name); setDistrict(""); }}
                  />
                </View>
                <View style={m.flex}>
                  <LocationSelect
                    label={t("District")}
                    value={district}
                    options={marketLocations[state] || []}
                    disabled={busy || !state}
                    onSelect={setDistrict}
                  />
                </View>
              </View>
              <Text style={m.selectionPreview}>{district ? `${district}, ${state}` : t("Select a district to see local mandi prices")}</Text>
              <Button
                title={t(busy ? "Loading market prices..." : "Show mandi prices")}
                disabled={
                  busy || state.trim().length < 2 || district.trim().length < 2
                }
                onPress={() =>
                  void load(
                    "?" +
                      new URLSearchParams({
                        state: state.trim(),
                        district: district.trim(),
                      }),
                  )
                }
              />
              <View style={m.filterRow}>
                <Button
                  secondary
                  title={t(locating ? "Finding your location..." : "Use my location")}
                  disabled={busy}
                  onPress={() => void locate()}
                />
                <Button
                  secondary
                  title={t("Saved farm")}
                  disabled={busy}
                  onPress={() => void load()}
                />
              </View>
            </View>
          )}
          <View style={m.listSection}>
            <View style={m.sectionHeading}>
              <NavigationIcon route="market" selected />
              <Text style={[s.heading, m.flex]}>
                {t("Nearby mandi reports")} <Text style={s.muted}>({t("All prices in rupees per quintal (100 kg).").replace(/\.$/, "")})</Text>
              </Text>
            </View>
            {data?.status === "ok" && (
              <Text style={s.muted}>
                {data.status === "ok"
                  ? records.length +
                    " " +
                    t("reported prices") +
                    " · " +
                    t("Check price dates")
                  : t(data.message)}
              </Text>
            )}
            {data?.syncedAt && <Text style={s.muted}>{t("Last updated")}: {marketSyncTime(data.syncedAt)} IST</Text>}
            {data?.radiusKm && (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showPriceInfo }}
                  onPress={() => setShowPriceInfo(!showPriceInfo)}
                >
                  <Text style={m.selectedText}>
                    {t("About these prices")} {showPriceInfo ? "−" : "+"}
                  </Text>
                </Pressable>
                {showPriceInfo && (
                  <>
                    <Text style={s.muted}>
                      {t(
                        "Approximate straight-line distances to market towns, not driving distances.",
                      )}
                    </Text>
                    {data?.originApproximate && (
                      <Text style={s.muted}>
                        {t(
                          "Using your district town as the centre. Use my location for a more accurate search.",
                        )}
                      </Text>
                    )}
                    {!!data?.unresolvedMarkets && (
                      <Text style={s.muted}>
                        {t(
                          "Some reported markets could not be located and are excluded.",
                        )}
                      </Text>
                    )}
                    {!!data?.supportedRecentCrops?.length && (
                      <Text style={s.muted}>
                        {t(
                          "Recent reports cover common crops. Check the date shown for each price.",
                        )}
                      </Text>
                    )}
                  </>
                )}
              </>
            )}
            {data?.recentPricesIncomplete && (
              <Text style={s.muted}>
                {t("Some recent prices could not be loaded. Please retry.")}
              </Text>
            )}
            {!!markets.length && (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showMandiFilters }}
                  onPress={() => setShowMandiFilters(!showMandiFilters)}
                >
                  <Text style={m.selectedText}>
                    {t("Search crops or mandis")} {showMandiFilters ? "−" : "+"}
                  </Text>
                </Pressable>
                {showMandiFilters && (
                  <>
                    <Field
                      accessibilityLabel={t("Search crops or mandis")}
                      placeholder={t("Search crops or mandis")}
                      value={search}
                      onChangeText={setSearch}
                    />
                  </>
                )}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator
                      accessibilityLabel={t("Choose a mandi")}
                      contentContainerStyle={m.mandiSelector}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: !selectedMandi }}
                        onPress={() => setSelectedMandi("")}
                        style={[m.mandiChoice, !selectedMandi && m.selected]}
                      >
                        <Text style={s.body}>
                          {t("All mandis")} ({markets.length})
                        </Text>
                      </Pressable>
                      {markets.map((g) => (
                        <Pressable
                          key={g.key}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: selectedMandi === g.key,
                          }}
                          onPress={() => setSelectedMandi(g.key)}
                          style={[
                            m.mandiChoice,
                            selectedMandi === g.key && m.selected,
                          ]}
                        >
                          <Text style={m.cropName}>{g.market}</Text>
                          <Text style={m.meta}>
                            {g.district}, {g.state}
                          </Text>
                          <Text style={m.meta}>
                            {g.distanceKm != null
                              ? `≈ ${g.distanceKm} km · `
                              : ""}
                            {new Set(g.records.map((r) => r.commodity)).size}{" "}
                            {t("crops")}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
              </>
            )}
            <CategoryBrowser
              categories={["All crops", ...cropOptions]}
              selected={recentCrop || "All crops"}
              onSelect={(crop) => chooseCrop(crop === "All crops" ? "" : crop)}
              cropImages
              disabled={busy || !cropOptions.length}
            >
            {busy && <Text accessibilityLiveRegion="polite" style={s.muted}>{t("Loading market prices...")}</Text>}
            {!busy && (error || (data && !records.length)) && (
              <View style={m.emptyState}>
                <Text accessibilityLiveRegion="polite" style={[s.muted, m.emptyMessage]}>
                  {t(error || (data?.status === "ok" ? "No reports match these filters." : data!.message))}
                </Text>
              </View>
            )}
            <View>
              {commodityGroups.map((g) => (
                <View key={g.commodity} style={m.mandiGroup}>
                  <View style={m.cropHeading}>
                    <CropIcon name={g.commodity} size={64} />
                    <Text style={[m.cropName, m.flex]}>{t(g.commodity)}</Text>
                  </View>
                  {g.records.map((r, i) => (
                    <View key={r.market + r.variety + i} style={m.cropPriceRow}>
                      <View style={m.flex}>
                        <Text style={m.cropName}>{r.market}</Text>
                        <Text style={m.meta}>
                          {r.distanceKm != null
                            ? `≈ ${r.distanceKm} km · `
                            : ""}
                          {r.state}
                        </Text>
                        <Text style={m.meta}>{t(r.variety)}</Text>
                        {r.grade && <Text style={m.meta}>{t("Grade")}: {t(r.grade)}</Text>}
                      </View>
                      <View style={[m.flex, m.cropPriceValues]}>
                        <Text style={m.cropName}>
                          {r.min != null && r.max != null
                            ? price(r.min, t).split(" / ")[0] +
                              " – " +
                              price(r.max, t).split(" / ")[0]
                            : price(r.modal, t).split(" / ")[0]}
                        </Text>
                        <Text style={m.meta}>
                          {marketDate(r.date)} · 100 kg
                        </Text>
                        <Text
                          style={[
                            m.meta,
                            r.change != null && r.change > 0
                              ? m.priceUp
                              : r.change != null && r.change < 0
                                ? m.priceDown
                                : undefined,
                          ]}
                        >
                          {priceChange(r.change, t)}
                        </Text>
                        {r.previousDate && (
                          <Text style={m.meta}>
                            {t("Compared with")} {marketDate(r.previousDate)}
                          </Text>
                        )}
                        <Text style={m.meta}>{r.source}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
            {data?.recentNextOffset != null && (
              <Button
                secondary
                title={t("Load more recent reports")}
                disabled={busy}
                onPress={loadMore}
              />
            )}
            </CategoryBrowser>
            {data?.truncated && (
              <Text style={s.muted}>
                {t(
                  data?.radiusKm
                    ? "Nearby coverage is incomplete because the government feed exceeds the report limit."
                    : "Showing the first 1,000 reports. See the source for more.",
                )}
              </Text>
            )}
            <Button
              secondary
              title="AGMARKNET / data.gov.in"
              onPress={() => void Linking.openURL(marketSource)}
            />
            <Button
              secondary
              title={"AGMARKNET · " + t("Recent prices")}
              onPress={() =>
                void Linking.openURL("https://agmarknet.gov.in/home")
              }
            />
          </View>
        </>
      )}
      {tab === "msp" && (
        <View style={m.listSection}>
          <Text style={s.heading}>
            {t("Government Minimum Support Prices (MSP)")}
          </Text>
          <Text style={m.season}>{t(mspSeason)}</Text>
          <Text style={s.muted}>
            {t("Government support prices for the current kharif season.")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showMspInfo }}
            onPress={() => setShowMspInfo(!showMspInfo)}
            style={m.explainer}
          >
            <Text style={m.selectedText}>
              {t("How MSP works")} {showMspInfo ? "?" : "+"}
            </Text>
          </Pressable>
          {showMspInfo && (
            <View style={m.group}>
              <Text style={s.muted}>{t(mspNote)}</Text>
              <Text style={s.muted}>{t(riceNote)}</Text>
            </View>
          )}
          <CategoryBrowser
            categories={mspGroups.map((g) => g.category)}
            selected={mspCategory}
            onSelect={setMspCategory}
            counts={Object.fromEntries(
              mspGroups.map((g) => [g.category, g.items.length]),
            )}
          >
            <Text style={s.heading}>{t(mspCategory)}</Text>
            <PriceGrid>
              {supportPrices.map(([name, value]) => (
                <View key={name} style={m.tileContent}>
                  <View style={m.tileImage}>
                    <CropIcon name={name} size={64} />
                  </View>
                  <Text style={m.cropName}>{t(name)}</Text>
                  <Text style={m.tilePrice}>
                    {price(value, t).split(" / ")[0]}
                  </Text>
                  <Text style={m.meta}>{t("per quintal (100 kg)")}</Text>
                </View>
              ))}
            </PriceGrid>
          </CategoryBrowser>
          <Button
            secondary
            title={t("Official MSP notification · 13 May 2026")}
            onPress={() => void Linking.openURL(mspSource)}
          />
        </View>
      )}
    </Page>
  );
}
function LocationSelect({ label, value, options, onSelect, disabled = false }: { label: string; value: string; options: string[]; onSelect: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const t = useLocale();
  const matches = options.filter(name => name.toLowerCase().includes(search.trim().toLowerCase()));
  return <>
    <Text style={s.body}>{label}</Text>
    <Button secondary title={value || label} disabled={disabled || !options.length} onPress={() => { setSearch(""); setOpen(true); }} />
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <Page title={label}>
        <Field accessibilityLabel={label} placeholder={label} value={search} onChangeText={setSearch} />
        <Button secondary title={t("Close")} onPress={() => setOpen(false)} />
        {matches.map(name =>
          <Button key={name} secondary title={name} onPress={() => { onSelect(name); setOpen(false); }} />)}
        {!matches.length && <Text style={s.muted}>{t("No districts found. Try another name.")}</Text>}
      </Page>
    </Modal>
  </>;
}

const m = StyleSheet.create({
  emptyState: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderWidth: 1,
    borderColor: "#d9e6dd",
    borderRadius: 8,
    backgroundColor: "#f7faf8",
  },
  emptyMessage: { textAlign: "center" },
  cropHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e8e2",
  },
  cropPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e8e2",
  },
  cropPriceValues: { alignItems: "flex-end", gap: 4 },
  priceUp: { color: "#218653", fontWeight: "600" },
  priceDown: { color: "#bd3b3b", fontWeight: "600" },
  mandiSelector: { gap: 10, paddingVertical: 4 },
  mandiChoice: {
    width: 190,
    gap: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dce7df",
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  mandiGroup: {
    gap: 8,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e8e2",
  },
  flex: { flex: 1 },
  browser: {
    flexDirection: "column",
    width: "100%",
    gap: 14,
    alignItems: "stretch",
  },
  rail: {
    width: "100%",
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  railContent: { gap: 10, padding: 4, paddingBottom: 12, alignItems: "flex-start" },
  railButton: {
    width: 104,
    position: "relative",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dce7df",
    backgroundColor: "#fff",
  },
  railSelected: { width: 104, backgroundColor: "#edf7f0", borderColor: "#218653" },
  railSelectedText: { fontSize: 12, lineHeight: 17, fontWeight: "700", color: "#218653" },
  categoryCount: {
    marginTop: 0,
    minWidth: 22,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "#edf5ef",
    color: "#17673f",
    fontFamily: typography.fontFamily,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  railText: {
    width: "100%",
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: "#40584a",
    textAlign: "center",
  },
  results: { width: "100%", minWidth: 0, gap: 10 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    alignItems: "stretch",
  },
  tile: {
    borderWidth: 1,
    borderColor: "#e0e8e2",
    borderRadius: 10,
    padding: 8,
    backgroundColor: "#fff",
  },
  tileContent: { gap: 5, minWidth: 0 },
  tileImage: {
    width: 72,
    maxWidth: "100%",
    aspectRatio: 1,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f6f9f6",
    borderRadius: 8,
  },
  tilePrice: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "600",
    color: "#218653",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e8e2",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: "#218653" },
  locationRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  currentLocation: { flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: "#dce7df", borderRadius: 10, backgroundColor: "#f3f9f5" },
  locationAction: { fontFamily: typography.fontFamily, fontSize: 13, color: "#17673f", fontWeight: "600" },
  locationMatch: { padding: 12, gap: 4, borderBottomWidth: 1, borderBottomColor: "#dce7df", minHeight: 48 },
  selectionPreview: { padding: 12, borderRadius: 10, backgroundColor: "#edf8ef", color: "#17673f", fontFamily: typography.fontFamily },
  locationBar: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#dce7df",
    borderRadius: 10,
    backgroundColor: "#f3f9f5",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
  },
  locationPanel: { gap: 12, padding: 16, borderWidth: 1, borderColor: "#dce7df", borderRadius: 16, backgroundColor: "#fff" },
  listSection: { gap: 12 },
  hero: { padding: 20, borderRadius: 16, gap: 8 },
  heroLabel: {
    color: "#e5f5eb",
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  heroTitle: {
    color: "#fff",
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: "700",
  },
  heroText: {
    color: "#e5f5eb",
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 20,
  },
  locationFields: { flexDirection: "row", gap: 10 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  filterLabel: {
    color: "#697b70",
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cropFilter: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    minHeight: 44,
    padding: 6,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: "#d5e1d8",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  filterText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: "#40584a",
    fontWeight: "600",
  },
  selected: { borderColor: "#218653", backgroundColor: "#edf7f0" },
  selectedText: { color: "#218653", fontWeight: "600" },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryFilter: {
    flexBasis: "30%",
    flexGrow: 1,
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d5e1d8",
    backgroundColor: "#fff",
  },
  categoryText: {
    color: "#40584a",
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  group: { gap: 0, marginTop: 12 },
  groupHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e8e2",
  },
  groupTitle: {
    color: "#243c30",
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  count: {
    color: "#697b70",
    backgroundColor: "#edf7f0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: typography.fontFamily,
    fontSize: 11,
  },
  priceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#e0e8e2",
    borderRadius: 0,
    backgroundColor: "#fff",
  },
  details: { flex: 1, gap: 5 },
  cropName: {
    flexShrink: 1,
    lineHeight: 20,
    color: "#243c30",
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  meta: {
    color: "#697b70",
    fontFamily: typography.fontFamily,
    fontSize: 11,
    lineHeight: 17,
  },
  price: {
    color: "#218653",
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: "700",
  },
  mandiPrice: {
    color: "#218653",
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  season: {
    color: "#218653",
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: "600",
    backgroundColor: "#edf7f0",
    padding: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  explainer: {
    backgroundColor: "#f1f6f2",
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    justifyContent: "center",
  },
});

function CategoryBrowser({
  categories,
  selected,
  onSelect,
  counts,
  children,
  cropImages = false,
  disabled = false,
}: {
  categories: string[];
  selected: string;
  onSelect: (name: string) => void;
  counts?: Record<string, number>;
  children: ReactNode;
  cropImages?: boolean;
  disabled?: boolean;
}) {
  const t = useLocale();
  return (
    <View style={m.browser}>
      <ScrollView horizontal style={m.rail} contentContainerStyle={m.railContent} nestedScrollEnabled>
        {categories.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={t(name)}
            accessibilityState={{ selected: name === selected, disabled }}
            disabled={disabled}
            onPress={() => onSelect(name)}
            style={[m.railButton, name === selected && m.railSelected]}
          >
            <CropIcon name={cropImages ? (name === "All crops" ? "Crop plant" : name) : categoryImages[name]} size={44} />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[m.railText, name === selected && m.railSelectedText]}
            >
              {t(name)}
            </Text>
            {counts && <Text style={m.categoryCount}>{counts[name] || 0}</Text>}
          </Pressable>
        ))}
      </ScrollView>
      <View style={m.results}>{children}</View>
    </View>
  );
}
function PriceGrid({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(0);
  const columns = Math.max(1, Math.floor(width / 148));
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={m.grid}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={{ width: `${100 / columns}%`, padding: 4 }}>
          <View style={[m.tile, { flex: 1 }]}>{child}</View>
        </View>
      ))}
    </View>
  );
}
