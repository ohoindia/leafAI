import { useLocale } from "../locale";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { farmSections, type FarmDetails } from "../../../common/farm.js";
import { useLeafCare } from "../state";
import { Button, Card, Field, Page, s } from "../ui";
import {
  farmPresentation,
  farmPlaceholders,
  farmDisplayValue,
  farmSectionSummary,
} from "../../../common/farm-presentation.js";

export function FarmDetailsForm({
  farmId,
  embedded = false,
  creationOnly = false,
}: {
  farmId?: string;
  embedded?: boolean;
  creationOnly?: boolean;
}) {
  const localize = useLocale();
  const a = useLeafCare();
  const [draft, setDraft] = useState<FarmDetails>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(
    farmId || (creationOnly ? "choose" : null),
  );
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({});
  const [newCrop, setNewCrop] = useState(false);
  const farms = a.user?.farms || [];
  const farm =
    farms.find((f) => f.id === selected) ||
    (["new", "choose"].includes(selected || "") ? undefined : farms[0]);
  const details =
    farm?.details ||
    (["new", "choose"].includes(selected || "")
      ? {}
      : a.user?.farmDetails || {});
  const content = (
    <>
      {!embedded && (
        <Button
          secondary
          title={localize("Back to Farm")}
          onPress={() => a.go("farm")}
        />
      )}
      <Card
        title={localize(
          embedded
            ? "Crop actions"
            : creationOnly
              ? "Add a farm or crop"
              : "Your farms",
        )}
      >
        {creationOnly && (
          <Text style={s.muted}>
            {localize(
              "Choose an existing farm to enter a new crop, or add a new farm.",
            )}
          </Text>
        )}
        {!embedded &&
          farms.map((f) => (
            <Button
              key={f.id}
              secondary={f.id !== farm?.id}
              title={localize(f.details.farmName || "Unnamed farm")}
              disabled={a.busy || editing !== null}
              onPress={() => {
                setSelected(f.id);
                setNewCrop(creationOnly);
                if (creationOnly) {
                  setDraft(
                    Object.fromEntries(
                      farmSections
                        .find((s) => s.title === "Present crop")!
                        .fields.map((field) => [field.key, ""]),
                    ),
                  );
                  setEditing("Present crop");
                }
              }}
            />
          ))}
        {!embedded && (
          <Button
            secondary
            title={localize("Add a farm")}
            disabled={a.busy || editing !== null}
            onPress={() => {
              setSelected("new");
              setNewCrop(false);
              if (creationOnly) {
                setDraft({});
                setEditing("Farm details");
              }
            }}
          />
        )}
        {!creationOnly && (
          <Button
            title={localize("Start a new crop")}
            disabled={a.busy || editing !== null || !farm}
            onPress={() => {
              setNewCrop(true);
              setDraft(
                Object.fromEntries(
                  farmSections
                    .find((s) => s.title === "Present crop")!
                    .fields.map((f) => [f.key, ""]),
                ),
              );
              setEditing("Present crop");
            }}
          />
        )}
        {newCrop && (
          <Text style={s.muted}>
            {localize("Saving will keep the current crop in history.")}
          </Text>
        )}
      </Card>
      {selected !== "choose" && !embedded && (
        <View
          style={{
            backgroundColor: "#eaf7ff",
            padding: 22,
            borderRadius: 20,
            gap: 8,
          }}
        >
          <Text style={[s.small, { fontWeight: "700", letterSpacing: 1.5 }]}>
            {localize("YOUR FARM RECORD")}
          </Text>
          <Text style={s.heading}>
            {details.farmName || "Build your farm profile"}
          </Text>
          <Text style={s.muted}>
            {[details.village, details.district, details.state]
              .filter(Boolean)
              .join(", ") ||
              "Keep your land and seasonal crop information in one place."}
          </Text>
          <Text style={s.small}>
            {localize("Keep your farm and seasonal crop records up to date.")}
          </Text>
        </View>
      )}
      {selected !== "choose" &&
        [
          ...farmSections.filter((s) => s.title !== "Previous crop"),
          farmSections.find((s) => s.title === "Previous crop")!,
        ].map((section) => {
          const isHistory = section.title === "Previous crop";
          const sectionDetails: FarmDetails = isHistory ? {} : details;
          const meta = farmPresentation[section.title];
          const isExpanded = expanded[section.title];
          const saved = section.fields.filter((field) =>
            sectionDetails[field.key]?.trim(),
          );
          const summary = farmSectionSummary(
            section.title,
            details,
            farm?.crops,
          );
          const open = sectionsOpen[section.title] || editing === section.title;
          return (
            <Card key={section.title}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: !!open }}
                disabled={editing === section.title}
                onPress={() =>
                  setSectionsOpen((v) => ({
                    ...v,
                    [section.title]: !v[section.title],
                  }))
                }
                style={{ minHeight: 48, gap: 6, paddingVertical: 10 }}
              >
                <Text style={s.heading}>
                  {localize(open ? "?" : "+")}{" "}
                  {localize(
                    isHistory ? "Previous crop history" : section.title,
                  )}
                </Text>
                {summary && <Text style={s.muted}>{summary}</Text>}
              </Pressable>
              {open && (
                <>
                  {editing !== section.title && (
                    <>
                      {isHistory ? (
                        <View>
                          {farm?.crops.some(
                            (c) => c.status === "PREVIOUS",
                          ) ? null : (
                            <Text style={s.muted}>
                              {localize(
                                "No previous crops added. Add them whenever you have the details.",
                              )}
                            </Text>
                          )}
                          {farm?.crops
                            .filter((c) => c.status === "PREVIOUS")
                            .map((c) => (
                              <View key={c.id}>
                                <Text style={s.body}>
                                  {c.details.presentCrop || "Previous crop"} /{" "}
                                  {c.details.season ||
                                    c.details.harvestDate ||
                                    "Season not specified"}
                                </Text>
                                {farmSections
                                  .flatMap((s) => s.fields)
                                  .filter(
                                    (f) =>
                                      c.details[f.key] &&
                                      (!f.key.startsWith("previous") ||
                                        [
                                          "previousYield",
                                          "previousTreatment",
                                        ].includes(f.key)),
                                  )
                                  .map((f) => (
                                    <Text key={f.key} style={s.muted}>
                                      {localize(f.label)}:{" "}
                                      {farmDisplayValue(f, c.details)}
                                    </Text>
                                  ))}
                              </View>
                            ))}
                        </View>
                      ) : saved.length ? (
                        saved
                          .filter(
                            (field) =>
                              meta.basic.includes(field.key) || isExpanded,
                          )
                          .map((field) => (
                            <View
                              key={field.key}
                              style={{
                                paddingVertical: 8,
                                borderBottomWidth: 1,
                                borderColor: "#edf2f6",
                                gap: 3,
                              }}
                            >
                              <Text style={s.muted}>
                                {localize(field.label)}
                              </Text>
                              <Text style={s.body}>
                                {farmDisplayValue(field, sectionDetails)}
                              </Text>
                            </View>
                          ))
                      ) : (
                        <View
                          style={{
                            padding: 16,
                            backgroundColor: "#f7fafc",
                            borderRadius: 12,
                            gap: 6,
                          }}
                        >
                          <Text style={s.body}>{meta.empty}</Text>
                          <Text style={s.muted}>
                            {localize("No details added yet")}
                          </Text>
                        </View>
                      )}
                      {saved.some(
                        (field) => !meta.basic.includes(field.key),
                      ) && (
                        <Button
                          secondary
                          title={localize(
                            isExpanded ? "Show less" : "View more details",
                          )}
                          onPress={() =>
                            setExpanded((v) => ({
                              ...v,
                              [section.title]: !v[section.title],
                            }))
                          }
                        />
                      )}
                      <Button
                        secondary
                        title={localize(
                          isHistory
                            ? farm?.crops.some((c) => c.status === "PREVIOUS")
                              ? "Add more previous crops"
                              : "Add previous crop"
                            : saved.length
                              ? "Edit details"
                              : "Add details",
                        )}
                        disabled={a.busy || editing !== null}
                        onPress={() => {
                          setDraft(
                            Object.fromEntries(
                              section.fields.map((field) => [
                                field.key,
                                sectionDetails[field.key] || "",
                              ]),
                            ),
                          );
                          setEditing(section.title);
                          setExpanded((v) => ({
                            ...v,
                            [section.title]: false,
                          }));
                          a.setError("");
                        }}
                      />
                    </>
                  )}
                  {editing === section.title && (
                    <>
                      {section.fields
                        .filter(
                          (field) =>
                            meta.basic.includes(field.key) || isExpanded,
                        )
                        .map((field) => (
                          <View key={field.key} style={{ gap: 8 }}>
                            <Text style={s.body}>{localize(field.label)}</Text>
                            {field.options ? (
                              <>
                                <Text style={s.muted}>
                                  {draft[field.key] || "Not specified"}
                                </Text>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    gap: 6,
                                  }}
                                >
                                  {["", ...field.options].map((option) => (
                                    <Button
                                      key={option}
                                      secondary={draft[field.key] !== option}
                                      title={localize(
                                        option || "Not specified",
                                      )}
                                      disabled={a.busy}
                                      onPress={() =>
                                        setDraft((v) => ({
                                          ...v,
                                          [field.key]: option,
                                        }))
                                      }
                                    />
                                  ))}
                                </View>
                              </>
                            ) : (
                              <Field
                                accessibilityLabel={localize(field.label)}
                                value={draft[field.key] || ""}
                                onChangeText={(value) =>
                                  setDraft((v) => ({
                                    ...v,
                                    [field.key]: value,
                                  }))
                                }
                                editable={!a.busy}
                                maxLength={field.type === "notes" ? 2000 : 300}
                                multiline={field.type === "notes"}
                                placeholder={localize(
                                  field.type === "date"
                                    ? "YYYY-MM-DD"
                                    : farmPlaceholders[field.key] ||
                                        field.label,
                                )}
                                keyboardType={
                                  [
                                    "number",
                                    "ph",
                                    "latitude",
                                    "longitude",
                                  ].includes(field.type)
                                    ? "numbers-and-punctuation"
                                    : "default"
                                }
                              />
                            )}
                          </View>
                        ))}
                      {section.fields.some(
                        (field) => !meta.basic.includes(field.key),
                      ) && (
                        <Button
                          secondary
                          title={localize(
                            isExpanded
                              ? "Hide additional fields"
                              : `+ ${meta.extra}`,
                          )}
                          disabled={a.busy}
                          onPress={() =>
                            setExpanded((v) => ({
                              ...v,
                              [section.title]: !v[section.title],
                            }))
                          }
                        />
                      )}
                      <Text style={s.muted}>
                        {localize(
                          "Enter what you know. You can complete the rest later.",
                        )}
                      </Text>
                      <Button
                        title={localize(
                          a.busy
                            ? "Saving..."
                            : isHistory
                              ? "Save previous crop"
                              : "Save details",
                        )}
                        disabled={a.busy}
                        onPress={() => {
                          void a
                            .saveProfile(
                              a.user?.fullName || "",
                              isHistory
                                ? draft
                                : Object.fromEntries(
                                    Object.entries({
                                      ...details,
                                      ...draft,
                                    }).filter(
                                      ([key]) =>
                                        !key.startsWith("previous") &&
                                        key !== "residueManagement",
                                    ),
                                  ),
                              undefined,
                              selected || farm?.id,
                              newCrop,
                              isHistory,
                            )
                            .then((saved) => {
                              if (saved) {
                                setEditing(null);
                                setDraft({});
                                setNewCrop(false);
                                if (selected === "new") setSelected(null);
                                if (creationOnly) a.go("farm");
                              }
                            });
                        }}
                      />
                      <Button
                        secondary
                        title={localize("Cancel")}
                        disabled={a.busy}
                        onPress={() => {
                          setEditing(null);
                          setDraft({});
                          setNewCrop(false);
                          a.setError("");
                        }}
                      />
                    </>
                  )}
                </>
              )}
            </Card>
          );
        })}
    </>
  );
  return embedded ? (
    content
  ) : (
    <Page title={localize("Farm and crops")}>{content}</Page>
  );
}

export function FarmDetailsScreen() {
  return <FarmDetailsForm creationOnly />;
}
