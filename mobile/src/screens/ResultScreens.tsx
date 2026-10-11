import { useLocale } from "../locale";
import { useState } from "react";
import { Text } from "react-native";
import { Redirect } from "expo-router";
import { analysisStatus, languages, screens } from "../../../common/content.js";
import { useLeafCare } from "../state";
import { AnalysisPhoto, Button, Card, Languages, Page, s } from "../ui";
function ResultPhoto() {
  const a = useLeafCare();
  return <AnalysisPhoto id={a.result!.id} fallback={a.photo} />;
}
function Audit() {
  const localize = useLocale();
  const a = useLeafCare();
  const x = a.result!;
  const rows = [
    ["Plant", x.plant || x.provided_plant_name],
    ["Likely condition", x.condition],
    ["Date", x.created_at && new Date(x.created_at).toLocaleString()],
    ["Upload record", x.original_file_name],
    ["Model", x.model_name],
    ["Language", x.requested_language && languages[x.requested_language]],
    ["Location", x.plant_location],
    ["Provided plant", x.provided_plant_name],
    ["Status", x.status],
    ["Consent", x.consent_to_analyze ? "Provided" : "Not recorded"],
  ];
  return (
    <Card title={localize("Analysis details")}>
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <Text key={label} style={s.muted}>
            {localize(label)}: {value}
          </Text>
        ))}
    </Card>
  );
}
export function ResultScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  if (!a.result) return <Redirect href="/history" />;
  const out = a.result.translations?.[a.lang];
  return (
    <Page title={localize(screens.result)}>
      <ResultPhoto />
      <Card title={localize(analysisStatus(a.result))}>
        <Text style={s.muted}>
          {localize(
            a.result.status === "REVIEW_REQUIRED"
              ? "The image or confidence needs closer review. Consider a clearer photo."
              : "AI screening based on visible evidence.",
          )}
        </Text>
      </Card>
      {out ? (
        <>
          <Card title={localize(a.result.condition)}>
            <Text style={s.body}>
              {localize("Confidence:")}
              {Math.round(a.result.confidence * 100)}%
            </Text>
            <Text style={s.body}>
              {localize("Severity:")}
              {a.result.severity}
            </Text>
          </Card>
          <Card title={localize("Summary")}>
            <Text style={s.body}>{out.summary}</Text>
          </Card>
          <Languages />
          <Button
            secondary
            title={localize("Listen")}
            onPress={() => a.go("voice")}
          />
          <Button
            title={localize("View full analysis →")}
            onPress={() => a.go("full")}
          />
          <Text style={s.muted}>{out.disclaimer}</Text>
        </>
      ) : (
        <Card
          title={localize(
            a.result.status === "FAILED"
              ? "Analysis could not be completed"
              : "Result is not ready",
          )}
        >
          <Button
            title={localize("Try again")}
            onPress={() => a.go("capture")}
          />
        </Card>
      )}
      <Audit />
    </Page>
  );
}
export function FullScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  const [resources, setResources] = useState(false);
  if (!a.result) return <Redirect href="/history" />;
  const x = a.result;
  const out = x.translations?.[a.lang];
  const sections: [string, string[] | undefined][] = [
    ["Visible symptoms", out?.symptoms],
    ["Likely causes", out?.likely_causes || x.likely_causes],
    ["Immediate actions", out?.actions],
    ["Treatment options", out?.treatment || x.treatment],
    ["Prevention", out?.prevention || x.prevention],
  ];
  return (
    <Page title={localize(x.plant || screens.full)}>
      <Text style={s.body}>
        {x.condition} · {localize(analysisStatus(x))}
      </Text>
      <Languages />
      <Button
        title={localize("Full analysis")}
        secondary={resources}
        onPress={() => setResources(false)}
      />
      <Button
        title={localize("Related resources")}
        secondary={!resources}
        onPress={() => setResources(true)}
      />
      {resources ? (
        <>
          <Card title={localize("Get local guidance")}>
            <Text style={s.body}>
              {localize(
                "Share your photo and analysis with a local horticulturist or agricultural extension service, especially if symptoms spread.",
              )}
            </Text>
            <Text style={s.muted}>
              {localize(
                "Follow product labels and local guidance before using treatments.",
              )}
            </Text>
          </Card>
          <Button
            secondary
            title={localize("Open plant care tips")}
            onPress={() => a.go("learn")}
          />
        </>
      ) : (
        <>
          {sections.map(([title, items]) => (
            <Card key={title} title={localize(title)}>
              {items?.map((text, i) => (
                <Text key={i} style={s.body}>
                  {i + 1}. {localize(text)}
                </Text>
              ))}
            </Card>
          ))}
          <Card title={localize("When to consult an expert")}>
            <Text style={s.body}>
              {out?.when_to_consult_expert || x.when_to_consult_expert}
            </Text>
          </Card>
          <Text style={s.muted}>{out?.safety_note || x.safety_note}</Text>
          {a.lang !== "en" && !out?.treatment && (
            <Text style={s.muted}>
              {localize(
                "Summary, symptoms and actions use your selected language. Additional guidance is provided in English.",
              )}
            </Text>
          )}
        </>
      )}
      <Button
        secondary
        title={localize("Voice assistant")}
        onPress={() => a.go("voice")}
      />
    </Page>
  );
}
