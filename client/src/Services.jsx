import { useState } from "react";
import { useLocale } from "./locale";
import { fertilizerStore, fertilizerPackage, officerContacts, fertilizerDescription, officerDescription, locationNote, resolveServiceLocation } from "../../common/services.js";

export function Services() {
  const t = useLocale();
  const [place, setPlace] = useState({ district: "", mandal: "", cluster: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function locate() {
    setBusy(true); setMessage("");
    try {
      if (!navigator.geolocation) throw Error("Location is unavailable. Enter your details manually.");
      const p = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15000 }));
      setPlace(await resolveServiceLocation(p.coords.latitude, p.coords.longitude));
    } catch { setMessage("Could not detect your location. Enter your district and mandal manually."); }
    finally { setBusy(false); }
  }
  const appUrl = /Android/i.test(navigator.userAgent)
    ? `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${fertilizerPackage};S.browser_fallback_url=${encodeURIComponent(fertilizerStore)};end`
    : fertilizerStore;
  return <>
    <h2>{t("Services")}</h2>
    <p className="muted">{t("Useful agriculture services for farmers")}</p>
    <section className="card">
      <h3>{t("Framework for Fertilizer Sale")}</h3>
      <p>{t(fertilizerDescription)}</p>
      <a className="primary service-link" href={appUrl}>{t("Open app / Install")}</a>
      <p className="muted">{t("Available on Android through Google Play.")}</p>
    </section>
    <section className="card">
      <h3>{t("Officers Contact")}</h3><p>{t(officerDescription)}</p>
      <button className="outline" disabled={busy} onClick={locate}>{t(busy ? "Finding location…" : "Use my location")}</button>
      <div className="service-fields">{Object.keys(place).map(key => <label key={key}>{t(key[0].toUpperCase() + key.slice(1))}<input value={place[key]} onChange={e => setPlace({ ...place, [key]: e.target.value })} /></label>)}</div>
      <p className="muted">{t(locationNote)}</p>
      <button className="outline" disabled={!Object.values(place).some(Boolean)} onClick={async () => {
        try { await navigator.clipboard.writeText(Object.values(place).filter(Boolean).join(", ")); setMessage("Location copied. Use it in the contact directory."); }
        catch { setMessage("Could not copy. Use the location shown above."); }
      }}>{t("Copy location")}</button>
      <a className="primary service-link" href={officerContacts} target="_blank" rel="noopener noreferrer">{t("Open officer contacts")}</a>
      {!!message && <p role="status">{t(message)}</p>}
    </section>
  </>;
}
