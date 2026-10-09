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
import { Button, Card, Field, Page, s } from "../ui";
export function CaptureScreen() {
  const a = useLeafCare();
  return (
    <Page title={screens.capture}>
      <Card>
        <Text style={{ fontSize: 80, textAlign: "center" }}>🌿</Text>
        <Text style={s.body}>Place one leaf inside the frame</Text>
        <Text style={s.muted}>
          Your device camera opens when you tap below.
        </Text>
      </Card>
      <Card title="A clearer photo helps">
        <Text style={s.body}>{photoTip}</Text>
      </Card>
      <Button
        title="Open camera"
        disabled={a.busy}
        onPress={() => {
          void a.pick(true);
        }}
      />
      <Button
        secondary
        title="Choose from gallery"
        disabled={a.busy}
        onPress={() => {
          void a.pick(false);
        }}
      />
    </Page>
  );
}
export function ReviewScreen() {
  const a = useLeafCare();
  if (!a.photo) return <Redirect href="/capture" />;
  return (
    <Page title={screens.review}>
      <Image
        source={{ uri: a.photo }}
        accessibilityLabel="Selected leaf for review"
        style={s.image}
      />
      <Card title="Check your photo">
        {photoChecks.map((text) => (
          <Text key={text} style={s.body}>
            ✓ {text}
          </Text>
        ))}
      </Card>
      <Button secondary title="Retake" onPress={() => a.go("capture")} />
      <Button title="Use photo" onPress={() => a.go("details")} />
    </Page>
  );
}
export function DetailsScreen() {
  const a = useLeafCare();
  if (!a.photo) return <Redirect href="/capture" />;
  return (
    <Page title={screens.details}>
      <Card title="Ready to analyze">
        <Image source={{ uri: a.photo }} style={s.image} />
        <Text style={s.muted}>
          Add a few details (optional) for more helpful results.
        </Text>
      </Card>
      <Field
        accessibilityLabel="Plant name (optional)"
        placeholder="Plant name, e.g. Tomato (optional)"
        value={a.plantName}
        onChangeText={a.setPlantName}
        maxLength={150}
      />
      <Field
        accessibilityLabel="Location (optional)"
        placeholder="Location, e.g. Balcony (optional)"
        value={a.location}
        onChangeText={a.setLocation}
        maxLength={255}
      />
      <Card>
        <View style={s.row}>
          <Switch
            accessibilityLabel={consentText}
            value={a.consent}
            onValueChange={a.setConsent}
            disabled={a.busy}
          />
          <Text style={[s.body, s.flex]}>{consentText}</Text>
        </View>
        <Text style={s.muted}>{consentDetail}</Text>
      </Card>
      <Button
        disabled={!a.consent || a.busy}
        title="Analyze leaf"
        onPress={() => {
          void a.analyze();
        }}
      />
    </Page>
  );
}
export function ProcessingScreen() {
  const a = useLeafCare();
  if (!a.busy) return <Redirect href={a.result ? "/result" : "/details"} />;
  return (
    <Page processing title={screens.processing}>
      {a.photo && <Image source={{ uri: a.photo }} style={s.image} />}
      <ActivityIndicator size="large" color="#357b35" />
      <Text accessibilityLiveRegion="polite" style={s.body}>
        Checking the photo and assessing visible plant health.
      </Text>
      <Card>
        <Text style={s.body}>1. Image received</Text>
        <Text style={s.body}>2. AI analysis in progress</Text>
        <Text style={s.body}>3. Preparing recommendations</Text>
      </Card>
      <Text style={s.muted}>
        This may take a few moments. Good plant care is worth the wait!
      </Text>
    </Page>
  );
}
