import { useLocale } from "./locale";
import { fertilizerStore, fertilizerPackage, officerContacts, fertilizerDescription, officerDescription } from "../../common/services.js";

import { serviceIconPaths } from "../../common/service-icons.js";

function ServiceHeading({ icon, children }) {
  return <div className="service-heading">
    <span className={`service-icon service-icon-${icon}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={serviceIconPaths[icon]} /></svg>
    </span>
    <h3>{children}</h3>
  </div>;
}

export function Services() {
  const t = useLocale();
  const appUrl = /Android/i.test(navigator.userAgent)
    ? `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${fertilizerPackage};S.browser_fallback_url=${encodeURIComponent(fertilizerStore)};end`
    : fertilizerStore;
  return <>
    <h2>{t("Services")}</h2>
    <p className="muted">{t("Useful agriculture services for farmers")}</p>
    <section className="card">
      <ServiceHeading icon="fertilizer">{t("Framework for Fertilizer Sale")}</ServiceHeading>
      <p>{t(fertilizerDescription)}</p>
      <a className="primary service-link" href={appUrl}>{t("Open app / Install")}</a>
      <p className="muted">{t("Available on Android through Google Play.")}</p>
    </section>
    <section className="card">
      <ServiceHeading icon="officers">{t("Officers Contact")}</ServiceHeading>
      <p>{t(officerDescription)}</p>
      <a className="primary service-link" href={officerContacts} target="_blank" rel="noopener noreferrer">{t("Open officer contacts")}</a>
    </section>
  </>;
}
