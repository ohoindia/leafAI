import { useLocale } from "./locale";
import { useState } from "react";
import { farmSections } from "../../common/farm.js";

import {
  farmPresentation,
  farmPlaceholders,
  farmDisplayValue,
  farmSectionSummary,
} from "../../common/farm-presentation.js";

export function FarmDetails({
  details: fallback = {},
  farms = [],
  busy,
  onSave,
  embedded = false,
  creationOnly = false,
  onCreated,
}) {
  const localize = useLocale();
  const [selected, setSelected] = useState(creationOnly ? "choose" : null);
  const [newCrop, setNewCrop] = useState(false);
  const farm =
    farms.find((f) => f.id === selected) ||
    (["new", "choose"].includes(selected) ? null : farms[0]);
  const details =
    farm?.details || (["new", "choose"].includes(selected) ? {} : fallback);
  async function save(values, addPreviousCrop = false) {
    if (!addPreviousCrop)
      values = Object.fromEntries(
        Object.entries(values).filter(
          ([key]) => !key.startsWith("previous") && key !== "residueManagement",
        ),
      );
    const result = await onSave(
      values,
      selected || farm?.id,
      newCrop,
      addPreviousCrop,
    );
    if (result) {
      setNewCrop(false);
      if (selected === "new")
        setSelected(typeof result === "string" ? result : null);
      if (creationOnly) onCreated?.();
    }
    return result;
  }
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});
  return (
    <div className="farm-sections">
      {!embedded && (
        <section className="card">
          {creationOnly && (
            <>
              <h3>{localize("Add a farm or crop")}</h3>
              <p className="muted">
                {localize(
                  "Choose an existing farm to enter a new crop, or add a new farm.",
                )}
              </p>
            </>
          )}
          <label>
            {localize(creationOnly ? "Add crop to" : "Choose farm")}{" "}
            <select
              value={selected || farm?.id || "new"}
              disabled={busy || editing !== null}
              onChange={(e) => {
                const next = e.target.value;
                setSelected(next);
                setNewCrop(creationOnly && next !== "new");
                if (creationOnly)
                  setEditing(next === "new" ? "Farm details" : "Present crop");
              }}
            >
              {creationOnly && (
                <option value="choose" disabled>
                  {localize("Choose a farm or add a new farm")}
                </option>
              )}
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.details.farmName || "Unnamed farm"}
                </option>
              ))}
              <option value="new">{localize("Add a farm")}</option>
            </select>
          </label>
          {!creationOnly && (
            <button
              type="button"
              disabled={busy || editing !== null || !farm}
              onClick={() => {
                setNewCrop(true);
                setEditing("Present crop");
              }}
            >
              {localize("Start a new crop")}
            </button>
          )}
          {newCrop && (
            <p>
              {localize(
                "The current crop will be saved in history when you save the new crop.",
              )}
            </p>
          )}
        </section>
      )}
      {embedded && (
        <button
          type="button"
          disabled={busy || editing !== null || !farm}
          onClick={() => {
            setNewCrop(true);
            setEditing("Present crop");
          }}
        >
          {localize("Start a new crop")}
        </button>
      )}
      {embedded && newCrop && (
        <p>
          {localize(
            "The current crop will be saved in history when you save the new crop.",
          )}
        </p>
      )}
      {selected !== "choose" && !embedded && (
        <section className="farm-overview">
          <span className="farm-eyebrow">{localize("YOUR FARM RECORD")}</span>
          <h3>{details.farmName || "Build your farm profile"}</h3>
          <p>
            {[details.village, details.district, details.state]
              .filter(Boolean)
              .join(", ") ||
              "Keep your land and seasonal crop information in one place."}
          </p>
          <div className="farm-status">
            {localize("Keep your farm and seasonal crop records up to date.")}
          </div>
        </section>
      )}
      {selected !== "choose" &&
        [
          ...farmSections.filter((s) => s.title !== "Previous crop"),
          farmSections.find((s) => s.title === "Previous crop"),
        ].map((section) => {
          const isHistory = section.title === "Previous crop";
          const sectionDetails = isHistory ? {} : details;
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
          return (
            <details
              className="card farm-accordion"
              key={section.title}
              open={editing === section.title ? true : undefined}
            >
              <summary>
                <strong>
                  {localize(
                    isHistory ? "Previous crop history" : section.title,
                  )}
                </strong>
                {summary && <span className="muted">{summary}</span>}
              </summary>
              <div className="farm-section-heading">
                {editing !== section.title && (
                  <button
                    className="text-button"
                    disabled={busy || editing !== null}
                    aria-label={localize(
                      `${saved.length ? "Edit" : "Add"} ${section.title.toLowerCase()}`,
                    )}
                    onClick={() => {
                      setEditing(section.title);
                      setExpanded((v) => ({ ...v, [section.title]: false }));
                    }}
                  >
                    {isHistory
                      ? farm?.crops?.some((c) => c.status === "PREVIOUS")
                        ? "Add more previous crops"
                        : "Add previous crop"
                      : saved.length
                        ? "Edit details"
                        : "Add details"}
                  </button>
                )}
              </div>
              {editing === section.title ? (
                <form
                  onInvalidCapture={() =>
                    setExpanded((v) => ({ ...v, [section.title]: true }))
                  }
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (busy) return;
                    const values = Object.fromEntries(
                      new FormData(event.currentTarget),
                    );
                    if (
                      await save(
                        isHistory ? values : { ...details, ...values },
                        isHistory,
                      )
                    )
                      setEditing(null);
                  }}
                >
                  <div className="farm-field-grid">
                    {section.fields.map((field) => (
                      <label
                        hidden={!meta.basic.includes(field.key) && !isExpanded}
                        className={field.type === "notes" ? "farm-wide" : ""}
                        key={field.key}
                      >
                        {localize(field.label)}
                        {field.options ? (
                          <select
                            name={field.key}
                            defaultValue={
                              newCrop && section.title === "Present crop"
                                ? ""
                                : sectionDetails[field.key] || ""
                            }
                            disabled={busy}
                          >
                            <option value="">
                              {localize("Not specified")}
                            </option>
                            {field.options.map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        ) : field.type === "notes" ? (
                          <textarea
                            name={field.key}
                            defaultValue={
                              newCrop && section.title === "Present crop"
                                ? ""
                                : sectionDetails[field.key] || ""
                            }
                            placeholder={localize(
                              farmPlaceholders[field.key] ||
                                "Add your observations",
                            )}
                            maxLength={2000}
                            disabled={busy}
                            rows={3}
                          />
                        ) : (
                          <input
                            name={field.key}
                            defaultValue={
                              newCrop && section.title === "Present crop"
                                ? ""
                                : sectionDetails[field.key] || ""
                            }
                            disabled={busy}
                            placeholder={localize(
                              farmPlaceholders[field.key] || field.label,
                            )}
                            maxLength={300}
                            type={
                              field.type === "date"
                                ? "date"
                                : [
                                      "number",
                                      "latitude",
                                      "longitude",
                                      "ph",
                                    ].includes(field.type)
                                  ? "number"
                                  : "text"
                            }
                            step="any"
                            min={
                              field.type === "latitude"
                                ? -90
                                : field.type === "longitude"
                                  ? -180
                                  : field.type === "number"
                                    ? 0.000001
                                    : field.type === "ph"
                                      ? 0
                                      : undefined
                            }
                            max={
                              field.type === "latitude"
                                ? 90
                                : field.type === "longitude"
                                  ? 180
                                  : field.type === "ph"
                                    ? 14
                                    : field.type === "number"
                                      ? 1000000000
                                      : undefined
                            }
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  {section.fields.some(
                    (field) => !meta.basic.includes(field.key),
                  ) && (
                    <button
                      type="button"
                      className="farm-disclosure"
                      aria-expanded={!!isExpanded}
                      disabled={busy}
                      onClick={() =>
                        setExpanded((v) => ({
                          ...v,
                          [section.title]: !v[section.title],
                        }))
                      }
                    >
                      {localize(
                        isExpanded
                          ? "Hide additional fields"
                          : `+ ${meta.extra}`,
                      )}
                    </button>
                  )}
                  <small className="muted">
                    {localize(
                      "Enter what you know. You can complete the rest later.",
                    )}
                  </small>
                  <div className="farm-section-actions">
                    <button disabled={busy}>
                      {localize(
                        busy
                          ? "Saving..."
                          : isHistory
                            ? "Save previous crop"
                            : "Save details",
                      )}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditing(null);
                        setNewCrop(false);
                      }}
                    >
                      {localize("Cancel")}
                    </button>
                  </div>
                </form>
              ) : isHistory ? (
                <div>
                  {farm?.crops?.some((c) => c.status === "PREVIOUS") ? null : (
                    <p className="muted">
                      {localize(
                        "No previous crops added. Add them whenever you have the details.",
                      )}
                    </p>
                  )}
                  {farm?.crops
                    ?.filter((c) => c.status === "PREVIOUS")
                    .map((c) => (
                      <details key={c.id}>
                        <summary>
                          {c.details.presentCrop || "Previous crop"} /{" "}
                          {c.details.season ||
                            c.details.harvestDate ||
                            "Season not specified"}
                        </summary>
                        <dl>
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
                              <div key={f.key}>
                                <dt>{localize(f.label)}</dt>
                                <dd>{farmDisplayValue(f, c.details)}</dd>
                              </div>
                            ))}
                        </dl>
                      </details>
                    ))}
                </div>
              ) : saved.length ? (
                <dl className="farm-summary">
                  {saved
                    .filter(
                      (field) => meta.basic.includes(field.key) || isExpanded,
                    )
                    .map((field) => (
                      <div
                        className={field.type === "notes" ? "farm-wide" : ""}
                        key={field.key}
                      >
                        <dt>{localize(field.label)}</dt>
                        <dd>{farmDisplayValue(field, sectionDetails)}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <div className="farm-empty">
                  <p>{meta.empty}</p>
                  <small>{localize("No details added yet")}</small>
                </div>
              )}
              {editing !== section.title &&
                saved.some((field) => !meta.basic.includes(field.key)) && (
                  <button
                    className="farm-disclosure"
                    aria-expanded={!!isExpanded}
                    onClick={() =>
                      setExpanded((v) => ({
                        ...v,
                        [section.title]: !v[section.title],
                      }))
                    }
                  >
                    {localize(isExpanded ? "Show less" : "View more details")}
                  </button>
                )}
            </details>
          );
        })}
    </div>
  );
}
