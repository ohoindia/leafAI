import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  profileSettings,
  accountGreeting,
  analysisStatus,
  careTips,
  filterHistory,
  screens,
  voiceCommands,
} from "../../../common/content.js";
import { useLeafCare } from "../state";
import { UserAvatar, AnalysisPhoto, Button, Card, Field, PasswordField, Languages, Page, LeafLogo, s } from "../ui";
import { userDetailSections, type UserDetails } from "../../../common/profile.js";

export function HomeScreen() {
  const a = useLeafCare();
  return (
    <Page
      title={accountGreeting(a.user?.fullName)}
    >
      <Text style={s.body}>Healthy plants make a happier you.</Text>
      <LinearGradient colors={["#007ca8", "#005e80"]} style={s.hero}>
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
      {([
        ["history", "Recent analyses", "View your past leaf analyses and results"],
        ["learn", "Plant care tips", "Everyday habits for healthier, happier plants"],
      ] as const).map(([route, title, description]) => <Pressable key={route} accessibilityRole="button" disabled={a.busy} onPress={() => a.go(route)} style={s.card}>
        <View style={[s.row, { justifyContent: "space-between" }]}><Text style={s.heading}>{title}</Text><Text style={s.heading}>›</Text></View>
        <Text style={s.muted}>{description}</Text>
      </Pressable>)}
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
        <Card key={item.id}>
          <View style={s.row}>
            <AnalysisPhoto id={item.id} thumbnail />
            <View style={s.flex}>
              <Text style={s.heading}>{item.plant_name || item.provided_plant_name || "Unidentified plant"}</Text>
              <Text style={s.body}>{item.disease_name || analysisStatus(item)}</Text>
            </View>
          </View>
          <Text style={s.muted}>
            {new Date(item.created_at).toLocaleDateString()} ·{" "}
            {analysisStatus(item)}
          </Text>
          <Text style={s.muted}>{item.confidence == null ? "Confidence pending" : `${Math.round(item.confidence * 100)}% confidence`}{item.severity ? ` · ${item.severity}` : ""}</Text>
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
        <Card title={a.history.length ? "No matching analyses" : "Your plant journey starts here"}>
          <LeafLogo large />
          <Text style={s.muted}>
            {a.history.length ? "Try another search or filter." : "Analyze your first leaf to save its results here."}
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
function ProfileMenuCard({ title, subtitle, icon, onPress }: { title: string; subtitle: string; icon: string; onPress: () => void }) {
  const a = useLeafCare();
  return <Pressable accessibilityRole="button" disabled={a.busy} onPress={onPress} style={[s.card, s.row]}>
    <View style={s.accountAvatar}><Text style={s.avatarText}>{icon}</Text></View>
    <View style={s.flex}><Text style={s.heading}>{title}</Text><Text style={s.muted}>{subtitle}</Text></View><Text style={s.heading}>{"\u203a"}</Text>
  </Pressable>;
}
export function ProfileScreen() {
  const a = useLeafCare();
  return <Page title={screens.profile}>
    <Card>
      <View style={s.row}>
        <UserAvatar />
        <View style={s.flex}><Text style={s.heading}>{a.user?.fullName || "Your account"}</Text><Text style={s.muted}>{a.user?.email}</Text></View>
      </View>
    </Card>
    {profileSettings.map(item => <ProfileMenuCard key={item.route} title={item.title} subtitle={item.subtitle} icon={item.icon === "language" ? "\u25ce" : item.icon === "security" ? "\u26bf" : "\u25cb"} onPress={() => a.go(item.route)} />)}
    <ProfileMenuCard title="Sign out" subtitle="Sign out of your account" icon="\u21aa" onPress={() => { void a.logout(); }} />
  </Page>;
}
export function AccountDetailsScreen() {
  const a = useLeafCare();
  const [name, setName] = useState<string>();
  const [draft, setDraft] = useState<UserDetails>();
  const details = draft ?? a.user?.userDetails ?? {};
  return <Page title={screens["account-details"]}>
    <Card title="Profile photo">
      <View style={{ alignItems: "center" }}>{a.profilePhotoDraft ? <Image source={{ uri: a.profilePhotoDraft }} accessibilityLabel="Selected profile photo preview" style={{ width: 120, height: 120, borderRadius: 60 }} /> : <UserAvatar large />}</View>
      <Text style={s.muted}>Use a clear photo of yourself. Review it before uploading.</Text>
      <Button secondary title="Take photo" disabled={a.busy} onPress={() => { void a.pickProfilePhoto(true); }} />
      <Button secondary title="Choose from gallery" disabled={a.busy} onPress={() => { void a.pickProfilePhoto(false); }} />
      {a.profilePhotoDraft && <><Button title={a.busy ? "Uploading..." : "Upload photo"} disabled={a.busy} onPress={() => { void a.uploadProfilePhoto(); }} /><Button secondary title="Cancel photo" disabled={a.busy} onPress={() => a.setProfilePhotoDraft(undefined)} /></>}
    </Card>
    <Card title="Personal details">
      <Text style={s.body}>Full name</Text><Field value={name ?? a.user?.fullName ?? ""} onChangeText={setName} maxLength={150} editable={!a.busy} autoComplete="name" accessibilityLabel="Full name" />
      <Text style={s.body}>Email address</Text><Text style={s.muted}>{a.user?.email}</Text>
    </Card>
    {userDetailSections.map(section => <Card key={section.title} title={section.title}>
      {section.fields.map(field => <View key={field.key} style={{ gap: 8 }}><Text style={s.body}>{field.label}</Text><Field accessibilityLabel={field.label} placeholder={field.placeholder} value={details[field.key] || ""} editable={!a.busy} maxLength={field.key.includes("Phone") || field.key === "phone" ? 30 : field.key === "postalCode" ? 20 : 300} keyboardType={field.key.includes("Phone") || field.key === "phone" ? "phone-pad" : "default"} onChangeText={value => setDraft({ ...details, [field.key]: value })} /></View>)}
    </Card>)}
    <Text style={s.muted}>Your personal address is saved separately from your farm address. Contact and address fields are optional.</Text>
    <Button title={a.busy ? "Saving..." : "Save user details"} disabled={a.busy} onPress={() => { void a.saveProfile(name ?? a.user?.fullName ?? "", undefined, details).then(ok => { if (ok) { setName(undefined); setDraft(undefined); } }); }} />
  </Page>;
}
export function SecurityScreen() {
  const a = useLeafCare();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  return <Page title={screens.security}>
    <Card title="Password & security">
      <Text style={s.body}>Current password</Text><PasswordField value={current} onChangeText={setCurrent} autoCapitalize="none" autoComplete="current-password" maxLength={128} accessibilityLabel="Current password" />
      <Text style={s.body}>New password</Text><PasswordField value={password} onChangeText={setPassword} autoCapitalize="none" autoComplete="new-password" maxLength={128} accessibilityLabel="New password" />
      <Text style={s.body}>Confirm password</Text><PasswordField value={confirm} onChangeText={setConfirm} autoCapitalize="none" autoComplete="new-password" maxLength={128} accessibilityLabel="Confirm password" />
      <Text style={s.muted}>Use at least 10 characters. You will sign in again after changing your password.</Text>
      <Button title="Update password" disabled={a.busy} onPress={() => { if (password !== confirm) { a.setError("Passwords do not match."); return; } void a.changePassword(current, password); }} />
    </Card>
  </Page>;
}
export function LanguageSettingsScreen() {
  return <Page title={screens.language}><Card title="Change language"><Text style={s.muted}>Choose your preferred language</Text><Languages /></Card></Page>;
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
