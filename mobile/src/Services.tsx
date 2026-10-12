import { useState } from "react";
import { Image, Linking, Platform, Text, View } from "react-native";
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
          backgroundColor: icon === "fertilizer" ? "#e8f6ee" : "#eaf7ff",
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
            stroke="#007ca8"
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
