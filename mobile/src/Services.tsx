import { useState } from "react";
import { Image, Linking, Platform, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import * as IntentLauncher from "expo-intent-launcher";
import { useLocale } from "./locale";
import { Page, Card, Button, s } from "./ui";
import {
  fertilizerPackage,
  fertilizerStore,
  officerContacts,
  fertilizerDescription,
  officerDescription,
} from "../../common/services.js";

import Svg, { Path } from "react-native-svg";
import { serviceIconPaths } from "../../common/service-icons.js";
import { calculatorCopy } from "../../common/calculators.js";

function ServiceHeading({
  icon,
  title,
}: {
  icon: "fertilizer" | keyof typeof serviceIconPaths;
  title: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        accessible={false}
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: icon === "fertilizer" ? "#e8f6ee" : "#edf7f0",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon === "fertilizer" ? (
          <Image
            source={require("../assets/fertilizer-sale-icon.png")}
            style={{ width: 52, height: 52, borderRadius: 16 }}
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
      <Text style={[s.heading, { flex: 1 }]}>{title}</Text>
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
      <Card>
        <ServiceHeading
          icon="fertilizer"
          title={t("Framework for Fertilizer Sale")}
        />
        <Text style={s.body}>{t(fertilizerDescription)}</Text>
        <Button
          title={t("Open app / Install")}
          onPress={() => void fertilizer()}
        />
        <Text style={s.muted}>
          {t("Available on Android through Google Play.")}
        </Text>
      </Card>
      <Card>
        <ServiceHeading icon="officers" title={t("Officers Contact")} />
        <Text style={s.body}>{t(officerDescription)}</Text>
        <Button
          title={t("Open officer contacts")}
          onPress={() => void open(officerContacts)}
        />
      </Card>
      {!!message && (
        <Text accessibilityRole="alert" style={s.body}>
          {t(message)}
        </Text>
      )}
    </Page>
  );
}
