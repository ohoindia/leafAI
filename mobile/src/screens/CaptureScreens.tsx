import { useLocale } from "../locale";
import { ActivityIndicator, Image, Switch, Text, View } from "react-native";
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
      <Card>
        <View style={{ alignItems: "center" }}>
          <LeafLogo large />
        </View>
        <Text style={s.body}>
          {localize("Place one leaf inside the frame")}
        </Text>
        <Text style={s.muted}>
          {localize("Your device camera opens when you tap below.")}
        </Text>
      </Card>
      <Card title={localize("A clearer photo helps")}>
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
        secondary
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
        style={s.image}
      />
      <Card title={localize("Check your photo")}>
        {photoChecks.map((text) => (
          <Text key={text} style={s.body}>
            ✓ {localize(text)}
          </Text>
        ))}
      </Card>
      <Button
        secondary
        title={localize("Retake")}
        onPress={() => a.go("capture")}
      />
      <Button title={localize("Use photo")} onPress={() => a.go("details")} />
    </Page>
  );
}
export function DetailsScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  if (!a.photo) return <Redirect href="/capture" />;
  return (
    <Page title={localize(screens.details)}>
      <Card title={localize("Ready to analyze")}>
        <Image source={{ uri: a.photo }} style={s.image} />
        <Text style={s.muted}>
          {localize("Add a few details (optional) for more helpful results.")}
        </Text>
      </Card>
      <Field
        accessibilityLabel={localize("Plant name (optional)")}
        placeholder={localize("Plant name, e.g. Tomato (optional)")}
        value={a.plantName}
        onChangeText={a.setPlantName}
        maxLength={150}
      />
      <Field
        accessibilityLabel={localize("Location (optional)")}
        placeholder={localize("Location, e.g. Balcony (optional)")}
        value={a.location}
        onChangeText={a.setLocation}
        maxLength={255}
      />
      <Card>
        <View style={s.row}>
          <Switch
            accessibilityLabel={localize(consentText)}
            value={a.consent}
            onValueChange={a.setConsent}
            disabled={a.busy}
          />
          <Text style={[s.body, s.flex]}>{localize(consentText)}</Text>
        </View>
        <Text style={s.muted}>{localize(consentDetail)}</Text>
      </Card>
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
    <Page processing title={localize(screens.processing)}>
      {a.photo && <Image source={{ uri: a.photo }} style={s.image} />}
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
