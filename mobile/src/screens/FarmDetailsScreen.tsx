import { useState } from "react";
import { Text, View } from "react-native";
import { farmSections, type FarmDetails } from "../../../common/farm.js";
import { useLeafCare } from "../state";
import { Button, Card, Field, Page, s } from "../ui";
import { farmPresentation, farmPlaceholders, farmDisplayValue } from "../../../common/farm-presentation.js";

export function FarmDetailsScreen() {
  const a = useLeafCare();
  const [draft, setDraft] = useState<FarmDetails>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const details = a.user?.farmDetails || {};
  return <Page title="Farm and crops">
    <View style={{ backgroundColor: "#eaf7ff", padding: 22, borderRadius: 20, gap: 8 }}>
      <Text style={[s.small, { fontWeight: "700", letterSpacing: 1.5 }]}>YOUR FARM RECORD</Text>
      <Text style={s.heading}>{details.farmName || "Build your farm profile"}</Text>
      <Text style={s.muted}>{[details.village, details.district, details.state].filter(Boolean).join(", ") || "Keep your land and seasonal crop information in one place."}</Text>
      <Text style={s.small}>{farmSections.filter(section => section.fields.some(field => details[field.key]?.trim())).length} of {farmSections.length} sections started / All fields optional</Text>
    </View>
    {farmSections.map(section => {
      const meta = farmPresentation[section.title];
      const isExpanded = expanded[section.title];
      const saved = section.fields.filter(field => details[field.key]?.trim());
      return <Card key={section.title} title={section.title}>
      <Text style={s.muted}>{meta.description}</Text>
      {editing !== section.title && <>
        {saved.length ? saved.filter(field => meta.basic.includes(field.key) || isExpanded).map(field => <View key={field.key} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: "#edf2f6", gap: 3 }}>
          <Text style={s.muted}>{field.label}</Text>
          <Text style={s.body}>{farmDisplayValue(field, details)}</Text>
        </View>) : <View style={{ padding: 16, backgroundColor: "#f7fafc", borderRadius: 12, gap: 6 }}><Text style={s.body}>{meta.empty}</Text><Text style={s.muted}>No details added yet</Text></View>}
        {saved.some(field => !meta.basic.includes(field.key)) && <Button secondary title={isExpanded ? "Show less" : `View all ${saved.length} saved details`} onPress={() => setExpanded(v => ({ ...v, [section.title]: !v[section.title] }))} />}
        <Button secondary title={saved.length ? "Edit details" : "Add details"} disabled={a.busy || editing !== null} onPress={() => {
          setDraft(Object.fromEntries(section.fields.map(field => [field.key, details[field.key] || ""])));
          setEditing(section.title);
          setExpanded(v => ({ ...v, [section.title]: false }));
          a.setError("");
        }} />
      </>}
      {editing === section.title && <>
      {section.fields.filter(field => meta.basic.includes(field.key) || isExpanded).map(field => <View key={field.key} style={{ gap: 8 }}>
        <Text style={s.body}>{field.label}</Text>
        {field.options ? <>
          <Text style={s.muted}>{draft[field.key] || "Not specified"}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{["", ...field.options].map(option => <Button key={option} secondary={draft[field.key] !== option} title={option || "Not specified"} disabled={a.busy} onPress={() => setDraft(v => ({ ...v, [field.key]: option }))} />)}</View>
        </> : <Field accessibilityLabel={field.label} value={draft[field.key] || ""} onChangeText={value => setDraft(v => ({ ...v, [field.key]: value }))} editable={!a.busy} maxLength={field.type === "notes" ? 2000 : 300} multiline={field.type === "notes"} placeholder={field.type === "date" ? "YYYY-MM-DD" : farmPlaceholders[field.key] || field.label} keyboardType={["number", "ph", "latitude", "longitude"].includes(field.type) ? "numbers-and-punctuation" : "default"} />}
      </View>)}
      {section.fields.some(field => !meta.basic.includes(field.key)) && <Button secondary title={isExpanded ? "Hide additional fields" : `+ ${meta.extra}`} disabled={a.busy} onPress={() => setExpanded(v => ({ ...v, [section.title]: !v[section.title] }))} />}
      <Text style={s.muted}>Enter what you know. You can complete the rest later.</Text>
      <Button title={a.busy ? "Saving..." : "Save details"} disabled={a.busy} onPress={() => {
        void a.saveProfile(a.user?.fullName || "", { ...details, ...draft }).then(saved => {
          if (saved) { setEditing(null); setDraft({}); }
        });
      }} />
      <Button secondary title="Cancel" disabled={a.busy} onPress={() => { setEditing(null); setDraft({}); a.setError(""); }} />
      </>}
    </Card>;
    })}
  </Page>;
}
