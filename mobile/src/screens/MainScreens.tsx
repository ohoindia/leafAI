import { useState } from "react";
import { Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  analysisStatus,
  careTips,
  filterHistory,
  screens,
  voiceCommands,
} from "../../../common/content.js";
import { useLeafCare } from "../state";
import { Button, Card, Field, Languages, Page, s } from "../ui";
export function HomeScreen() {
  const a = useLeafCare();
  const hour = new Date().getHours();
  return (
    <Page
      title={
        hour < 12
          ? "Good morning!"
          : hour < 18
            ? "Good afternoon!"
            : "Good evening!"
      }
    >
      <Text style={s.body}>Healthy plants make a happier you.</Text>
      <LinearGradient colors={["#357b35", "#185b31"]} style={s.hero}>
        <Text style={[s.title, { color: "#fff" }]}>Analyze a leaf</Text>
        <Text style={[s.body, { color: "#fff" }]}>
          Take a photo or choose from your gallery to detect plant issues, get
          insights and care recommendations.
        </Text>
        <Button secondary title="Take photo" onPress={() => a.go("capture")} />
        <Button
          secondary
          title="Choose from gallery"
          disabled={a.busy}
          onPress={() => {
            void a.pick(false);
          }}
        />
      </LinearGradient>
      <Button
        secondary
        title="Recent analyses →"
        onPress={() => a.go("history")}
      />
      <Button
        secondary
        title="Plant care tips →"
        onPress={() => a.go("learn")}
      />
      <Button secondary title="Voice assistant" onPress={() => a.go("voice")} />
    </Page>
  );
}
export function HistoryScreen() {
  const a = useLeafCare();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const shown = filterHistory(a.history, query, filter);
  return (
    <Page title={screens.history}>
      <Text style={s.muted}>Keep track of your plant health journey</Text>
      <Field
        accessibilityLabel="Search plants and conditions"
        placeholder="Search plants, conditions…"
        value={query}
        onChangeText={setQuery}
      />
      {[
        ["all", "All analyses"],
        ["attention", "Needs attention"],
        ["review", "Review required"],
      ].map(([id, label]) => (
        <Button
          key={id}
          secondary={filter !== id}
          title={label}
          onPress={() => setFilter(id)}
        />
      ))}
      <Button
        secondary
        title="Refresh history"
        disabled={a.busy}
        onPress={() => {
          void a.run(() => a.loadHistory());
        }}
      />
      {shown.map((item) => (
        <Card
          key={item.id}
          title={
            item.plant_name || item.provided_plant_name || "Unidentified plant"
          }
        >
          <Text style={s.body}>
            {item.disease_name || analysisStatus(item)}
          </Text>
          <Text style={s.muted}>
            {new Date(item.created_at).toLocaleDateString()} ·{" "}
            {analysisStatus(item)}
          </Text>
          <Button
            title="View result"
            disabled={a.busy}
            onPress={() => {
              void a.openHistory(item);
            }}
          />
        </Card>
      ))}
      {!shown.length && (
        <Card title="No analyses found">
          <Text style={s.muted}>
            Try a different search or analyze your first leaf.
          </Text>
          <Button title="Analyze a leaf" onPress={() => a.go("capture")} />
        </Card>
      )}
    </Page>
  );
}
export function LearnScreen() {
  return (
    <Page title={screens.learn}>
      <Text style={s.muted}>Small habits. Healthier plants.</Text>
      {careTips.map(([title, text]) => (
        <Card key={title} title={title}>
          <Text style={s.body}>{text}</Text>
        </Card>
      ))}
    </Page>
  );
}
export function ProfileScreen() {
  const a = useLeafCare();
  return (
    <Page title={screens.profile}>
      <Card>
        <Text style={s.title}>
          🌿 {a.user?.fullName || "Signed-in plant carer"}
        </Text>
        <Text style={s.muted}>{a.user?.email}</Text>
        <Text style={s.body}>App language</Text>
        <Languages />
      </Card>
      <Button
        secondary
        title="Sign out"
        disabled={a.busy}
        onPress={() => {
          void a.logout();
        }}
      />
    </Page>
  );
}
export function VoiceScreen() {
  const a = useLeafCare();
  return (
    <Page title="How can I help?">
      <Languages />
      <Text style={s.muted}>
        Tap a command to navigate or hear your result using your device voice.
      </Text>
      {voiceCommands.map((text) => (
        <Button
          key={text}
          title={text}
          disabled={a.busy}
          secondary
          onPress={() => {
            void a.command(text);
          }}
        />
      ))}
      <Button
        secondary
        title="Stop reading"
        onPress={() => {
          void import("expo-speech").then((speech) => speech.stop());
        }}
      />
    </Page>
  );
}
