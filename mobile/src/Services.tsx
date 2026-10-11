import { useState } from "react";
import { Linking, Platform, Share, Text, View } from "react-native";
import * as Location from "expo-location";
import * as IntentLauncher from "expo-intent-launcher";
import { useLocale } from "./locale";
import { Page, Card, Button, Field, s } from "./ui";
import { fertilizerPackage, fertilizerStore, officerContacts, fertilizerDescription, officerDescription, locationNote, resolveServiceLocation } from "../../common/services.js";

export function ServicesScreen() {
  const t = useLocale();
  const [place, setPlace] = useState({ district: "", mandal: "", cluster: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function open(url: string) {
    try { await Linking.openURL(url); } catch { setMessage("Unable to open this service. Please try again."); }
  }
  async function fertilizer() {
    if (Platform.OS === "android") {
      try {
        IntentLauncher.openApplication(fertilizerPackage);
        return;
      } catch { /* An absent app falls back to its official store listing. */ }
    }
    await open(fertilizerStore);
  }
  async function locate() {
    setBusy(true); setMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw Error();
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPlace(await resolveServiceLocation(p.coords.latitude, p.coords.longitude));
    } catch { setMessage("Could not detect your location. Enter your district and mandal manually."); }
    finally { setBusy(false); }
  }
  return <Page title={t("Services")}>
    <Text style={s.body}>{t("Useful agriculture services for farmers")}</Text>
    <Card title={t("Framework for Fertilizer Sale")}>
      <Text style={s.body}>{t(fertilizerDescription)}</Text>
      <Button title={t("Open app / Install")} onPress={() => void fertilizer()} />
      <Text style={s.muted}>{t("Available on Android through Google Play.")}</Text>
    </Card>
    <Card title={t("Officers Contact")}>
      <Text style={s.body}>{t(officerDescription)}</Text>
      <Button secondary disabled={busy} title={t(busy ? "Finding location…" : "Use my location")} onPress={() => void locate()} />
      {(["district", "mandal", "cluster"] as const).map(key => <View key={key}>
        <Text style={s.body}>{t(key[0].toUpperCase() + key.slice(1))}</Text>
        <Field accessibilityLabel={t(key[0].toUpperCase() + key.slice(1))} value={place[key]} onChangeText={value => setPlace({ ...place, [key]: value })} />
      </View>)}
      <Text style={s.muted}>{t(locationNote)}</Text>
      <Button secondary title={t("Share location")} disabled={!Object.values(place).some(Boolean)} onPress={() => {
        void Share.share({ message: Object.values(place).filter(Boolean).join(", ") }).catch(() => setMessage("Unable to share your location."));
      }} />
      <Button title={t("Open officer contacts")} onPress={() => void open(officerContacts)} />
    </Card>
    {!!message && <Text accessibilityRole="alert" style={s.body}>{t(message)}</Text>}
  </Page>;
}
