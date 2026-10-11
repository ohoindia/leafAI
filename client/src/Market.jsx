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
import { CropImage } from "./CropImage";
import { cropCategories, categoryImages, cropDetails, groupCrops } from "./crops";
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
        <h2>{t("Market")}</h2>
        <p className="muted">{t("All prices in rupees per quintal (100 kg).")}</p>
      </header>
      <section className="card">
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
            <path d="M5 14h22v14H5z" fill="#e3efce" stroke="currentColor" strokeWidth="2" />
            <path d="M3 14l4-9h18l4 9Z" fill="#8cb65b" stroke="currentColor" strokeWidth="2" />
            <path d="M12 28V18h8v10M11 5l-1 9M21 5l1 9" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          {t("Local mandi prices")}
        </h3>
        <p>{t(mandiNote)}</p>
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
                onClick={() => { setCrop(key); setCategory("all"); }}
              >
                <span aria-hidden="true"><CropImage name={image} /></span>
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
                aria-pressed={category === name}
                onClick={() => { setCategory(name); setCrop("all"); }}
              >
                <span aria-hidden="true"><CropImage name={categoryImages[name]} /></span>
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
            <section className="crop-category" key={group.category}>
              <h4 className="crop-category-heading"><CropImage name={categoryImages[group.category]} />{t(group.category)} <span className="muted">({group.items.length})</span></h4>
              <div className="crop-grid">
          {group.items.map((r, i) => (
            <article className="market-row crop-market-row" key={i}>
              <CropImage name={r.commodity} />
              <div className="crop-price-details">
              <strong>
                {r.commodity} · {r.variety}
              </strong>
              <p>
                {r.market} · {t("Reported")}: {r.date}
              </p>
              <strong className="market-price">
                {t("Modal price")}: {price(r.modal)}
              </strong>
              <p>
                {t("Minimum")}: {price(r.min)} · {t("Maximum")}: {price(r.max)}
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
        <div className="market-section-header"><h3>{t("Government Minimum Support Prices (MSP)")}</h3><span className="market-season">{mspSeason}</span></div>
        <p>{t(mspNote)}</p>
        <p>
          <strong>
            {mspSeason} · ₹ / {t("quintal (100 kg)")}
          </strong>
        </p>
        <p>{t(riceNote)}</p>
        <div className="market-list">
          {groupCrops(mspPrices, ([name]) => name).map((group) => (
            <section className="crop-category" key={group.category}>
              <h4 className="crop-category-heading"><CropImage name={categoryImages[group.category]} />{t(group.category)}</h4>
              <div className="crop-grid">
          {group.items.map(([name, value]) => (
            <div className="market-row crop-market-row" key={name}>
              <CropImage name={name} />
              <div className="crop-price-details">
              <strong>{t(name)}</strong>
              <span className="market-price">{price(value)}</span>
              </div>
            </div>
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
