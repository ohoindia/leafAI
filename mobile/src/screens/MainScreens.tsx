import { Weather } from "../Weather";
import { useLocale } from "../locale";
import { useState } from "react";
import { router } from "expo-router";
import { subscriptionMessage } from "../../../common/subscription.js";
import { Image, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NavigationIcon } from "../NavigationIcon";
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
import {
  UserAvatar,
  AnalysisPhoto,
  Button,
  Card,
  Field,
  Languages,
  Page,
  LeafLogo,
  SelectField,
  s,
} from "../ui";
import {
  userDetailSections,
  type UserDetails,
} from "../../../common/profile.js";

export function HomeScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  return (
    <Page>
      {a.billingStatus.enabled && a.billingStatus.access !== true && (
        <Card title="Subscription required">
          <Text style={s.body}>{subscriptionMessage}</Text>
          <Button
            title="View subscription plans"
            onPress={() => router.push("/subscription")}
          />
        </Card>
      )}
      <View style={{ paddingTop: 6, gap: 8 }}><Text style={{ position: "absolute", right: 3, top: 0, fontSize: 55, color: "#ecbb35" }}>☀</Text><Text style={[s.title, { paddingRight: 60 }]}>{localize(accountGreeting(a.user?.fullName))}</Text><Text style={[s.body, { maxWidth: 230, color: "#536b5c" }]}>{localize("Healthy plants make")}{"\n"}{localize("a happier you.")}</Text></View>
      <Weather summary />
      <LinearGradient colors={["#218653", "#17673f"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={{ alignSelf: "center", width: 62, height: 62, borderRadius: 31, borderWidth: 1, borderColor: "#ffffff50", backgroundColor: "#ffffff18", alignItems: "center", justifyContent: "center" }}><NavigationIcon route="camera" selected inverted /></View>
        <Text style={[s.pageTitle, { color: "#fff", textAlign: "center", fontSize: 24 }]}>
          {localize("Analyze a leaf")}
        </Text>
        <Text style={[s.muted, { color: "#fff", textAlign: "center", lineHeight: 20 }]}>
          {localize(
            "Take a photo or choose from your gallery to detect plant issues, get insights and care recommendations.",
          )}
        </Text>
        <Button
          variant="light"
          icon={<NavigationIcon route="camera" selected />}
          title={localize("Take photo")}
          onPress={() => a.go("capture")}
        />
        <Button
          variant="glass"
          icon={<NavigationIcon route="gallery" selected inverted />}
          title={localize("Choose from gallery")}
          disabled={a.busy}
          onPress={() => {
            void a.pick(false);
          }}
        />
      </LinearGradient>
      {(
        [
          [
            "history",
            "Recent analyses",
            "View your past leaf analyses and results",
          ],
          [
            "learn",
            "Plant care tips",
            "Everyday habits for healthier, happier plants",
          ],
        ] as const
      ).map(([route, title, description]) => (
        <Pressable
          key={route}
          accessibilityRole="button"
          disabled={a.busy}
          onPress={() => a.go(route)}
          style={[s.card, { flexDirection: "row", alignItems: "center", gap: 14 }]}
        >
          <View style={{ backgroundColor: route === "learn" ? "#fff1bc" : "#d5ebcf", borderRadius: 16, padding: 12 }}>{route === "learn" ? <Text style={{ color: "#b78a13", fontSize: 24 }}>☀</Text> : <NavigationIcon route="history" selected />}</View>
          <View style={s.flex}>
            <Text style={[s.body, { fontWeight: "600" }]}>{localize(title)}</Text>
            <Text style={[s.muted, { fontSize: 12, lineHeight: 17 }]}>{localize(description)}</Text>
          </View>
          <Text style={s.heading}>›</Text>
        </Pressable>
      ))}
    </Page>
  );
}
export function WeatherScreen() {
  return (
    <Page>
      <Weather />
    </Page>
  );
}
export function HistoryScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const shown = filterHistory(a.history, query, filter);
  return (
    <Page title={localize(screens.history)}>
      <Text style={s.muted}>
        {localize("Keep track of your plant health journey")}
      </Text>
      <Field
        accessibilityLabel={localize("Search plants and conditions")}
        placeholder={localize("Search plants, conditions…")}
        value={query}
        onChangeText={setQuery}
      />
      <SelectField label="Filter analyses" value={filter} onChange={setFilter} options={[
        ["all", "All analyses"],
        ["attention", "Needs attention"],
        ["review", "Review required"],
      ]} />
      {shown.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" disabled={a.busy} onPress={() => void a.openHistory(item)} style={s.card}>
          <View style={s.row}>
            <AnalysisPhoto id={item.id} thumbnail />
            <View style={s.flex}>
              <Text style={s.heading}>
                {item.plant_name ||
                  item.provided_plant_name ||
                  "Unidentified plant"}
              </Text>
              <Text style={s.body}>
                {item.disease_name || analysisStatus(item)}
              </Text>
            </View>
            <Text style={[s.small, { backgroundColor: "#edf7f0", borderRadius: 10, padding: 6 }]}>{localize(analysisStatus(item))}</Text>
            <Text style={s.heading}>›</Text>
          </View>
          <Text style={s.muted}>
            {new Date(item.created_at).toLocaleDateString()} ·{" "}
            {localize(
              item.confidence == null
                ? "Confidence pending"
                : `${Math.round(item.confidence * 100)}% confidence`,
            )}
            {localize(item.severity ? ` · ${item.severity}` : "")}
          </Text>
        </Pressable>
      ))}
      {!shown.length && (
        <Card
          title={localize(
            a.history.length
              ? "No matching analyses"
              : "Your plant journey starts here",
          )}
        >
          <LeafLogo large />
          <Text style={s.muted}>
            {localize(
              a.history.length
                ? "Try another search or filter."
                : "Analyze your first leaf to save its results here.",
            )}
          </Text>
          <Button
            title={localize("Analyze a leaf")}
            onPress={() => a.go("capture")}
          />
        </Card>
      )}
    </Page>
  );
}
export function LearnScreen() {
  const localize = useLocale();
  return (
    <Page title={localize(screens.learn)}>
      <Text style={s.muted}>{localize("Small habits. Healthier plants.")}</Text>
      {careTips.map(([title, text]) => (
        <Card key={title} title={localize(title)} soft>
          <Text style={s.body}>{localize(text)}</Text>
        </Card>
      ))}
    </Page>
  );
}
function ProfileMenuRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: string;
  onPress: () => void;
}) {
  const localize = useLocale();
  const a = useLeafCare();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={a.busy}
      onPress={onPress}
      style={[
        s.row,
        {
          minHeight: 72,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#e0e8e2",
        },
      ]}
    >
      <View style={{ width: 32, alignItems: "center" }}>
        {["language", "security", "farm", "profile"].includes(icon) ? <NavigationIcon route={icon as "language" | "security" | "farm" | "profile"} selected /> : <Text style={s.avatarText}>{icon}</Text>}
      </View>
      <View style={s.flex}>
        <Text style={[s.body, { fontWeight: "500" }]}>{localize(title)}</Text>
        {!!subtitle && <Text style={[s.muted, { fontSize: 12 }]}>{localize(subtitle)}</Text>}
      </View>
      <Text style={s.heading}>{"\u203a"}</Text>
    </Pressable>
  );
}
export function ProfileScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  return (
    <Page title={localize(screens.profile)} flat>
      <View
        style={{
          alignItems: "center",
          paddingVertical: 24,
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#e0e8e2",
        }}
      >
        <UserAvatar large />
        <Text style={s.heading}>
          {a.user?.fullName || localize("Your account")}
        </Text>
        {!!a.user?.email && <Text style={s.muted}>{a.user.email}</Text>}
      </View>
      <View style={{ gap: 0 }}>
        <ProfileMenuRow
          title="Subscription and AutoPay"
          icon="◈"
          onPress={() => router.push("/subscription")}
        />
        {profileSettings.map((item) => (
          <ProfileMenuRow
            key={item.route}
            title={localize(item.title)}
            subtitle={item.subtitle}
            icon={item.icon}
            onPress={() => a.go(item.route)}
          />
        ))}
        <ProfileMenuRow
          title={localize("Sign out")}
          subtitle="Sign out of your account"
          icon="\u21aa"
          onPress={() => {
            void a.logout();
          }}
        />
      </View>
    </Page>
  );
}
export function AccountDetailsScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState<string>();
  const [draft, setDraft] = useState<UserDetails>();
  const details = draft ?? a.user?.userDetails ?? {};
  return (
    <Page title={localize(screens["account-details"])}>
      <Card title={localize("Profile photo")}>
        <View style={{ alignItems: "center" }}>
          {a.profilePhotoDraft ? (
            <Image
              source={{ uri: a.profilePhotoDraft }}
              accessibilityLabel={localize("Selected profile photo preview")}
              style={{ width: 120, height: 120, borderRadius: 60 }}
            />
          ) : (
            <UserAvatar large />
          )}
        </View>
        <Text style={s.muted}>
          {localize(
            "Use a clear photo of yourself. Review it before uploading.",
          )}
        </Text>
        <Button
          secondary
          title={localize("Take photo")}
          disabled={a.busy}
          onPress={() => {
            void a.pickProfilePhoto(true);
          }}
        />
        <Button
          secondary
          title={localize("Choose from gallery")}
          disabled={a.busy}
          onPress={() => {
            void a.pickProfilePhoto(false);
          }}
        />
        {a.profilePhotoDraft && (
          <>
            <Button
              title={localize(a.busy ? "Uploading..." : "Upload photo")}
              disabled={a.busy}
              onPress={() => {
                void a.uploadProfilePhoto();
              }}
            />
            <Button
              secondary
              title={localize("Cancel photo")}
              disabled={a.busy}
              onPress={() => a.setProfilePhotoDraft(undefined)}
            />
          </>
        )}
      </Card>
      <Card title={localize("Personal details")}>
        <Text style={s.body}>{localize("Full name")}</Text>
        {editing ? (
          <Field
            value={name ?? a.user?.fullName ?? ""}
            onChangeText={setName}
            maxLength={150}
            editable={!a.busy}
            autoComplete="name"
            accessibilityLabel={localize("Full name")}
          />
        ) : (
          <Text style={s.muted}>{a.user?.fullName || localize("Not specified")}</Text>
        )}
        <Text style={s.body}>{localize("Email address")}</Text>
        <Text style={s.muted}>{a.user?.email}</Text>
      </Card>
      {userDetailSections.map((section) => (
        <Card key={section.title} title={localize(section.title)}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>{section.fields.map((field) => (
            <View key={field.key} style={{ gap: 8, width: field.key.startsWith("addressLine") ? "100%" : "50%", paddingHorizontal: 6, paddingBottom: 12 }}>
              <Text style={s.body}>{localize(field.label)}</Text>
              {editing ? (
                <Field
                  accessibilityLabel={localize(field.label)}
                  placeholder={localize(field.placeholder)}
                  value={details[field.key] || ""}
                  editable={!a.busy}
                  maxLength={
                    field.key.includes("Phone") || field.key === "phone"
                      ? 30
                      : field.key === "postalCode"
                        ? 20
                        : 300
                  }
                  keyboardType={
                    field.key.includes("Phone") || field.key === "phone"
                      ? "phone-pad"
                      : "default"
                  }
                  onChangeText={(value) =>
                    setDraft({ ...details, [field.key]: value })
                  }
                />
              ) : (
                <Text style={s.muted}>
                  {a.user?.userDetails?.[field.key] || localize("Not specified")}
                </Text>
              )}
            </View>
          ))}</View>
        </Card>
      ))}
      {editing && <Text style={s.muted}>
        {localize(
          "Your personal address is saved separately from your farm address. Contact and address fields are optional.",
        )}
      </Text>}
      {editing ? (
        <>
          <Button
            title={localize(a.busy ? "Saving..." : "Save user details")}
            disabled={a.busy}
            onPress={() => {
              void a
                .saveProfile(name ?? a.user?.fullName ?? "", undefined, details)
                .then((ok) => {
                  if (ok) {
                    setName(undefined);
                    setDraft(undefined);
                    setEditing(false);
                  }
                });
            }}
          />
          <Button
            secondary
            title={localize("Cancel")}
            disabled={a.busy}
            onPress={() => {
              setName(undefined);
              setDraft(undefined);
              setEditing(false);
              a.setError("");
            }}
          />
        </>
      ) : (
        <Button
          title={localize("Edit")}
          disabled={a.busy}
          onPress={() => setEditing(true)}
        />
      )}
    </Page>
  );
}
export function SecurityScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  return (
    <Page title={localize("PIN & security")}>
      <Card title="PIN & security">
        <Text style={s.body}>
          {localize("Verify your mobile number with OTP to set a new PIN.")}
        </Text>
        <Button
          title={localize("Set PIN with OTP")}
          disabled={a.busy}
          onPress={() => void a.logout()}
        />
      </Card>
    </Page>
  );
}
export function LanguageSettingsScreen() {
  const localize = useLocale();
  return (
    <Page title={localize(screens.language)}>
      <Card>
        <Text style={s.muted}>
          {localize("Choose your preferred language")}
        </Text>
        <Languages />
      </Card>
    </Page>
  );
}
export function VoiceScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  return (
    <Page title={localize("How can I help?")}>
      <Languages />
      <Text style={s.muted}>
        {localize(
          "Tap a command to navigate or hear your result using your device voice.",
        )}
      </Text>
      {voiceCommands.map((text) => (
        <Button
          key={text}
          title={localize(text)}
          disabled={a.busy}
          secondary
          onPress={() => {
            void a.command(text);
          }}
        />
      ))}
      <Button
        secondary
        title={localize("Stop reading")}
        onPress={() => {
          void import("expo-speech").then((speech) => speech.stop());
        }}
      />
    </Page>
  );
}
