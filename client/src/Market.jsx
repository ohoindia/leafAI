import { useEffect, useRef, useState } from "react";
import { endpoints } from "../../common/api.js";
import {
  mspNote,
  riceNote,
  mspPrices,
  mspSeason,
  marketSource,
  mspSource,
  price,
} from "../../common/market.js";
import { useLocale } from "./locale";
import { CropIcon, CropSymbol } from "./CropIcon";
import {
  cropCategories,
  categoryImages,
  cropDetails,
  groupCrops,
} from "./crops";
export function Market({ api }) {
  const t = useLocale(),
    [data, setData] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [state, setState] = useState(""),
    [district, setDistrict] = useState(""),
    [category, setCategory] = useState("Cereals & Millets"),
    [mspCategory, setMspCategory] = useState("Cereals & Millets");
  const sequence = useRef(0);
  async function load(params = "") {
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    setData(null);
    try {
      const result = await api(endpoints.market + params);
      if (id === sequence.current) setData(result);
    } catch (e) {
      if (id === sequence.current) setError(e.message);
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    load();
    return () => {
      sequence.current++;
    };
  }, []);
  function locate() {
    if (!navigator.geolocation) {
      setError("Location is unavailable. Enter your state and district.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) =>
        load(`?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}`),
      () => {
        setBusy(false);
        setError("Allow location access or enter your state and district.");
      },
      { timeout: 10000 },
    );
  }
  const [tab, setTab] = useState("mandi");
  const [showLocation, setShowLocation] = useState(false);
  const mandiGroups = groupCrops(data?.records || [], r => r.commodity);
  const mspGroups = groupCrops(mspPrices, ([name]) => name);
  const records = (data?.records || []).filter(r => cropDetails(r.commodity).category === category);
  const supportPrices = mspPrices.filter(([name]) => cropDetails(name).category === mspCategory);
  return (
    <div className="market-page">
      <h2>{t("Mandi prices")}</h2>
      <div className="mandi-tabs" role="group" aria-label={t("Price type")}>
        {[["mandi", "Mandi prices"], ["msp", "MSP"]].map(([key, label]) => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{t(label)}</button>)}
      </div>
      {tab === "mandi" && <>
      <button className="mandi-location-toggle" aria-expanded={showLocation} onClick={() => setShowLocation(!showLocation)}>
        <span>{data?.location?.district ? data.location.district + ", " + data.location.state : t("Your market location")}</span><span>{t("Change")} ›</span>
      </button>
      {showLocation && <section className="market-location">
        <h3>{t("Your market location")}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(
              "?" +
                new URLSearchParams({
                  state: state.trim(),
                  district: district.trim(),
                }),
            );
          }}
        >
          <label>
            {t("State")}
            <input
              required
              minLength={2}
              maxLength={100}
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Telangana"
            />
          </label>
          <label>
            {t("District")}
            <input
              required
              minLength={2}
              maxLength={100}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Warangal"
            />
          </label>
          <button disabled={busy}>{t("Load prices")}</button>
        </form>
        <div className="market-actions">
          <button className="secondary" disabled={busy} onClick={locate}>
            {t("Use my location")}
          </button>
          <button className="secondary" disabled={busy} onClick={() => load()}>
            {t("Saved farm")}
          </button>
        </div>
      </section>}
      <section className="market-mandi">
        <h3 className="mandi-heading">
          <svg viewBox="0 0 32 32" aria-hidden="true" className="mandi-icon">
            <path
              d="M5 14h22v14H5z"
              fill="#d9edf7"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M3 14l4-9h18l4 9Z"
              fill="#73b7d1"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 28V18h8v10M11 5l-1 9M21 5l1 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          {t("My crops")}
        </h3>
        <p className="market-description">{t("All prices in rupees per quintal (100 kg).")}</p>
        {busy && <p role="status">{t("Loading market prices...")}</p>}
        {error && <p role="alert">{t(error)}</p>}
        {data && <p role="status">{t(data.message)}</p>}
        {data?.status === "ok" && !records.length && (
          <p>{t("No reports for this crop in the selected district.")}</p>
        )}
        <CategoryBrowser categories={cropCategories} selected={category} onSelect={setCategory} groups={mandiGroups}>
          <h4>{t(category)}</h4>
          <div className="price-tile-grid">
            {records.map((r, i) => <article className="price-tile" key={r.commodity + r.market + i}>
              <CropSymbol name={r.commodity} />
              <strong>{t(r.commodity)}</strong>
              <small>{t(r.variety)}</small>
              <strong className="tile-price">{price(r.modal, t).split(" / ")[0]}</strong>
              <small>{t("per quintal (100 kg)")}</small>
              <small>{r.market} · {r.date}</small>
              <small>{t("Minimum")}: {price(r.min, t).split(" / ")[0]}</small>
              <small>{t("Maximum")}: {price(r.max, t).split(" / ")[0]}</small>
            </article>)}
          </div>
        </CategoryBrowser>
        {data?.truncated && (
          <p>
            {t("Showing the first 1,000 reports. See the source for more.")}
          </p>
        )}
        <a href={marketSource} target="_blank" rel="noreferrer">
          AGMARKNET / data.gov.in
        </a>
      </section>
      </>}
      {tab === "msp" && <section className="market-msp">
        <div className="market-section-header">
          <h3>{t("Government Minimum Support Prices (MSP)")}</h3>
          <span className="market-season">{t(mspSeason)}</span>
        </div>
        <p className="market-description">
          {t("Government support prices for the current kharif season.")}
        </p>
        <details className="market-explainer">
          <summary>{t("How MSP works")}</summary>
          <p>{t(mspNote)}</p>
          <p>{t(riceNote)}</p>
        </details>
        <CategoryBrowser categories={mspGroups.map(g => g.category)} selected={mspCategory} onSelect={setMspCategory} groups={mspGroups}>
          <h4>{t(mspCategory)}</h4>
          <div className="price-tile-grid">
            {supportPrices.map(([name, value]) => <article className="price-tile" key={name}>
              <CropSymbol name={name} />
              <strong>{t(name)}</strong>
              <strong className="tile-price">{price(value, t).split(" / ")[0]}</strong>
              <small>{t("per quintal (100 kg)")}</small>
            </article>)}
          </div>
        </CategoryBrowser>
        <a href={mspSource} target="_blank" rel="noreferrer">
          {t("Official MSP notification · 13 May 2026")}
        </a>
      </section>}
    </div>
  );
}

function CategoryBrowser({ categories, groups, selected, onSelect, children }) {
  const t = useLocale();
  return <div className="category-browser">
    <aside className="category-rail" tabIndex={0} aria-label={t("Browse by category")}>
      {categories.map(name => <button key={name} aria-pressed={selected === name} onClick={() => onSelect(name)}>
        <CropIcon name={categoryImages[name]} />
        <span>{t(name)}</span>
        <small>{groups.find(g => g.category === name)?.items.length || 0}</small>
      </button>)}
    </aside>
    <section key={selected} className="category-results" tabIndex={0} aria-label={t(selected)} aria-live="polite">{children}</section>
  </div>;
}
