import { useState } from "react";
import { Image, Text } from "react-native";
import { Redirect } from "expo-router";
import { endpoints } from "../../../common/api.js";
import { analysisStatus, languages, screens } from "../../../common/content.js";
import { apiUrl } from "../api";
import { useLeafCare } from "../state";
import { Button, Card, Languages, Page, s } from "../ui";
function ResultPhoto() {
  const a = useLeafCare();
  const [failed, setFailed] = useState(false);
  return failed ? (
    <Text style={s.muted}>Photo unavailable</Text>
  ) : (
    <Image
      source={
        a.photo
          ? { uri: a.photo }
          : {
              uri: `${apiUrl}${endpoints.image(a.result!.id)}`,
              headers: { Authorization: `Bearer ${a.token}` },
            }
      }
      accessibilityLabel="Analyzed leaf"
      style={s.image}
      onError={() => setFailed(true)}
    />
  );
}
function Audit() {
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
    <Card title="Analysis details">
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <Text key={label} style={s.muted}>
            {label}: {value}
          </Text>
        ))}
    </Card>
  );
}
export function ResultScreen() {
  const a = useLeafCare();
  if (!a.result) return <Redirect href="/history" />;
  const out = a.result.translations?.[a.lang];
  return (
    <Page title={screens.result}>
      <ResultPhoto />
      <Card title={analysisStatus(a.result)}>
        <Text style={s.muted}>
          {a.result.status === "REVIEW_REQUIRED"
            ? "The image or confidence needs closer review. Consider a clearer photo."
            : "AI screening based on visible evidence."}
        </Text>
      </Card>
      {out ? (
        <>
          <Card title={a.result.condition}>
            <Text style={s.body}>
              Confidence: {Math.round(a.result.confidence * 100)}%
            </Text>
            <Text style={s.body}>Severity: {a.result.severity}</Text>
          </Card>
          <Card title="Summary">
            <Text style={s.body}>{out.summary}</Text>
          </Card>
          <Languages />
          <Button secondary title="Listen" onPress={() => a.go("voice")} />
          <Button title="View full analysis →" onPress={() => a.go("full")} />
          <Text style={s.muted}>{out.disclaimer}</Text>
        </>
      ) : (
        <Card
          title={
            a.result.status === "FAILED"
              ? "Analysis could not be completed"
              : "Result is not ready"
          }
        >
          <Button title="Try again" onPress={() => a.go("capture")} />
        </Card>
      )}
      <Audit />
    </Page>
  );
}
export function FullScreen() {
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
    <Page title={x.plant || screens.full}>
      <Text style={s.body}>
        {x.condition} · {analysisStatus(x)}
      </Text>
      <Languages />
      <Button
        title="Full analysis"
        secondary={resources}
        onPress={() => setResources(false)}
      />
      <Button
        title="Related resources"
        secondary={!resources}
        onPress={() => setResources(true)}
      />
      {resources ? (
        <>
          <Card title="Get local guidance">
            <Text style={s.body}>
              Share your photo and analysis with a local horticulturist or
              agricultural extension service, especially if symptoms spread.
            </Text>
            <Text style={s.muted}>
              Follow product labels and local guidance before using treatments.
            </Text>
          </Card>
          <Button
            secondary
            title="Open plant care tips"
            onPress={() => a.go("learn")}
          />
        </>
      ) : (
        <>
          {sections.map(([title, items]) => (
            <Card key={title} title={title}>
              {items?.map((text, i) => (
                <Text key={i} style={s.body}>
                  {i + 1}. {text}
                </Text>
              ))}
            </Card>
          ))}
          <Card title="When to consult an expert">
            <Text style={s.body}>
              {out?.when_to_consult_expert || x.when_to_consult_expert}
            </Text>
          </Card>
          <Text style={s.muted}>{out?.safety_note || x.safety_note}</Text>
          {a.lang !== "en" && !out?.treatment && (
            <Text style={s.muted}>
              Summary, symptoms and actions use your selected language.
              Additional guidance is provided in English.
            </Text>
          )}
        </>
      )}
      <Button secondary title="Voice assistant" onPress={() => a.go("voice")} />
    </Page>
  );
}
