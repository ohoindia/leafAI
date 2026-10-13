import { useLocale } from "./locale";
import {
  fertilizerStore,
  fertilizerPackage,
  officerContacts,
  fertilizerDescription,
  officerDescription,
  farmerRegistry,
  farmerRegistryDescription,
  farmerRegistrySteps,
} from "../../common/services.js";

import { serviceIconPaths } from "../../common/service-icons.js";
import { calculatorCopy } from "../../common/calculators.js";

function ServiceHeading({ icon, children }) {
  return (
    <div className="service-heading">
      <span className={`service-icon service-icon-${icon}`} aria-hidden="true">
        {icon === "fertilizer" ? (
          <img src="/fertilizer-sale-icon.png" alt="" width="52" height="52" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={serviceIconPaths[icon]} />
          </svg>
        )}
      </span>
      <h3>{children}</h3>
    </div>
  );
}

export function Services({ onCalculator }) {
  const t = useLocale();
  const appUrl = /Android/i.test(navigator.userAgent)
    ? `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${fertilizerPackage};S.browser_fallback_url=${encodeURIComponent(fertilizerStore)};end`
    : fertilizerStore;
  return (
    <>
      <h2>{t("Services")}</h2>
      <p className="muted">{t("Useful agriculture services for farmers")}</p>
      <div className="service-calculator-row">
        {["fertilizer", "pesticide"].map(kind => <button key={kind} type="button" className="service-calculator-tile" onClick={() => onCalculator(kind)}>
          <span aria-hidden="true" className="calculator-tile-icon">{kind === "fertilizer" ? "🌱" : "🧴"}</span>
          <strong>{t(calculatorCopy[kind].title)}</strong>
          <span>{t("Open calculator")} →</span>
        </button>)}
      </div>
      <div className="service-calculator-row service-portal-row">
        <a className="service-calculator-tile service-portal-tile" href={appUrl} title={t(fertilizerDescription)}>
          <ServiceHeading icon="fertilizer">{t("Framework for Fertilizer Sale")}</ServiceHeading>
          <span className="service-card-action">{t("Open app / Install")} <span aria-hidden="true">→</span></span>
        </a>
        <a className="service-calculator-tile service-portal-tile" href={officerContacts} target="_blank" rel="noopener noreferrer" title={t(officerDescription)}>
          <ServiceHeading icon="officers">{t("Officers Contact")}</ServiceHeading>
          <span className="service-card-action">{t("Open officer contacts")} <span aria-hidden="true">↗</span></span>
        </a>
      </div>
      <a className="card service-card-link farmer-registry-service" href={farmerRegistry} target="_blank" rel="noopener noreferrer" aria-label={t("Get my Farmer ID")}>
        <ServiceHeading icon="farmerId">{t("Telangana Farmer ID")}</ServiceHeading>
        <p className="muted">{t("Agriculture Department, Telangana")}</p>
        <p>{t(farmerRegistryDescription)}</p>
        <ol className="farmer-registry-steps">
          {farmerRegistrySteps.map(step => <li key={step}>{t(step)}</li>)}
        </ol>
        <span className="service-card-action">
          {t("Get my Farmer ID")} <span aria-hidden="true">↗</span>
        </span>
        <p className="muted">{t("Keep your Aadhaar-linked phone ready. Aadhaar and OTP are entered only on the official portal.")}</p>
      </a>
    </>
  );
}
