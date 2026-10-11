import { Weather } from "../Weather";
import { useLocale } from "../locale";
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
import {
  UserAvatar,
  AnalysisPhoto,
  Button,
  Card,
  Field,
  Languages,
  Page,
  LeafLogo,
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
    <Page title={localize(accountGreeting(a.user?.fullName))}>
      <Text style={s.body}>
        {localize("Healthy plants make a happier you.")}
      </Text>
      <Weather summary />
      <LinearGradient colors={["#007ca8", "#005e80"]} style={s.hero}>
        <Text style={[s.title, { color: "#fff" }]}>
          {localize("Analyze a leaf")}
        </Text>
        <Text style={[s.body, { color: "#fff" }]}>
          {localize(
            "Take a photo or choose from your gallery to detect plant issues, get insights and care recommendations.",
          )}
        </Text>
        <Button
          secondary
          title={localize("Take photo")}
          onPress={() => a.go("capture")}
        />
        <Button
          secondary
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
          style={s.card}
        >
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.heading}>{localize(title)}</Text>
            <Text style={s.heading}>›</Text>
          </View>
          <Text style={s.muted}>{localize(description)}</Text>
        </Pressable>
      ))}
      <Button
        secondary
        title={localize("Voice assistant")}
        onPress={() => a.go("voice")}
      />
    </Page>
  );
}
export function WeatherScreen() {
  const localize = useLocale();
  return (
    <Page title={localize("Weather")}>
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
      {[
        ["all", "All analyses"],
        ["attention", "Needs attention"],
        ["review", "Review required"],
      ].map(([id, label]) => (
        <Button
          key={id}
          secondary={filter !== id}
          title={localize(label)}
          onPress={() => setFilter(id)}
        />
      ))}
      <Button
        secondary
        title={localize("Refresh history")}
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
              <Text style={s.heading}>
                {item.plant_name ||
                  item.provided_plant_name ||
                  "Unidentified plant"}
              </Text>
              <Text style={s.body}>
                {item.disease_name || analysisStatus(item)}
              </Text>
            </View>
          </View>
          <Text style={s.muted}>
            {new Date(item.created_at).toLocaleDateString()} ·{" "}
            {localize(analysisStatus(item))}
          </Text>
          <Text style={s.muted}>
            {localize(
              item.confidence == null
                ? "Confidence pending"
                : `${Math.round(item.confidence * 100)}% confidence`,
            )}
            {localize(item.severity ? ` · ${item.severity}` : "")}
          </Text>
          <Button
            title={localize("View result")}
            disabled={a.busy}
            onPress={() => {
              void a.openHistory(item);
            }}
          />
        </Card>
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
        <Card key={title} title={localize(title)}>
          <Text style={s.body}>{localize(text)}</Text>
        </Card>
      ))}
    </Page>
  );
}
function ProfileMenuCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
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
      style={[s.card, s.row]}
    >
      <View style={s.accountAvatar}>
        <Text style={s.avatarText}>{icon}</Text>
      </View>
      <View style={s.flex}>
        <Text style={s.heading}>{localize(title)}</Text>
        <Text style={s.muted}>{localize(subtitle)}</Text>
      </View>
      <Text style={s.heading}>{"\u203a"}</Text>
    </Pressable>
  );
}
export function ProfileScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  return (
    <Page title={localize(screens.profile)}>
      <Card>
        <View style={s.row}>
          <UserAvatar />
          <View style={s.flex}>
            <Text style={s.heading}>{a.user?.fullName || "Your account"}</Text>
            <Text style={s.muted}>{a.user?.email}</Text>
          </View>
        </View>
      </Card>
      {profileSettings.map((item) => (
        <ProfileMenuCard
          key={item.route}
          title={localize(item.title)}
          subtitle={item.subtitle}
          icon={
            item.icon === "language"
              ? "\u25ce"
              : item.icon === "security"
                ? "\u26bf"
                : "\u25cb"
          }
          onPress={() => a.go(item.route)}
        />
      ))}
      <ProfileMenuCard
        title={localize("Sign out")}
        subtitle="Sign out of your account"
        icon="\u21aa"
        onPress={() => {
          void a.logout();
        }}
      />
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
          <Text style={s.muted}>{a.user?.fullName || "Not specified"}</Text>
        )}
        <Text style={s.body}>{localize("Email address")}</Text>
        <Text style={s.muted}>{a.user?.email}</Text>
      </Card>
      {userDetailSections.map((section) => (
        <Card key={section.title} title={localize(section.title)}>
          {section.fields.map((field) => (
            <View key={field.key} style={{ gap: 8 }}>
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
                  {a.user?.userDetails?.[field.key] || "Not specified"}
                </Text>
              )}
            </View>
          ))}
        </Card>
      ))}
      <Text style={s.muted}>
        {localize(
          "Your personal address is saved separately from your farm address. Contact and address fields are optional.",
        )}
      </Text>
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
      <Card>
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
      <Card title={localize("Change language")}>
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
