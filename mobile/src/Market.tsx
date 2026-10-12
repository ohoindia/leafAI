import type { ReactNode } from "react";
import { typography } from "./theme";
import { Children, useEffect, useRef, useState } from "react";
import { Text, View, Linking, Pressable, StyleSheet } from "react-native";
import { CropIcon } from "./CropIcon";
import { NavigationIcon } from "./NavigationIcon";
import {
  cropCategories,
  categoryImages,
  cropDetails,
  groupCrops,
} from "../../common/crops.js";
import * as Location from "expo-location";
import { endpoints } from "../../common/api.js";
import {
  mspNote,
  riceNote,
  mspPrices,
  mspSeason,
  marketSource,
  mspSource,
  price,
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
    [state, setState] = useState(""),
    [district, setDistrict] = useState(""),
    [category, setCategory] = useState("Cereals & Millets"),
    [mspCategory, setMspCategory] = useState("Cereals & Millets"),
    [showMspInfo, setShowMspInfo] = useState(false),
    [tab, setTab] = useState("mandi"),
    [showLocation, setShowLocation] = useState(false);
  const sequence = useRef(0);
  async function load(params = "") {
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    setData(undefined);
    try {
      const result = await request<MarketData>(
        endpoints.market + params,
        a.token,
      );
      if (id === sequence.current) setData(result);
    } catch (e) {
      if (id === sequence.current)
        setError(
          e instanceof Error ? e.message : "Unable to load market prices.",
        );
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    const id = sequence.current;
    void request<MarketData>(endpoints.market, a.token)
      .then((result) => {
        if (active && id === sequence.current) setData(result);
      })
      .catch((e) => {
        if (active && id === sequence.current)
          setError(
            e instanceof Error ? e.message : "Unable to load market prices.",
          );
      })
      .finally(() => {
        if (active && id === sequence.current) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [a.token]);
  async function locate() {
    setBusy(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw Error("Allow location access or enter your state and district.");
      const p = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await load(
        `?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to locate your district.",
      );
      setBusy(false);
    }
  }
  const mandiGroups = groupCrops(data?.records || [], r => r.commodity);
  const mspGroups = groupCrops(mspPrices, ([name]) => name);
  const records = (data?.records || []).filter(r => cropDetails(r.commodity).category === category);
  const supportPrices = mspPrices.filter(([name]) => cropDetails(name).category === mspCategory);
  return (
    <Page title={t("Mandi prices")} flat>
      <View style={m.tabs}>
        {[["mandi", "Mandi prices"], ["msp", "MSP"]].map(([key, label]) => (
          <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)} style={[m.tab, tab === key && m.activeTab]}>
            <Text style={[s.body, tab === key && m.selectedText]}>{t(label)}</Text>
          </Pressable>
        ))}
      </View>
      {tab === "mandi" && <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showLocation }} onPress={() => setShowLocation(!showLocation)} style={m.locationBar}>
        <Text style={[s.body, m.flex]}>{data?.location.district ? data.location.district + ", " + data.location.state : t("Your market location")}</Text>
        <Text style={m.selectedText}>{t("Change")} ›</Text>
      </Pressable>
      {showLocation && <View style={m.locationPanel}>
        <View style={m.locationFields}>
          <View style={m.flex}>
            <Field
              accessibilityLabel={t("State")}
              placeholder={t("State")}
              value={state}
              onChangeText={setState}
              maxLength={100}
            />
          </View>
          <View style={m.flex}>
            <Field
              accessibilityLabel={t("District")}
              placeholder={t("District")}
              value={district}
              onChangeText={setDistrict}
              maxLength={100}
            />
          </View>
        </View>
        <Button
          title={t("Load prices")}
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
            title={t("Use my location")}
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
      </View>}
      <View style={m.listSection}>
        <View style={m.sectionHeading}>
          <NavigationIcon route="market" selected />
          <Text style={[s.heading, m.flex]}>{t("My crops")}</Text>
        </View>
        <Text style={s.muted}>{t("All prices in rupees per quintal (100 kg).")}</Text>
        {busy && (
          <Text accessibilityLiveRegion="polite" style={s.muted}>
            {t("Loading market prices...")}
          </Text>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {t(error)}
          </Text>
        )}
        {data && <Text style={s.muted}>{t(data.message)}</Text>}
        {data?.status === "ok" && !records.length && (
          <Text style={s.muted}>
            {t("No reports for this crop in the selected district.")}
          </Text>
        )}
        <CategoryBrowser categories={cropCategories} selected={category} onSelect={setCategory} counts={Object.fromEntries(mandiGroups.map(g => [g.category, g.items.length]))}>
          <Text style={s.heading}>{t(category)}</Text>
          <PriceGrid>{records.map((r, i) => <View key={r.commodity + r.market + i} style={m.tileContent}>
            <View style={m.tileImage}><CropIcon name={r.commodity} size={64} /></View>
            <Text style={m.cropName}>{t(r.commodity)}</Text>
            <Text style={m.meta}>{t(r.variety)}</Text>
            <Text style={m.tilePrice}>{price(r.modal, t).split(" / ")[0]}</Text>
            <Text style={m.meta}>{t("per quintal (100 kg)")}</Text>
            <Text style={m.meta}>{r.market} · {r.date}</Text>
            <Text style={m.meta}>{t("Minimum")}: {price(r.min, t).split(" / ")[0]}</Text>
            <Text style={m.meta}>{t("Maximum")}: {price(r.max, t).split(" / ")[0]}</Text>
          </View>)}</PriceGrid>
        </CategoryBrowser>
        {data?.truncated && (
          <Text style={s.muted}>
            {t("Showing the first 1,000 reports. See the source for more.")}
          </Text>
        )}
        <Button
          secondary
          title="AGMARKNET / data.gov.in"
          onPress={() => void Linking.openURL(marketSource)}
        />
      </View>
      </>}
      {tab === "msp" && <View style={m.listSection}>
        <Text style={s.heading}>{t("Government Minimum Support Prices (MSP)")}</Text>
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
        <CategoryBrowser categories={mspGroups.map(g => g.category)} selected={mspCategory} onSelect={setMspCategory} counts={Object.fromEntries(mspGroups.map(g => [g.category, g.items.length]))}>
          <Text style={s.heading}>{t(mspCategory)}</Text>
          <PriceGrid>{supportPrices.map(([name, value]) => <View key={name} style={m.tileContent}>
            <View style={m.tileImage}><CropIcon name={name} size={64} /></View>
            <Text style={m.cropName}>{t(name)}</Text>
            <Text style={m.tilePrice}>{price(value, t).split(" / ")[0]}</Text>
            <Text style={m.meta}>{t("per quintal (100 kg)")}</Text>
          </View>)}</PriceGrid>
        </CategoryBrowser>
        <Button
          secondary
          title={t("Official MSP notification · 13 May 2026")}
          onPress={() => void Linking.openURL(mspSource)}
        />
      </View>}
    </Page>
  );
}

const m = StyleSheet.create({
  flex: { flex: 1 },
  browser: { flexDirection: "row", width: "100%", gap: 8, alignItems: "flex-start" },
  rail: { width: 76, flexShrink: 0, gap: 4, backgroundColor: "#f6f9f6", borderRadius: 12, padding: 4 },
  railButton: { alignItems: "center", gap: 5, paddingVertical: 10, paddingHorizontal: 3, borderRadius: 8, minHeight: 72, borderLeftWidth: 3, borderLeftColor: "transparent" },
  railSelected: { backgroundColor: "#e2f2e8", borderLeftColor: "#218653" },
  railText: { width: "100%", flexShrink: 1, fontFamily: typography.fontFamily, fontSize: 11, lineHeight: 16, color: "#40584a", textAlign: "center" },
  results: { flex: 1, flexShrink: 1, minWidth: 0, gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, alignItems: "stretch" },
  tile: { borderWidth: 1, borderColor: "#e0e8e2", borderRadius: 10, padding: 8, backgroundColor: "#fff" },
  tileContent: { gap: 5, minWidth: 0 },
  tileImage: { width: 72, maxWidth: "100%", aspectRatio: 1, alignSelf: "center", alignItems: "center", justifyContent: "center", backgroundColor: "#f6f9f6", borderRadius: 8 },
  tilePrice: { fontFamily: typography.fontFamily, fontSize: 17, lineHeight: 23, fontWeight: "600", color: "#218653" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e0e8e2" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: "transparent" },
  activeTab: { borderBottomColor: "#218653" },
  locationBar: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  locationPanel: { gap: 12, paddingVertical: 12 },
  listSection: { gap: 12 },
  hero: { padding: 20, borderRadius: 16, gap: 8 },
  heroLabel: { color: "#e5f5eb", fontFamily: typography.fontFamily, fontSize: 12, fontWeight: "600" },
  heroTitle: { color: "#fff", fontFamily: typography.fontFamily, fontSize: 24, fontWeight: "700" },
  heroText: { color: "#e5f5eb", fontFamily: typography.fontFamily, fontSize: 13, lineHeight: 20 },
  locationFields: { flexDirection: "row", gap: 10 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  filterLabel: {
    color: "#697b70",
    fontFamily: typography.fontFamily, fontSize: 11,
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
  filterText: { fontFamily: typography.fontFamily, fontSize: 12, color: "#40584a", fontWeight: "600" },
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
    fontFamily: typography.fontFamily, fontSize: 11,
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
  groupTitle: { color: "#243c30", fontFamily: typography.fontFamily, fontSize: 14, fontWeight: "600" },
  count: {
    color: "#697b70",
    backgroundColor: "#edf7f0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: typography.fontFamily, fontSize: 11,
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
  cropName: { flexShrink: 1, lineHeight: 20, color: "#243c30", fontFamily: typography.fontFamily, fontSize: 14, fontWeight: "600" },
  meta: { color: "#697b70", fontFamily: typography.fontFamily, fontSize: 11, lineHeight: 17 },
  price: { color: "#218653", fontFamily: typography.fontFamily, fontSize: 24, fontWeight: "700" },
  mandiPrice: { color: "#218653", fontFamily: typography.fontFamily, fontSize: 14, fontWeight: "700" },
  season: {
    color: "#218653",
    fontFamily: typography.fontFamily, fontSize: 12,
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

function CategoryBrowser({ categories, selected, onSelect, counts, children }: { categories: string[]; selected: string; onSelect: (name: string) => void; counts: Record<string, number>; children: ReactNode }) {
  const t = useLocale();
  return <View style={m.browser}>
    <View style={m.rail}>
      {categories.map(name => <Pressable key={name} accessibilityRole="button" accessibilityLabel={t(name)} accessibilityState={{ selected: name === selected }} onPress={() => onSelect(name)} style={[m.railButton, name === selected && m.railSelected]}>
        <CropIcon name={categoryImages[name]} size={30} />
        <Text style={[m.railText, name === selected && m.selectedText]}>{t(name)}</Text>
        <Text style={m.meta}>{counts[name] || 0}</Text>
      </Pressable>)}
    </View>
    <View style={m.results}>{children}</View>
  </View>;
}
function PriceGrid({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(0);
  const columns = Math.max(1, Math.floor(width / 148));
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={m.grid}>
    {Children.toArray(children).map((child, i) => <View key={i} style={{ width: `${100 / columns}%`, padding: 4 }}><View style={[m.tile, { flex: 1 }]}>{child}</View></View>)}
  </View>;
}
