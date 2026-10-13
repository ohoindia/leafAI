import { useState } from "react";
import { Image, Linking, Platform, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import * as IntentLauncher from "expo-intent-launcher";
import { useLocale } from "./locale";
import { Page, s } from "./ui";
import {
  fertilizerPackage,
  fertilizerStore,
  officerContacts,
  farmerRegistry,
  farmerRegistryDescription,
  farmerRegistrySteps,
} from "../../common/services.js";

import Svg, { Path } from "react-native-svg";
import { serviceIconPaths } from "../../common/service-icons.js";
import { calculatorCopy } from "../../common/calculators.js";

function ServiceHeading({
  icon,
  title,
  compact = false,
}: {
  icon: "fertilizer" | keyof typeof serviceIconPaths;
  title: string;
  compact?: boolean;
}) {
  return (
    <View style={{ flexDirection: compact ? "column" : "row", alignItems: compact ? "flex-start" : "center", gap: 12 }}>
      <View
        accessible={false}
        style={{
          width: compact ? 36 : 52,
          height: compact ? 36 : 52,
          borderRadius: 16,
          backgroundColor: icon === "fertilizer" ? "#e8f6ee" : "#edf7f0",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon === "fertilizer" ? (
          <Image
            source={require("../assets/fertilizer-sale-icon.png")}
            style={{ width: compact ? 36 : 52, height: compact ? 36 : 52, borderRadius: 10 }}
          />
        ) : (
          <Svg
            width={30}
            height={30}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#218653"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d={serviceIconPaths[icon]} />
          </Svg>
        )}
      </View>
      <Text style={[s.heading, { flexShrink: 1 }, compact && { fontSize: 17, lineHeight: 25 }]}>{title}</Text>
    </View>
  );
}

export function ServicesScreen() {
  const t = useLocale();
  const [message, setMessage] = useState("");
  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setMessage("Unable to open this service. Please try again.");
    }
  }
  async function fertilizer() {
    if (Platform.OS === "android") {
      try {
        IntentLauncher.openApplication(fertilizerPackage);
        return;
      } catch {
        /* An absent app falls back to its official store listing. */
      }
    }
    await open(fertilizerStore);
  }
  return (
    <Page title={t("Services")}>
      <Text style={s.body}>{t("Useful agriculture services for farmers")}</Text>
      <View style={{ flexDirection: "row", alignItems: "stretch", gap: 12 }}>
        {(["fertilizer", "pesticide"] as const).map(kind => <Pressable
          key={kind}
          accessibilityRole="button"
          accessibilityLabel={t(calculatorCopy[kind].title)}
          onPress={() => router.push(kind === "fertilizer" ? "/fertilizer-calculator" : "/pesticide-calculator")}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#d5e1d8", backgroundColor: pressed ? "#edf7f0" : "#fff", gap: 12 })}
        >
          <Text accessible={false} style={{ fontSize: 28 }}>{kind === "fertilizer" ? "🌱" : "🧴"}</Text>
          <Text style={[s.heading, { fontSize: 17, lineHeight: 25, flexShrink: 1 }]}>{t(calculatorCopy[kind].title)}</Text>
          <Text style={s.muted}>{t("Open calculator")} →</Text>
        </Pressable>)}
      </View>
      <View style={{ flexDirection: "row", alignItems: "stretch", gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Framework for Fertilizer Sale")} onPress={() => void fertilizer()}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#d5e1d8", backgroundColor: pressed ? "#edf7f0" : "#fff", gap: 12 })}>
          <ServiceHeading compact icon="fertilizer" title={t("Framework for Fertilizer Sale")} />
          <Text style={[s.muted, { marginTop: "auto" }]}>{t("Open app / Install")} →</Text>
        </Pressable>
        <Pressable accessibilityRole="link" accessibilityLabel={t("Officers Contact")} onPress={() => void open(officerContacts)}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#d5e1d8", backgroundColor: pressed ? "#edf7f0" : "#fff", gap: 12 })}>
          <ServiceHeading compact icon="officers" title={t("Officers Contact")} />
          <Text style={[s.muted, { marginTop: "auto" }]}>{t("Open officer contacts")} ↗</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="link" accessibilityLabel={t("Get my Farmer ID")} onPress={() => void open(farmerRegistry)}
        style={({ pressed }) => ({ padding: 20, borderRadius: 14, borderWidth: 1, borderColor: "#c9dfd0", backgroundColor: pressed ? "#e1f0e6" : "#f3faf5", gap: 12 })}>
        <ServiceHeading icon="farmerId" title={t("Telangana Farmer ID")} />
        <Text style={s.muted}>{t("Agriculture Department, Telangana")}</Text>
        <Text style={s.body}>{t(farmerRegistryDescription)}</Text>
        {farmerRegistrySteps.map((step, index) => <View key={step} style={{ flexDirection: "row", gap: 10 }}>
          <Text style={[s.body, { color: "#218653", fontWeight: "700" }]}>{index + 1}.</Text>
          <Text style={[s.body, { flex: 1 }]}>{t(step)}</Text>
        </View>)}
        <Text style={[s.body, { color: "#17673f", fontWeight: "600" }]}>{t("Get my Farmer ID")} ↗</Text>
        <Text style={s.muted}>{t("Keep your Aadhaar-linked phone ready. Aadhaar and OTP are entered only on the official portal.")}</Text>
      </Pressable>
      {!!message && (
        <Text accessibilityRole="alert" style={s.body}>
          {t(message)}
        </Text>
      )}
    </Page>
  );
}
