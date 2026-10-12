import { useEffect, useRef, useState } from "react";
import { endpoints } from "../../common/api.js";
import {
  mandiNote,
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
    [crop, setCrop] = useState("all"),
    [category, setCategory] = useState("all");
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
  const records = (data?.records || []).filter(
    (r) =>
      (category === "all" || cropDetails(r.commodity).category === category) &&
      (crop === "all" ||
        (crop === "rice"
          ? /rice|paddy/i
          : crop === "cotton"
            ? /cotton/i
            : /chilli|chili|mirchi/i
        ).test(r.commodity)),
  );
  return (
    <div className="market-page">
      <header className="market-page-header">
        <div>
          <span className="market-eyebrow">
            {t("Crop prices & market insights")}
          </span>
          <h2>{t("Market")}</h2>
        </div>
        <p className="muted">
          {t("All prices in rupees per quintal (100 kg).")}
        </p>
      </header>
      <section className="card market-location">
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
      </section>
      <section className="card market-mandi">
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
          {t("Local mandi prices")}
        </h3>
        <p className="market-description">{t(mandiNote)}</p>
        {data?.location?.district && (
          <h4>
            {data.location.district}, {data.location.state}
          </h4>
        )}
        <fieldset className="mandi-crop-filters">
          <legend>{t("Crop")}</legend>
          <div className="mandi-crop-options">
            {[
              ["all", "All crops", "Crop plant"],
              ["rice", "Rice / Paddy", "Paddy"],
              ["cotton", "Cotton", "Cotton"],
              ["mirchi", "Mirchi (chilli)", "Chilli"],
            ].map(([key, label, image]) => (
              <button
                type="button"
                key={key}
                className="secondary mandi-crop-option"
                aria-pressed={crop === key}
                onClick={() => {
                  setCrop(key);
                  setCategory("all");
                }}
              >
                <span aria-hidden="true">
                  <CropSymbol name={image} />
                </span>
                <span>{t(label)}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="market-category-filters">
          <legend>{t("Browse by category")}</legend>
          <div className="market-category-options">
            {["all", ...cropCategories].map((name) => (
              <button
                type="button"
                key={name}
                className="market-category-option"
                data-category={name}
                aria-pressed={category === name}
                onClick={() => {
                  setCategory(name);
                  setCrop("all");
                }}
              >
                <span aria-hidden="true">
                  <CropSymbol name={categoryImages[name]} />
                </span>
                <span>{t(name === "all" ? "All categories" : name)}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {busy && <p role="status">{t("Loading market prices...")}</p>}
        {error && <p role="alert">{t(error)}</p>}
        {data && <p role="status">{t(data.message)}</p>}
        {data?.status === "ok" && !records.length && (
          <p>{t("No reports for this crop in the selected district.")}</p>
        )}
        <div className="market-list">
          {groupCrops(records, (r) => r.commodity).map((group) => (
            <section
              className="crop-category"
              data-category={group.category}
              key={group.category}
            >
              <h4 className="crop-category-heading">
                <span className="category-heading-icon">
                  <CropIcon name={categoryImages[group.category]} />
                </span>
                {t(group.category)}{" "}
                <span className="market-count">{group.items.length}</span>
              </h4>
              <div className="crop-grid">
                {group.items.map((r, i) => (
                  <article className="market-row crop-market-row" key={i}>
                    <CropSymbol name={t(r.commodity)} />
                    <div className="crop-price-details">
                      <strong>
                        {t(r.commodity)} · {t(r.variety)}
                      </strong>
                      <p>
                        {r.market} · {t("Reported")}: {r.date}
                      </p>
                      <strong className="market-price">
                        {t("Modal price")}: {price(r.modal, t)}
                      </strong>
                      <p>
                        {t("Minimum")}: {price(r.min, t)} · {t("Maximum")}:{" "}
                        {price(r.max, t)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        {data?.truncated && (
          <p>
            {t("Showing the first 1,000 reports. See the source for more.")}
          </p>
        )}
        <a href={marketSource} target="_blank" rel="noreferrer">
          AGMARKNET / data.gov.in
        </a>
      </section>
      <section className="card market-msp">
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
        <div className="market-list">
          {groupCrops(mspPrices, ([name]) => name).map((group) => (
            <section
              className="crop-category"
              data-category={group.category}
              key={group.category}
            >
              <h4 className="crop-category-heading">
                <span className="category-heading-icon">
                  <CropIcon name={categoryImages[group.category]} />
                </span>
                {t(group.category)}
              </h4>
              <div className="crop-grid">
                {group.items.map(([name, value]) => (
                  <article
                    className="market-row crop-market-row msp-price-card"
                    key={name}
                  >
                    <CropSymbol name={name} />
                    <div className="crop-price-details">
                      <strong>{t(name)}</strong>
                      <div className="msp-card-price">
                        <span className="market-price">
                          {price(value, t).split(" / ")[0]}
                        </span>
                        <span className="market-price-unit">
                          {t("per quintal (100 kg)")}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        <a href={mspSource} target="_blank" rel="noreferrer">
          {t("Official MSP notification · 13 May 2026")}
        </a>
      </section>
    </div>
  );
}
