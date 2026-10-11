import { useEffect, useRef, useState } from "react";
import { Text, View, Linking } from "react-native";
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
    [crop, setCrop] = useState("all");
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
      crop === "all" ||
      (crop === "rice"
        ? /rice|paddy/i
        : crop === "cotton"
          ? /cotton/i
          : /chilli|chili|mirchi/i
      ).test(r.commodity),
  );
  return (
    <Page title={t("Market")}>
      <Text style={s.muted}>
        {t("All prices in rupees per quintal (100 kg).")}
      </Text>
      <Card title={t("Your market location")}>
        <Field
          accessibilityLabel={t("State")}
          placeholder={t("State")}
          value={state}
          onChangeText={setState}
          maxLength={100}
        />
        <Field
          accessibilityLabel={t("District")}
          placeholder={t("District")}
          value={district}
          onChangeText={setDistrict}
          maxLength={100}
        />
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
      </Card>
      <Card title={t("Local mandi prices")}>
        <Text style={s.body}>{t(mandiNote)}</Text>
        {!!data?.location.district && (
          <Text style={s.heading}>
            {data.location.district}, {data.location.state}
          </Text>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            ["all", "All crops"],
            ["rice", "Rice / Paddy"],
            ["cotton", "Cotton"],
            ["mirchi", "Mirchi (chilli)"],
          ].map(([key, label]) => (
            <Button
              key={key}
              secondary={crop !== key}
              title={t(label)}
              onPress={() => setCrop(key)}
            />
          ))}
        </View>
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
        {records.map((r, i) => (
          <View
            key={i}
            style={{
              padding: 12,
              backgroundColor: "#edf8ff",
              borderRadius: 12,
              gap: 6,
            }}
          >
            <Text style={s.heading}>
              {r.commodity} · {r.variety}
            </Text>
            <Text style={s.body}>
              {r.market} · {t("Reported")}: {r.date}
            </Text>
            <Text style={s.heading}>
              {t("Modal price")}: {price(r.modal)}
            </Text>
            <Text style={s.body}>
              {t("Minimum")}: {price(r.min)} · {t("Maximum")}: {price(r.max)}
            </Text>
          </View>
        ))}
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
      </Card>
      <Card title={t("Government Minimum Support Prices (MSP)")}>
        <Text style={s.body}>{t(mspNote)}</Text>
        <Text style={s.heading}>
          {mspSeason} · ₹ / {t("quintal (100 kg)")}
        </Text>
        <Text style={s.body}>{t(riceNote)}</Text>
        {mspPrices.map(([name, value]) => (
          <View
            key={name}
            style={{
              padding: 12,
              backgroundColor: "#f0f8ed",
              borderRadius: 12,
              gap: 6,
            }}
          >
            <Text style={s.heading}>{t(name)}</Text>
            <Text style={s.body}>{price(value)}</Text>
          </View>
        ))}
        <Button
          secondary
          title={t("Official MSP notification · 13 May 2026")}
          onPress={() => void Linking.openURL(mspSource)}
        />
      </Card>
    </Page>
  );
}
