import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { endpoints } from "../../common/api.js";
import {
  mspNote,
  riceNote,
  mspPrices,
  mspSeason,
  marketSource,
  mspSource,
  price,
  groupMarkets,
  groupCommodityPrices,
  marketDate,
  priceChange,
  mergeMarketRecords,
  commodityKey,
} from "../../common/market.js";
import { useLocale } from "./locale";
import "./Market.css";
import { CropIcon, CropSymbol } from "./CropIcon";
import { categoryImages, cropDetails, groupCrops } from "./crops";
export function Market({ api }) {
  const t = useLocale(),
    [data, setData] = useState(null),
    [overview, setOverview] = useState(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [state, setState] = useState(""),
    [district, setDistrict] = useState(""),
    [selectedMandi, setSelectedMandi] = useState(""),
    [search, setSearch] = useState(""),
    [recentCrop, setRecentCrop] = useState(""),
    [loadedCrop, setLoadedCrop] = useState(""),
    [cropOptions, setCropOptions] = useState([]),
    [mspCategory, setMspCategory] = useState("Cereals & Millets");
  const sequence = useRef(0);
  const lastParams = useRef("");
  async function load(params = "", append = false, crop = recentCrop, preserveData = false) {
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    if (!append && !preserveData) {
      setData(null);
      setOverview(null);
      setSelectedMandi("");
    }
    try {
      const query = new URLSearchParams(params.replace(/^\?/, ""));
      query.set("radiusKm", "200");
      if (crop) query.set("recentCrop", crop);
      else query.delete("recentCrop");
      lastParams.current = query.toString();
      const result = await api(endpoints.market + "?" + query);
      if (id === sequence.current) {
        if (!preserveData && !append) setOverview(result);
        setLoadedCrop(crop);
        setCropOptions((previous) => [
          ...previous,
          ...(result.supportedRecentCrops || []),
          ...result.records.map((record) => record.commodity),
        ].filter((name, index, names) =>
          names.findIndex((candidate) => commodityKey(candidate) === commodityKey(name)) === index,
        ));
        setData((previous) => {
          if (!append) return result;
          const records = mergeMarketRecords(
            previous?.records || [],
            result.records,
          );
          return {
            ...result,
            records,
            status: records.length ? "ok" : result.status,
            message: result.records.length
              ? result.message
              : previous?.message || result.message,
          };
        });
      }
    } catch (e) {
      if (id === sequence.current) setError(e.message);
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }
  function chooseCrop(crop) {
    if (crop === recentCrop) return;
    setRecentCrop(crop);
    setSearch("");
    const query = new URLSearchParams(lastParams.current);
    query.delete("recentOffset");
    load("?" + query, false, crop, true);
  }
  function loadMore() {
    const query = new URLSearchParams(lastParams.current);
    query.set("recentOffset", String(data.recentNextOffset));
    load("?" + query, true);
  }
  useEffect(() => {
    locate();
    return () => {
      sequence.current++;
    };
  }, []);
  function locate() {
    const id = ++sequence.current;
    setError("");
    if (!navigator.geolocation) {
      setBusy(false);
      setShowLocation(true);
      setError("Location is unavailable. Enter your state and district.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (id !== sequence.current) return;
        load(`?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}`);
      },
      () => {
        if (id !== sequence.current) return;
        setBusy(false);
        setShowLocation(true);
        setError("Allow location access or enter your state and district.");
      },
      { timeout: 10000, maximumAge: 0 },
    );
  }
  const [tab, setTab] = useState("mandi");
  const [showLocation, setShowLocation] = useState(false);
  const mspGroups = groupCrops(mspPrices, ([name]) => name);
  const markets = groupMarkets(overview?.records || []);
  const filteredMarkets = groupMarkets(data?.records || [])
    .filter((g) => !selectedMandi || g.key === selectedMandi)
    .map((g) => ({
      ...g,
      records: g.records.filter(
        (r) =>
          (!loadedCrop ||
            commodityKey(r.commodity) === commodityKey(loadedCrop)) &&
          [r.commodity, r.variety, r.market].some((value) =>
            String(value).toLowerCase().includes(search.trim().toLowerCase()),
          ),
      ),
    }))
    .filter((g) => g.records.length);
  const records = filteredMarkets.flatMap((g) => g.records);
  const commodityGroups = groupCommodityPrices(records);
  const supportPrices = mspPrices.filter(
    ([name]) => cropDetails(name).category === mspCategory,
  );
  return (
    <div className="market-page">
      <h2>{t("Mandi prices")}</h2>
      <div className="mandi-tabs" role="group" aria-label={t("Price type")}>
        {[
          ["mandi", "Mandi prices"],
          ["msp", "MSP"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {t(label)}
          </button>
        ))}
      </div>
      {tab === "mandi" && (
        <>
          <p>{t("Mandis within 200 km · all states")}</p>
          <button
            className="secondary nearby-location-button"
            disabled={busy}
            onClick={locate}
          >
            {t("Use my location")}
          </button>
          <button
            className="mandi-location-toggle"
            aria-expanded={showLocation}
            onClick={() => setShowLocation(!showLocation)}
          >
            <span>
              {overview?.location?.district
                ? overview.location.district + ", " + overview.location.state
                : overview?.location?.nearbyTown
                  ? t("Near") +
                    " " +
                    overview.location.nearbyTown.town +
                    ", " +
                    overview.location.nearbyTown.state
                  : t("Your market location")}
            </span>
            <span>{t("Change")} ›</span>
          </button>
          {showLocation && (
            <section className="market-location">
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
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => load()}
                >
                  {t("Saved farm")}
                </button>
              </div>
            </section>
          )}
          <section className="market-mandi">
            <h3 className="mandi-heading">
              <svg
                viewBox="0 0 32 32"
                aria-hidden="true"
                className="mandi-icon"
              >
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
              {t("Nearby mandi reports")}
            </h3>
            <p className="market-description">
              {t("All prices in rupees per quintal (100 kg).")}
            </p>
            {overview?.radiusKm && (
              <details className="mandi-explanation">
                <summary>{t("About these prices")}</summary>
                <p>
                  {t(
                    "Approximate straight-line distances to market towns, not driving distances.",
                  )}
                </p>
                {overview?.originApproximate && (
                  <p>
                    {t(
                      "Using your district town as the centre. Use my location for a more accurate search.",
                    )}
                  </p>
                )}
                {!!overview?.unresolvedMarkets && (
                  <p>
                    {t(
                      "Some reported markets could not be located and are excluded.",
                    )}
                  </p>
                )}
                {!!overview?.supportedRecentCrops?.length && (
                  <p>
                    {t(
                      "Recent reports cover common crops. Check the date shown for each price.",
                    )}
                  </p>
                )}
              </details>
            )}
            {overview?.recentPricesIncomplete && (
              <small>
                {t("Some recent prices could not be loaded. Please retry.")}
              </small>
            )}
            {!!markets.length && (
              <details className="mandi-filters">
                <summary>{t("Filter mandis")}</summary>
                <label className="mandi-search">
                  {t("Search crops or mandis")}
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("Search crops or mandis")}
                  />
                </label>
                <div
                  className="nearby-mandi-selector"
                  role="group"
                  aria-label={t("Choose a mandi")}
                >
                  <button
                    aria-pressed={!selectedMandi}
                    onClick={() => setSelectedMandi("")}
                  >
                    {t("All mandis")} ({markets.length})
                  </button>
                  {markets.map((g) => (
                    <button
                      key={g.key}
                      aria-pressed={selectedMandi === g.key}
                      onClick={() => setSelectedMandi(g.key)}
                    >
                      <strong>{g.market}</strong>
                      <span>
                        {g.district}, {g.state}
                      </span>
                      <small>
                        {g.distanceKm != null ? `≈ ${g.distanceKm} km · ` : ""}
                        {new Set(g.records.map((r) => r.commodity)).size}{" "}
                        {t("crops")}
                      </small>
                    </button>
                  ))}
                </div>
              </details>
            )}
            <CategoryBrowser
              categories={["All crops", ...cropOptions]}
              selected={recentCrop || "All crops"}
              onSelect={(crop) => chooseCrop(crop === "All crops" ? "" : crop)}
              cropImages
              disabled={busy || !cropOptions.length}
              busy={busy}
            >
            <p role="status" className="market-loading-status">
              {busy ? t("Loading market prices...") : "\u00a0"}
            </p>
            {!busy && (error || (data && !records.length)) && (
              <div className="market-empty-state" role={error || data?.status === "unavailable" ? "alert" : "status"}>
                <p>{t(error || (data?.status === "ok" ? "No reports match these filters." : data.message))}</p>
              </div>
            )}
            <div className="crop-market-results" aria-live="polite">
              {commodityGroups.map((g) => (
                <section className="crop-market-group" key={g.commodity}>
                  <header>
                    <CropIcon name={g.commodity} />
                    <h4>{t(g.commodity)}</h4>
                  </header>
                  {g.records.map((r, i) => (
                    <article
                      className="crop-market-row"
                      key={r.market + r.variety + i}
                    >
                      <div className="crop-market-place">
                        <strong>{r.market}</strong>
                        <small>
                          {r.distanceKm != null
                            ? `≈ ${r.distanceKm} km · `
                            : ""}
                          {r.state}
                        </small>
                        <small>{t(r.variety)}</small>
                        {r.grade && <small>{t("Grade")}: {t(r.grade)}</small>}
                      </div>
                      <div className="crop-market-price">
                        <strong>
                          {r.min != null && r.max != null
                            ? price(r.min, t).split(" / ")[0] +
                              " – " +
                              price(r.max, t).split(" / ")[0]
                            : price(r.modal, t).split(" / ")[0]}
                        </strong>
                        <small>{marketDate(r.date)} · 100 kg</small>
                        <span
                          className={
                            r.change > 0
                              ? "price-up"
                              : r.change < 0
                                ? "price-down"
                                : "price-unchanged"
                          }
                        >
                          {priceChange(r.change, t)}
                        </span>
                        {r.previousDate && (
                          <small>
                            {t("Compared with")} {marketDate(r.previousDate)}
                          </small>
                        )}
                        <small>{r.source}</small>
                      </div>
                    </article>
                  ))}
                </section>
              ))}
            </div>
            {data?.recentNextOffset != null && (
              <button
                className="secondary nearby-location-button"
                disabled={busy}
                onClick={loadMore}
              >
                {t("Load more recent reports")}
              </button>
            )}
            </CategoryBrowser>
            {data?.truncated && (
              <p>
                {t(
                  data?.radiusKm
                    ? "Nearby coverage is incomplete because the government feed exceeds the report limit."
                    : "Showing the first 1,000 reports. See the source for more.",
                )}
              </p>
            )}
            <a href={marketSource} target="_blank" rel="noreferrer">
              AGMARKNET / data.gov.in
            </a>
            <a
              href="https://agmarknet.gov.in/home"
              target="_blank"
              rel="noreferrer"
            >
              AGMARKNET · {t("Recent prices")}
            </a>
          </section>
        </>
      )}
      {tab === "msp" && (
        <section className="market-msp">
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
          <CategoryBrowser
            categories={mspGroups.map((g) => g.category)}
            selected={mspCategory}
            onSelect={setMspCategory}
            groups={mspGroups}
          >
            <h4>{t(mspCategory)}</h4>
            <div className="price-tile-grid">
              {supportPrices.map(([name, value]) => (
                <article className="price-tile" key={name}>
                  <CropSymbol name={name} />
                  <strong>{t(name)}</strong>
                  <strong className="tile-price">
                    {price(value, t).split(" / ")[0]}
                  </strong>
                  <small>{t("per quintal (100 kg)")}</small>
                </article>
              ))}
            </div>
          </CategoryBrowser>
          <a href={mspSource} target="_blank" rel="noreferrer">
            {t("Official MSP notification · 13 May 2026")}
          </a>
        </section>
      )}
    </div>
  );
}

function CategoryBrowser({ categories, groups, selected, onSelect, children, cropImages = false, disabled = false, busy = false }) {
  const t = useLocale();
  const resultsRef = useRef(null);
  const scrollPosition = useRef(null);
  function selectCategory(name) {
    if (name === selected) return;
    // Keep enough page height for the current viewport even for shorter results.
    const results = resultsRef.current;
    const minimumHeight = Math.max(0, window.innerHeight - results.getBoundingClientRect().top);
    results.style.minHeight = `${minimumHeight}px`;
    scrollPosition.current = { left: window.scrollX, top: window.scrollY };
    onSelect(name);
  }
  useLayoutEffect(() => {
    if (!scrollPosition.current) return;
    window.scrollTo({ ...scrollPosition.current, behavior: "instant" });
    if (!busy) scrollPosition.current = null;
  }, [selected, busy, children]);
  return (
    <div className="category-browser">
      <aside
        className="category-rail"
        tabIndex={0}
        aria-label={t("Browse by category")}
      >
        {categories.map((name) => (
          <button
            key={name}
            aria-label={t(name)}
            title={t(name)}
            aria-pressed={selected === name}
            disabled={disabled}
            type="button"
            onClick={() => selectCategory(name)}
          >
            <span className="category-image">
              <CropIcon name={cropImages ? (name === "All crops" ? "Crop plant" : name) : categoryImages[name]} />
            </span>
            <span className="category-label">{t(name)}</span>
            {groups && <small className="category-count">
              {groups.find((g) => g.category === name)?.items.length || 0}
            </small>}
          </button>
        ))}
      </aside>
      <section
        ref={resultsRef}
        className="category-results"
        tabIndex={0}
        aria-label={t(selected)}
        aria-live="polite"
        aria-busy={busy}
      >
        {children}
      </section>
    </div>
  );
}
