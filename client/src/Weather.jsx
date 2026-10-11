import { useEffect, useRef, useState } from "react";
import { endpoints } from "../../common/api.js";
import {
  condition,
  weatherMetrics,
  forecastSummary,
  weatherQuery,
  dayLabel,
  formatValue,
} from "../../common/weather.js";
import { useLocale } from "./locale";
function Metrics({ record, units }) {
  const localize = useLocale();
  return (
    <dl className="weather-metrics">
      {weatherMetrics(record, units).map((metric) => (
        <div key={metric.key}>
          <dt>{localize(metric.label)}</dt>
          <dd>{localize(metric.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Weather({ api, user, lang, summary = false, onOpen }) {
  const localize = useLocale();
  const [data, setData] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [places, setPlaces] = useState([]);
  const place = useRef();
  const sequence = useRef(0);
  const apiRef = useRef(api);
  apiRef.current = api;
  async function load(selected = place.current) {
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    setData(null);
    place.current = selected;
    try {
      const result = await apiRef.current(
        endpoints.weather + weatherQuery(selected),
      );
      if (id === sequence.current) setData(result);
    } catch (e) {
      if (id === sequence.current) setError(e.message);
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      sequence.current++;
    };
  }, [user?.id]);
  async function search(e) {
    e.preventDefault();
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    setPlaces([]);
    try {
      const results = await apiRef.current(
        `${endpoints.weatherLocations}?q=${encodeURIComponent(query.trim())}`,
      );
      if (id === sequence.current) {
        setPlaces(results);
        if (!results.length) setError("No matching places. Try a nearby town.");
      }
    } catch (e) {
      if (id === sequence.current) setError(e.message);
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setError("Location is unavailable. Search for your town instead.");
      return;
    }
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (id === sequence.current)
          void load({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
      },
      () => {
        if (id === sequence.current) {
          setBusy(false);
          setError(
            "Could not get your location. Allow location access or search for your town.",
          );
        }
      },
      { timeout: 15000, maximumAge: 300000 },
    );
  }
  if (summary)
    return (
      <section
        className="weather card weather-summary"
        aria-label={localize("Five-day outlook")}
      >
        <header className="weather-summary-heading">
          <h2>{localize("Five-day outlook")}</h2>
          {data && <p className="weather-location">{data.location.label}</p>}
        </header>
        {busy && <p role="status">{localize("Loading weather...")}</p>}
        {error && <p role="alert">{localize(error)}</p>}
        {data && (
          <>
            <div className="weather-summary-facts">
              {forecastSummary(data.days, lang).map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
            <div className="weather-summary-days">
              {data.days.slice(1, 6).map((day) => (
                <div className="weather-summary-day" key={day.time}>
                  <div className="weather-summary-condition">
                    <strong>{dayLabel(day.time, lang)}</strong>
                    <small>{localize(condition(day.weather_code))}</small>
                  </div>
                  <strong className="weather-summary-range">
                    {localize(formatValue(day.temperature_2m_max, "\u00b0C"))} /{" "}
                    {localize(formatValue(day.temperature_2m_min, "\u00b0C"))}
                  </strong>
                  <small className="weather-summary-rain">
                    {localize("Rain chance")}{" "}
                    {localize(
                      formatValue(day.precipitation_probability_max, "%"),
                    )}
                  </small>
                </div>
              ))}
            </div>
          </>
        )}
        <button className="outline" onClick={onOpen}>
          {localize("View all weather")}
        </button>
      </section>
    );
  return (
    <section className="weather card" aria-label={localize("Local weather")}>
      <div className="weather-heading">
        <div>
          <span className="auth-eyebrow">
            {localize("Plan your next five days")}
          </span>
          <h2>{localize("Local weather")}</h2>
        </div>
        <span aria-hidden="true" className="weather-symbol">
          ☀
        </span>
      </div>
      <form className="weather-search" onSubmit={search}>
        <label htmlFor="weather-town">
          {localize("Find your town or village")}
        </label>
        <div className="weather-search-row">
          <input
            id="weather-town"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={localize("Town, city or postal code")}
            minLength={2}
            maxLength={100}
            required
          />
          <button disabled={busy}>{localize("Search")}</button>
        </div>
      </form>
      <div className="weather-actions">
        <button className="outline" disabled={busy} onClick={locate}>
          {localize("Use my location")}
        </button>
        <button
          className="outline"
          disabled={busy}
          onClick={() => void load(null)}
        >
          {localize("Saved farm")}
        </button>
        {data && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void load()}
          >
            {localize("Refresh")}
          </button>
        )}
      </div>
      {places.map((p) => (
        <button
          className="outline weather-place"
          key={`${p.latitude},${p.longitude}`}
          disabled={busy}
          onClick={() => {
            setPlaces([]);
            void load(p);
          }}
        >
          {p.label}
        </button>
      ))}
      {busy && <p role="status">{localize("Loading weather...")}</p>}
      {error && (
        <p className="weather-error" role="alert">
          {localize(error)}
        </p>
      )}
      {data && (
        <>
          <div className="weather-current">
            <p className="weather-location">{data.location.label}</p>
            <small>
              {localize(data.location.source)} ·{" "}
              {data.location.latitude.toFixed(3)},{" "}
              {data.location.longitude.toFixed(3)}
            </small>
            <strong className="weather-temperature">
              {formatValue(data.current.temperature_2m, "°C")}
            </strong>
            <h3>{localize(condition(data.current.weather_code))}</h3>
            <p>
              {localize("Feels like")}{" "}
              {formatValue(data.current.apparent_temperature, "°C")}
            </p>
            <small>
              {localize("Conditions at")} {data.current.time.replace("T", " ")}{" "}
              ({data.timezone})
            </small>
          </div>
          <Metrics
            record={Object.fromEntries(
              Object.entries(data.current).filter(([key]) =>
                [
                  "relative_humidity_2m",
                  "wind_speed_10m",
                  "wind_gusts_10m",
                  "precipitation",
                ].includes(key),
              ),
            )}
            units={data.units.current}
          />
          <details className="weather-details">
            <summary>{localize("All current weather details")}</summary>
            <Metrics record={data.current} units={data.units.current} />
            <h3>{localize("Hourly soil, UV and visibility estimates")}</h3>
            <p className="muted">{data.currentExtra.time.replace("T", " ")}</p>
            <Metrics
              record={Object.fromEntries(
                Object.entries(data.currentExtra).filter(([key]) =>
                  [
                    "soil_temperature_0cm",
                    "soil_temperature_6cm",
                    "soil_moisture_0_to_1cm",
                    "soil_moisture_3_to_9cm",
                    "uv_index",
                    "visibility",
                    "dew_point_2m",
                    "et0_fao_evapotranspiration",
                  ].includes(key),
                ),
              )}
              units={data.units.hourly}
            />
          </details>
          <div className="weather-outlook">
            <h3>{localize("Five-day outlook")}</h3>
            {forecastSummary(data.days, lang).map((text) => (
              <p key={text}>{localize(text)}</p>
            ))}
          </div>
          <h3>{localize("Today and the next five days")}</h3>
          {data.days.map((day, index) => (
            <details className="weather-day" key={day.time}>
              <summary>
                <span>
                  {index === 0 ? localize("Today") : dayLabel(day.time, lang)}
                  <small>{localize(condition(day.weather_code))}</small>
                </span>
                <span>
                  {formatValue(day.temperature_2m_max, "°C")} /{" "}
                  {formatValue(day.temperature_2m_min, "°C")}
                  <small>
                    {localize("Rain chance")}{" "}
                    {formatValue(day.precipitation_probability_max, "%")}
                  </small>
                </span>
              </summary>
              <Metrics record={day} units={data.units.daily} />
              <details className="weather-details">
                <summary>{localize("Hour-by-hour forecast")}</summary>
                {day.hours.map((hour) => (
                  <details className="weather-hour" key={hour.time}>
                    <summary>
                      {hour.time.slice(11, 16)} ·{" "}
                      {localize(condition(hour.weather_code))} ·{" "}
                      {formatValue(hour.temperature_2m, "°C")}
                      <small>
                        {localize("Rain chance")}{" "}
                        {formatValue(hour.precipitation_probability, "%")}
                      </small>
                    </summary>
                    <Metrics record={hour} units={data.units.hourly} />
                  </details>
                ))}
              </details>
            </details>
          ))}
          <p className="weather-note muted">{localize(data.modelNote)}</p>
          <p className="muted">
            {localize("Retrieved")}{" "}
            {new Date(data.fetchedAt).toLocaleString("en-IN", {
              timeZone: data.timezone,
            })}
          </p>
          <a
            className="weather-attribution"
            href={data.attributionUrl}
            target="_blank"
            rel="noreferrer"
          >
            {localize("Weather data by")} {data.attribution}
          </a>
        </>
      )}
    </section>
  );
}
