import { useLocale } from "../locale";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { Redirect } from "expo-router";
import {
  consentDetail,
  consentText,
  photoChecks,
  photoTip,
  screens,
} from "../../../common/content.js";
import { useLeafCare } from "../state";
import { Button, Card, Field, LeafLogo, Page, s } from "../ui";
export function CaptureScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  return (
    <Page title={localize(screens.capture)}>
      <View style={{ height: 330, borderRadius: 18, backgroundColor: "#c2d4b1", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <View style={{ alignItems: "center", borderWidth: 2, borderColor: "#fff", borderRadius: 18, padding: 20 }}>
          <LeafLogo large />
        </View>
        <Text style={s.body}>
          {localize("Place one leaf inside the frame")}
        </Text>
        <Text style={s.muted}>
          {localize("Your device camera opens when you tap below.")}
        </Text>
      </View>
      <Card title={localize("A clearer photo helps")} soft>
        <Text style={s.body}>{localize(photoTip)}</Text>
      </Card>
      <Button
        title={localize("Open camera")}
        disabled={a.busy}
        onPress={() => {
          void a.pick(true);
        }}
      />
      <Button
        variant="outline"
        title={localize("Choose from gallery")}
        disabled={a.busy}
        onPress={() => {
          void a.pick(false);
        }}
      />
    </Page>
  );
}
export function ReviewScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  if (!a.photo) return <Redirect href="/capture" />;
  return (
    <Page title={localize(screens.review)}>
      <Image
        source={{ uri: a.photo }}
        accessibilityLabel={localize("Selected leaf for review")}
        style={[s.image, { height: 330, borderRadius: 15, resizeMode: "cover" }]}
      />
      <Card title={localize("Check your photo")} soft>
        <Text style={s.body}>{localize("Confirm these before continuing:")}</Text>
        {photoChecks.map((text) => (
          <Text key={text} style={s.body}>
            ✓ {localize(text)}
          </Text>
        ))}
      </Card>
      <View style={[s.row, { flexWrap: "nowrap" }]}><View style={s.flex}><Button
        variant="outline"
        title={localize("Retake")}
        onPress={() => a.go("capture")}
      /></View>
      <View style={s.flex}><Button title={localize("Use photo")} onPress={() => a.go("details")} /></View></View>
    </Page>
  );
}
export function DetailsScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  if (!a.photo) return <Redirect href="/capture" />;
  return (
    <Page title={localize(screens.details)}>
      <View style={[s.card, s.soft, s.row, { padding: 12, flexWrap: "nowrap", gap: 16 }]}>
        <Image source={{ uri: a.photo }} accessibilityLabel={localize("Leaf ready to analyze")} style={{ width: 90, height: 110, borderRadius: 12 }} />
        <View style={s.flex}><Text style={s.heading}>{localize("Ready to analyze")}</Text>
        <Text style={s.muted}>
          {localize("Add a few details (optional) for more helpful results.")}
        </Text>
        </View>
      </View>
      <Text style={s.body}>{localize("Plant name")} <Text style={s.muted}>{localize("(optional)")}</Text></Text>
      <Field
        accessibilityLabel={localize("Plant name (optional)")}
        placeholder={localize("e.g. Tomato")}
        value={a.plantName}
        onChangeText={a.setPlantName}
        maxLength={150}
      />
      <Text style={s.body}>{localize("Location")} <Text style={s.muted}>{localize("(optional)")}</Text></Text>
      <Field
        accessibilityLabel={localize("Location (optional)")}
        placeholder={localize("e.g. Garden, Balcony, Indoors")}
        value={a.location}
        onChangeText={a.setLocation}
        maxLength={255}
      />
      <View style={[s.row, { alignItems: "flex-start", flexWrap: "nowrap" }]}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: a.consent, disabled: a.busy }}
            accessibilityLabel={localize(consentText)}
            onPress={() => a.setConsent(!a.consent)}
            disabled={a.busy}
            style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "flex-start", paddingTop: 2 }}
          ><View style={{ width: 23, height: 23, borderWidth: 1, borderColor: "#218653", borderRadius: 3, backgroundColor: a.consent ? "#218653" : "#fff", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff" }}>{a.consent ? "✓" : ""}</Text></View></Pressable>
          <View style={[s.flex, { gap: 8 }]}><Text style={s.body}>{localize(consentText)}</Text><Text style={s.muted}>{localize(consentDetail)}</Text></View>
      </View>
      <Button
        disabled={!a.consent || a.busy}
        title={localize("Analyze leaf")}
        onPress={() => {
          void a.analyze();
        }}
      />
    </Page>
  );
}
export function ProcessingScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  if (!a.busy) return <Redirect href={a.result ? "/result" : "/details"} />;
  return (
    <Page processing>
      {a.photo && <View style={{ alignSelf: "center", width: 230, height: 230, overflow: "hidden", borderRadius: 20 }}><Image source={{ uri: a.photo }} accessibilityLabel={localize("Leaf being analyzed")} style={{ width: "100%", height: "100%" }} /><View style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 3, backgroundColor: "#218653" }} /></View>}
      <Text style={[s.pageTitle, { textAlign: "center" }]}>{localize(screens.processing)}</Text>
      <ActivityIndicator size="large" color="#218653" />
      <Text accessibilityLiveRegion="polite" style={s.body}>
        {localize("Checking the photo and assessing visible plant health.")}
      </Text>
      <Card>
        <Text style={s.body}>{localize("1. Image received")}</Text>
        <Text style={s.body}>{localize("2. AI analysis in progress")}</Text>
        <Text style={s.body}>{localize("3. Preparing recommendations")}</Text>
      </Card>
      <Text style={s.muted}>
        {localize(
          "This may take a few moments. Good plant care is worth the wait!",
        )}
      </Text>
    </Page>
  );
}
