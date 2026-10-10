import { useState } from "react";
import { farmSections } from "../../common/farm.js";

import { farmPresentation, farmPlaceholders, farmDisplayValue } from "../../common/farm-presentation.js";

export function FarmDetails({ details = {}, busy, onSave }) {
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});
  return <div className="farm-sections">
    <section className="farm-overview"><span className="farm-eyebrow">YOUR FARM RECORD</span><h3>{details.farmName || "Build your farm profile"}</h3><p>{[details.village, details.district, details.state].filter(Boolean).join(", ") || "Keep your land and seasonal crop information in one place."}</p><div className="farm-status">{farmSections.filter(section => section.fields.some(field => details[field.key]?.trim())).length} of {farmSections.length} sections started / All fields optional</div></section>
    {farmSections.map(section => {
      const meta = farmPresentation[section.title];
      const isExpanded = expanded[section.title];
      const saved = section.fields.filter(field => details[field.key]?.trim());
      return <section className="card" key={section.title}>
        <div className="farm-section-heading"><div><h3>{section.title}</h3><p className="farm-description">{meta.description}</p></div>
          {editing !== section.title && <button className="text-button" disabled={busy || editing !== null} aria-label={`${saved.length ? "Edit" : "Add"} ${section.title.toLowerCase()}`} onClick={() => { setEditing(section.title); setExpanded(v => ({ ...v, [section.title]: false })); }}>{saved.length ? "Edit details" : "Add details"}</button>}
        </div>
        {editing === section.title ? <form onInvalidCapture={() => setExpanded(v => ({ ...v, [section.title]: true }))} onSubmit={async event => {
          event.preventDefault();
          if (busy) return;
          const values = Object.fromEntries(new FormData(event.currentTarget));
          if (await onSave({ ...details, ...values })) setEditing(null);
        }}>
          <div className="farm-field-grid">{section.fields.map(field => <label hidden={!meta.basic.includes(field.key) && !isExpanded} className={field.type === "notes" ? "farm-wide" : ""} key={field.key}>{field.label}
            {field.options ? <select name={field.key} defaultValue={details[field.key] || ""} disabled={busy}><option value="">Not specified</option>{field.options.map(option => <option key={option}>{option}</option>)}</select>
              : field.type === "notes" ? <textarea name={field.key} defaultValue={details[field.key] || ""} placeholder={farmPlaceholders[field.key] || "Add your observations"} maxLength={2000} disabled={busy} rows={3} />
                : <input name={field.key} defaultValue={details[field.key] || ""} disabled={busy} placeholder={farmPlaceholders[field.key] || field.label} maxLength={300} type={field.type === "date" ? "date" : ["number", "latitude", "longitude", "ph"].includes(field.type) ? "number" : "text"} step="any" min={field.type === "latitude" ? -90 : field.type === "longitude" ? -180 : field.type === "number" ? 0.000001 : field.type === "ph" ? 0 : undefined} max={field.type === "latitude" ? 90 : field.type === "longitude" ? 180 : field.type === "ph" ? 14 : field.type === "number" ? 1000000000 : undefined} />}
          </label>)}</div>
          {section.fields.some(field => !meta.basic.includes(field.key)) && <button type="button" className="farm-disclosure" aria-expanded={!!isExpanded} disabled={busy} onClick={() => setExpanded(v => ({ ...v, [section.title]: !v[section.title] }))}>{isExpanded ? "Hide additional fields" : `+ ${meta.extra}`}</button>}
          <small className="muted">Enter what you know. You can complete the rest later.</small>
          <div className="farm-section-actions"><button disabled={busy}>{busy ? "Saving..." : "Save details"}</button><button type="button" className="secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
        </form> : saved.length ? <dl className="farm-summary">{saved.filter(field => meta.basic.includes(field.key) || isExpanded).map(field => <div className={field.type === "notes" ? "farm-wide" : ""} key={field.key}><dt>{field.label}</dt><dd>{farmDisplayValue(field, details)}</dd></div>)}</dl> : <div className="farm-empty"><p>{meta.empty}</p><small>No details added yet</small></div>}
        {editing !== section.title && saved.some(field => !meta.basic.includes(field.key)) && <button className="farm-disclosure" aria-expanded={!!isExpanded} onClick={() => setExpanded(v => ({ ...v, [section.title]: !v[section.title] }))}>{isExpanded ? "Show less" : `View all ${saved.length} saved details`}</button>}
      </section>;
    })}
  </div>;
}
