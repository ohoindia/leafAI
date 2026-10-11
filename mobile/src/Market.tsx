import { useEffect, useRef, useState } from "react";
import { Text, View, Linking, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CropIcon } from "./CropIcon";
import { NavigationIcon } from "./NavigationIcon";
import { cropCategories, categoryImages, cropDetails, groupCrops } from "../../common/crops.js";
import * as Location from "expo-location";
import { endpoints } from "../../common/api.js";
import {
  mandiNote,
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
import { Page, Card, Button, Field, s } from "./ui";
export function MarketScreen() {
  const a = useLeafCare(),
    t = useLocale();
  const [data, setData] = useState<MarketData>(),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [state, setState] = useState(""),
    [district, setDistrict] = useState(""),
    [crop, setCrop] = useState("all"),
    [category, setCategory] = useState("all"),
    [showMspInfo, setShowMspInfo] = useState(false);
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
  const records = (data?.records || []).filter(
    (r) =>
      (category === "all" || cropDetails(r.commodity).category === category) &&
      (crop === "all" ||
      (crop === "rice"
        ? /rice|paddy/i
        : crop === "cotton"
          ? /cotton/i
          : /chilli|chili|mirchi/i
      ).test(r.commodity)),
  );
  return (
    <Page title={t("Market")}>
      <LinearGradient colors={["#00536d", "#087e97"]} style={m.hero}>
        <Text style={m.heroLabel}>{t("Crop prices & market insights")}</Text>
        <Text style={m.heroTitle}>{t("Your crop. Your market.")}</Text>
        <Text style={m.heroText}>{t("All prices in rupees per quintal (100 kg).")}</Text>
      </LinearGradient>
      <Card title={t("Your market location")}>
        <View style={m.locationFields}>
          <View style={m.flex}><Field accessibilityLabel={t("State")} placeholder={t("State")} value={state} onChangeText={setState} maxLength={100} /></View>
          <View style={m.flex}><Field accessibilityLabel={t("District")} placeholder={t("District")} value={district} onChangeText={setDistrict} maxLength={100} /></View>
        </View>
        <Button title={t("Load prices")} disabled={busy || state.trim().length < 2 || district.trim().length < 2}
          onPress={() => void load("?" + new URLSearchParams({ state: state.trim(), district: district.trim() }))} />
        <View style={m.filterRow}>
          <Button secondary title={t("Use my location")} disabled={busy} onPress={() => void locate()} />
          <Button secondary title={t("Saved farm")} disabled={busy} onPress={() => void load()} />
        </View>
      </Card>
      <Card>
        <View style={m.sectionHeading}><NavigationIcon route="market" selected /><Text style={[s.heading, m.flex]}>{t("Local mandi prices")}</Text></View>
        <Text style={s.muted}>{t(mandiNote)}</Text>
        {!!data?.location.district && <Text style={s.heading}>{data.location.district}, {data.location.state}</Text>}
        <Text style={m.filterLabel}>{t("Crop")}</Text>
        <View style={m.filterRow}>
          {[["all", "All crops", "Crop plant"], ["rice", "Rice / Paddy", "Paddy"], ["cotton", "Cotton", "Cotton"], ["mirchi", "Mirchi (chilli)", "Chilli"]].map(([key, label, name]) => (
            <Pressable key={key} accessibilityRole="button" accessibilityLabel={t(label)} accessibilityState={{ selected: crop === key }}
              style={[m.cropFilter, crop === key && m.selected]} onPress={() => { setCrop(key); setCategory("all"); }}>
              <CropIcon name={name} size={30} /><Text style={[m.filterText, crop === key && m.selectedText]}>{t(label)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={m.filterLabel}>{t("Browse by category")}</Text>
        <View style={m.categories}>
          {["all", ...cropCategories].map((name) => (
            <Pressable key={name} accessibilityRole="button" accessibilityLabel={t(name === "all" ? "All categories" : name)} accessibilityState={{ selected: category === name }}
              style={[m.categoryFilter, category === name && m.selected]} onPress={() => { setCategory(name); setCrop("all"); }}>
              <CropIcon name={categoryImages[name]} size={48} />
              <Text style={[m.categoryText, category === name && m.selectedText]}>{t(name === "all" ? "All categories" : name)}</Text>
            </Pressable>
          ))}
        </View>
        {busy && <Text accessibilityLiveRegion="polite" style={s.muted}>{t("Loading market prices...")}</Text>}
        {!!error && <Text accessibilityRole="alert" style={s.error}>{t(error)}</Text>}
        {data && <Text style={s.muted}>{t(data.message)}</Text>}
        {data?.status === "ok" && !records.length && <Text style={s.muted}>{t("No reports for this crop in the selected district.")}</Text>}
        {groupCrops(records, (r) => r.commodity).map((group) => (
          <View key={group.category} style={m.group}>
            <View style={m.groupHeading}><CropIcon name={categoryImages[group.category]} size={32} /><Text style={[m.groupTitle, m.flex]}>{t(group.category)}</Text><Text style={m.count}>{group.items.length}</Text></View>
            {group.items.map((r, i) => (
              <View key={`${t(r.commodity)}-${r.market}-${i}`} style={m.priceCard}>
                <CropIcon name={t(r.commodity)} size={64} />
                <View style={m.details}>
                  <Text style={m.cropName}>{t(r.commodity)} ? {t(r.variety)}</Text>
                  <Text style={m.meta}>{r.market} ? {t("Reported")}: {r.date}</Text>
                  <Text style={m.mandiPrice}>{t("Modal price")}: {price(r.modal, t)}</Text>
                  <Text style={m.meta}>{t("Minimum")}: {price(r.min, t)} ? {t("Maximum")}: {price(r.max, t)}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
        {data?.truncated && <Text style={s.muted}>{t("Showing the first 1,000 reports. See the source for more.")}</Text>}
        <Button secondary title="AGMARKNET / data.gov.in" onPress={() => void Linking.openURL(marketSource)} />
      </Card>
      <Card title={t("Government Minimum Support Prices (MSP)")}>
        <Text style={m.season}>{t(mspSeason)}</Text>
        <Text style={s.muted}>{t("Government support prices for the current kharif season.")}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showMspInfo }} onPress={() => setShowMspInfo(!showMspInfo)} style={m.explainer}>
          <Text style={m.selectedText}>{t("How MSP works")} {showMspInfo ? "?" : "+"}</Text>
        </Pressable>
        {showMspInfo && <View style={m.group}><Text style={s.muted}>{t(mspNote)}</Text><Text style={s.muted}>{t(riceNote)}</Text></View>}
        {groupCrops(mspPrices, ([name]) => name).map((group) => (
          <View key={group.category} style={m.group}>
            <View style={m.groupHeading}><CropIcon name={categoryImages[group.category]} size={32} /><Text style={m.groupTitle}>{t(group.category)}</Text></View>
            {group.items.map(([name, value]) => (
              <View key={name} style={m.priceCard}>
                <CropIcon name={name} size={64} />
                <View style={m.details}><Text style={m.cropName}>{t(name)}</Text><Text style={m.price}>{price(value, t).split(" / ")[0]}</Text><Text style={m.meta}>{t("per quintal (100 kg)")}</Text></View>
              </View>
            ))}
          </View>
        ))}
        <Button secondary title={t("Official MSP notification · 13 May 2026")} onPress={() => void Linking.openURL(mspSource)} />
      </Card>
    </Page>
  );
}

const m = StyleSheet.create({
  flex: { flex: 1 },
  hero: { padding: 20, borderRadius: 16, gap: 8 },
  heroLabel: { color: "#e0f4f8", fontSize: 12, fontWeight: "600" },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "700" },
  heroText: { color: "#e0f4f8", fontSize: 13, lineHeight: 20 },
  locationFields: { flexDirection: "row", gap: 10 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  filterLabel: { color: "#63758a", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 8 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cropFilter: { flexDirection: "row", gap: 8, alignItems: "center", minHeight: 44, padding: 6, paddingRight: 12, borderWidth: 1, borderColor: "#d6e2ec", borderRadius: 8, backgroundColor: "#fff" },
  filterText: { fontSize: 12, color: "#34495d", fontWeight: "600" },
  selected: { borderColor: "#007ca8", backgroundColor: "#edf8ff" },
  selectedText: { color: "#007ca8", fontWeight: "600" },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryFilter: { flexBasis: "30%", flexGrow: 1, alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#d6e2ec", backgroundColor: "#fff" },
  categoryText: { color: "#34495d", fontSize: 11, fontWeight: "600", textAlign: "center" },
  group: { gap: 12, marginTop: 12 },
  groupHeading: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#e0e9ef" },
  groupTitle: { color: "#142b41", fontSize: 14, fontWeight: "600" },
  count: { color: "#63758a", backgroundColor: "#edf8ff", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11 },
  priceCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderWidth: 1, borderColor: "#e0e9ef", borderRadius: 12, backgroundColor: "#fbfdff" },
  details: { flex: 1, gap: 5 },
  cropName: { color: "#142b41", fontSize: 14, fontWeight: "600" },
  meta: { color: "#63758a", fontSize: 11, lineHeight: 17 },
  price: { color: "#007ca8", fontSize: 24, fontWeight: "700" },
  mandiPrice: { color: "#007ca8", fontSize: 14, fontWeight: "700" },
  season: { color: "#007ca8", fontSize: 12, fontWeight: "600", backgroundColor: "#edf8ff", padding: 8, borderRadius: 6, alignSelf: "flex-start" },
  explainer: { backgroundColor: "#f3f7fa", borderRadius: 8, padding: 12, minHeight: 44, justifyContent: "center" },
});
