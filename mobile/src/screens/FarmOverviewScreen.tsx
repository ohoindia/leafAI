import { useLocale } from "../locale";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { overviewFarms, overviewCrops } from "../../../common/farm-overview.js";
import { FarmDetailsForm } from "./FarmDetailsScreen";
import { useLeafCare } from "../state";
import { Button, Card, Page, s } from "../ui";

function Disclosure({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const localize = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{ minHeight: 48, paddingVertical: 10, gap: 6 }}
      >
        <Text style={s.heading}>
          {localize(open ? "−" : "+")} {localize(title)}
        </Text>
        {subtitle && <Text style={s.muted}>{localize(subtitle)}</Text>}
      </Pressable>
      {open && children}
    </View>
  );
}

export function FarmOverviewScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  const farms = overviewFarms(a.user);
  const hasCrops = farms.some((farm) => overviewCrops(farm).length > 0);
  return (
    <Page title={localize("Farm and crops")}>
      <Button
        secondary
        title={localize("Back to profile")}
        onPress={() => a.go("profile")}
      />
      <Card title={localize("Your farms and crops")}>
        <Text style={s.muted}>
          {farms.length} {localize(farms.length === 1 ? "farm" : "farms")}
          {localize("saved. Expand a farm to view its land details and crops.")}
        </Text>
        <Button
          title={localize("Add New Crop")}
          onPress={() => a.go("farm-details")}
        />
      </Card>
      {!farms.length && (
        <Card title={localize("Start tracking your farm")}>
          <Text style={s.muted}>
            {localize(
              "Add your farm details and first crop for easy tracking of your land, growing seasons, and crop history.",
            )}
          </Text>
        </Card>
      )}
      {!!farms.length && !hasCrops && (
        <Card title={localize("Start tracking your crops")}>
          <Text style={s.muted}>
            {localize(
              "Your farm details are ready. Add your first crop to track its growth, season, and harvest in one place.",
            )}
          </Text>
          <Button
            title={localize("Add New Crop")}
            onPress={() => a.go("farm-details")}
          />
        </Card>
      )}
      {farms.map((farm) => (
        <Card key={farm.id}>
          <Disclosure
            title={localize(farm.details.farmName || "Unnamed farm")}
            subtitle={`${[farm.details.village, farm.details.district, farm.details.state].filter(Boolean).join(", ") || "Location not specified"}\n${farm.details.presentCrop || "No current crop"} · ${overviewCrops(farm).length} crop records`}
          >
            {!overviewCrops(farm).length && (
              <Text style={s.muted}>
                {localize(
                  "Add your first crop to this farm to track its growth, season, and harvest in one place.",
                )}
              </Text>
            )}
            <FarmDetailsForm
              farmId={farm.id === "profile-farm" ? undefined : farm.id}
              embedded
            />
          </Disclosure>
        </Card>
      ))}
    </Page>
  );
}
