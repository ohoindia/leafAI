import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { overviewFarms, overviewCrops } from "../../../common/farm-overview.js";
import { FarmDetailsForm } from "./FarmDetailsScreen";
import { useLeafCare } from "../state";
import { Button, Card, Page, s } from "../ui";

function Disclosure({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 12 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 48, paddingVertical: 10, gap: 6 }}>
      <Text style={s.heading}>{open ? "−" : "+"} {title}</Text>
      {subtitle && <Text style={s.muted}>{subtitle}</Text>}
    </Pressable>
    {open && children}
  </View>;
}

export function FarmOverviewScreen() {
  const a = useLeafCare();
  const farms = overviewFarms(a.user);
  const hasCrops = farms.some(farm => overviewCrops(farm).length > 0);
  return <Page title="Farm and crops">
    <Card title="Your farms and crops">
      <Text style={s.muted}>{farms.length} {farms.length === 1 ? "farm" : "farms"} saved. Expand a farm to view its land details and crops.</Text>
      <Button title="Add New Crop" onPress={() => a.go("farm-details")} />
    </Card>
    {!farms.length && <Card title="Start tracking your farm"><Text style={s.muted}>Add your farm details and first crop for easy tracking of your land, growing seasons, and crop history.</Text></Card>}
    {!!farms.length && !hasCrops && <Card title="Start tracking your crops"><Text style={s.muted}>Your farm details are ready. Add your first crop to track its growth, season, and harvest in one place.</Text><Button title="Add New Crop" onPress={() => a.go("farm-details")} /></Card>}
    {farms.map(farm => <Card key={farm.id}>
      <Disclosure title={farm.details.farmName || "Unnamed farm"} subtitle={`${[farm.details.village, farm.details.district, farm.details.state].filter(Boolean).join(", ") || "Location not specified"}\n${farm.details.presentCrop || "No current crop"} · ${overviewCrops(farm).length} crop records`}>
        {!overviewCrops(farm).length && <Text style={s.muted}>Add your first crop to this farm to track its growth, season, and harvest in one place.</Text>}
        <FarmDetailsForm farmId={farm.id === "profile-farm" ? undefined : farm.id} embedded />
      </Disclosure>
    </Card>)}
  </Page>;
}
