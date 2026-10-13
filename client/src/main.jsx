import { resolveVoiceCommand } from '../../common/voice-command.js';
import { normalizeLanguage, translate } from "../../common/locale.js";
import { useLocale, LocaleContext } from "./locale";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { UserDetails, UserAvatar } from "./UserDetails";
import { Subscription, SubscriptionPopup } from "./Subscription";
import {
  subscriptionRequired,
  subscriptionMessage,
} from "../../common/subscription.js";
import { Services } from "./Services";
import { ServiceCalculator } from "./ServiceCalculator";
import { Market } from "./Market";
import { Weather } from "./Weather";
import { FarmOverview } from "./FarmOverview";
import { FarmDetails } from "./FarmDetails";
import {
  profileSettings,
  accountGreeting,
  languages,
  speechLanguages,
  brand,
  screens,
  careTips,
  photoChecks,
  photoTip,
  consentText,
  consentDetail,
  voiceCommands,
  analysisStatus,
  filterHistory,
} from "../../common/content.js";
import { endpoints, uploadRules, requestApi } from "../../common/api.js";
function Leaf({ large = false }) {
  const localize = useLocale();
  return (
    <img
      className={large ? "leaf large" : "leaf"}
      src="/krishi-farmer-logo.png"
      alt={localize("Krishi Karshak farmer and plough logo")}
    />
  );
}
function Icon({ name }) {
  const paths = {
    market: "M3 21h18M5 17v-4M10 17V9M15 17V5M20 17V3",
    weather: "M7 18h11a4 4 0 0 0 0-8 6 6 0 0 0-11-1 4.5 4.5 0 0 0 0 9Z",
    farm: "M3 21h18M4 17l8-5 8 5M4 12l8-5 8 5M12 3v18",
    home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
    camera: "M3 7h5l2-3h4l2 3h5v13H3Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    gallery: "M3 3h18v18H3Z m0 14 5-5 4 4 4-6 5 7 M8 7h.01",
    services: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
    history: "M4 5v5h5 M4 10a8 8 0 1 1 0 5 M12 7v5l3 2",
    language:
      "M3 12h18 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 3c-5 5-5 13 0 18 5-5 5-13 0-18",
    security: "M5 10h14v11H5Z M8 10V7a4 4 0 0 1 8 0v3",
    profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21v-2a8 8 0 0 1 16 0v2",
    learn: "M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16",
    search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0 m-2 4 7 7",
    mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0Zm-3 6a6 6 0 0 0 12 0M12 17v5m-4 0h8",
  };
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
function Language({ lang, change }) {
  const localize = useLocale();
  const dialog = useRef(null);
  return (
    <>
      <button
        type="button"
        className="language-action"
        aria-haspopup="dialog"
        onClick={() => dialog.current.showModal()}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <path d="M3 12h18M5 6.5h14M5 17.5h14" />
        </svg>
        {localize("Change language")}
        <span>{languages[lang]}</span>
      </button>
      <dialog
        ref={dialog}
        className="language-popup"
        aria-label={localize("Choose your language")}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current.close();
        }}
      >
        <div className="language-popup-header">
          <h2>{localize("Choose your language")}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label={localize("Close language selection")}
            onClick={() => dialog.current.close()}
          >
            ×
          </button>
        </div>
        <p className="muted">{localize("Select your preferred language.")}</p>
        <div className="language-options">
          {Object.entries(languages).map(([id, text]) => (
            <button
              type="button"
              key={id}
              lang={id}
              aria-pressed={lang === id}
              className={`language-option ${lang === id ? "selected" : ""}`}
              onClick={() => {
                change(id);
                dialog.current.close();
              }}
            >
              <span className="language-glyph">
                {localize({ en: "A", te: "అ", hi: "अ", kn: "ಅ", ta: "அ" }[id])}
              </span>
              <span>{localize(text)}</span>
              <span className="chevron">
                {localize(lang === id ? "✓" : "○")}
              </span>
            </button>
          ))}
        </div>
      </dialog>
    </>
  );
}
function PasswordField(props) {
  const localize = useLocale();
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-eye"
        aria-label={localize(visible ? "Hide password" : "Show password")}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  );
}
function App() {
  const [subscriptionAccess, setSubscriptionAccess] = useState(null);
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [subscriptionPopup, setSubscriptionPopup] = useState(false);
  const localize = (text) => translate(lang, text);
  const [screen, setScreen] = useState("login"),
    [lang, setLang] = useState(() =>
      normalizeLanguage(localStorage.getItem("leaf-language")),
    ),
    [token, setToken] = useState(""),
    [user, setUser] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [restoring, setRestoring] = useState(true);
  const [file, setFile] = useState(null),
    [preview, setPreview] = useState(""),
    [consent, setConsent] = useState(false),
    [plantName, setPlantName] = useState(""),
    [location, setLocation] = useState(""),
    [result, setResult] = useState(null),
    [history, setHistory] = useState([]),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [voiceOpen, setVoiceOpen] = useState(false),
    [listening, setListening] = useState(false),
    [tab, setTab] = useState("analysis");
  const [notice, setNotice] = useState("");
  const featureLocked = Boolean(
    user &&
    subscriptionRequired(screen, subscriptionEnabled, subscriptionAccess),
  );
  const camera = useRef(),
    gallery = useRef(),
    recognition = useRef(),
    tokenRef = useRef(""),
    refreshRef = useRef(null);
  function go(next) {
    setError("");
    setNotice("");
    if (next === "subscription") {
      setSubscriptionPopup(true);
      return;
    }
    setSubscriptionPopup(
      Boolean(
        user &&
        subscriptionRequired(next, subscriptionEnabled, subscriptionAccess),
      ),
    );
    setScreen(next);
    window.scrollTo(0, 0);
  }
  function change(next) {
    setLang(normalizeLanguage(next));
  }
  useEffect(() => {
    localStorage.setItem("leaf-language", lang);
    document.documentElement.lang = lang;
  }, [lang]);
  function clear() {
    tokenRef.current = "";
    setToken("");
    setUser(null);
    setSubscriptionPopup(false);
    setHistory([]);
    setResult(null);
    setPreview("");
    setFile(null);
    setVoiceOpen(false);
    recognition.current?.abort();
    go("login");
  }
  async function refresh() {
    if (!refreshRef.current)
      refreshRef.current = requestApi(endpoints.refresh, {
        method: "POST",
        credentials: "include",
      })
        .then((x) => {
          tokenRef.current = x.accessToken;
          setToken(x.accessToken);
          return x.accessToken;
        })
        .finally(() => (refreshRef.current = null));
    return refreshRef.current;
  }
  async function api(url, opt = {}, image = false) {
    const send = () =>
      requestApi(url, {
        ...opt,
        credentials: "include",
        token: tokenRef.current,
        responseType: image ? "blob" : "json",
      });
    try {
      return await send();
    } catch (error) {
      if (error.status === 402) {
        setSubscriptionEnabled(true);
        setSubscriptionAccess(false);
        setSubscriptionPopup(true);
      }
      if (error.status !== 401 || url.startsWith("/api/auth/")) throw error;
      try {
        await refresh();
      } catch (refreshError) {
        clear();
        throw refreshError;
      }
      return send();
    }
  }

  useEffect(() => {
    setSubscriptionAccess(null);
    let active = true;
    const check = () =>
      api("/api/billing")
        .then((value) => {
          if (active) {
            setSubscriptionEnabled(value.enabled);
            setSubscriptionAccess(value.access);
          }
        })
        .catch(() => {
          if (active) setSubscriptionAccess(false);
        });
    if (user && token) {
      check();
      const interval = setInterval(check, 60000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }
    return () => {
      active = false;
    };
  }, [Boolean(user), Boolean(token)]);

  useEffect(() => {
    sessionStorage.removeItem("token");
    refresh()
      .then(() => go("home"))
      .catch(() => {})
      .finally(() => setRestoring(false));
    return () => {
      recognition.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    if (token) {
      if (subscriptionAccess === true)
        api(endpoints.analyses)
          .then(setHistory)
          .catch((e) => setError(e.message));
      api(endpoints.me)
        .then(setUser)
        .catch((e) => setError(e.message));
    }
  }, [token, result, subscriptionAccess]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const [authMobile, setAuthMobile] = useState("");
  const [authName, setAuthName] = useState("");
  const [authStage, setAuthStage] = useState("mobile");
  const [authChecking, setAuthChecking] = useState(false);
  const [authReset, setAuthReset] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState(null);
  const mobileLookup = useRef(null);
  async function checkAuthMobile(value) {
    mobileLookup.current?.abort();
    const controller = new AbortController();
    mobileLookup.current = controller;
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setAuthMobile(digits);
    setAuthStage("mobile");
    setOtpChallenge(null);
    setAuthReset(false);
    setAuthName("");
    setError("");
    setAuthChecking(false);
    if (digits.length !== 10) return;
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError(
        "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.",
      );
      return;
    }
    setAuthChecking(true);
    try {
      const result = await api(endpoints.checkMobile, {
        method: "POST",
        body: JSON.stringify({ mobileNumber: digits }),
        signal: controller.signal,
      });
      if (!controller.signal.aborted)
        setAuthStage(result.profileCreated ? "login-pin" : "request");
    } catch (e) {
      if (!controller.signal.aborted) setError(e.message);
    } finally {
      if (!controller.signal.aborted) setAuthChecking(false);
    }
  }
  async function sendAuthOtp(resetPin = false) {
    if (busy || authChecking) return;
    setBusy(true);
    setError("");
    try {
      setOtpChallenge(
        await api(endpoints.requestOtp, {
          method: "POST",
          body: JSON.stringify({ mobileNumber: authMobile, resetPin }),
        }),
      );
      setAuthReset(resetPin);
      setAuthStage("otp");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function auth(e) {
    e.preventDefault();
    if (busy || authChecking) return;
    const b = Object.fromEntries(new FormData(e.currentTarget));
    if (authStage === "mobile") {
      await checkAuthMobile(authMobile);
      return;
    }
    if (authStage === "request") {
      await sendAuthOtp();
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (authStage === "otp") {
        await api(endpoints.verifyOtp, {
          method: "POST",
          body: JSON.stringify({
            guid: otpChallenge.guid,
            otp: b.otp,
            ...(!authReset ? { fullName: authName } : {}),
          }),
        });
        setAuthStage("pin");
        return;
      }
      if (authStage === "pin" && b.pin !== b.confirmPin)
        throw Error("PINs do not match.");
      const x = await api(endpoints.login, {
        method: "POST",
        body: JSON.stringify(
          authStage === "login-pin"
            ? { mobileNumber: authMobile, pin: b.pin, language: lang }
            : { guid: otpChallenge.guid, pin: b.pin, language: lang },
        ),
      });
      setAuthStage("mobile");
      setOtpChallenge(null);
      setAuthMobile("");
      setAuthName("");
      tokenRef.current = x.accessToken;
      setToken(x.accessToken);
      setUser(x.user);
      go("home");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveFarmDetails(
    farmDetails,
    farmId,
    newCrop = false,
    addPreviousCrop = false,
  ) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api(endpoints.me, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: user.fullName,
          language: lang,
          farmDetails,
          farmId,
          newCrop,
          addPreviousCrop,
        }),
      });
      setUser(data);
      setNotice("Farm details saved.");
      return farmId === "new"
        ? data.farms.find((f) => !user.farms?.some((old) => old.id === f.id))
            ?.id || true
        : true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveUserDetails(fullName, userDetails) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api(endpoints.me, {
        method: "PATCH",
        body: JSON.stringify({ fullName, language: lang, userDetails }),
      });
      setUser(data);
      setNotice("User details saved.");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function uploadProfilePhoto(file) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.append("photo", file);
      setUser(
        await api(endpoints.profilePhoto, { method: "POST", body: form }),
      );
      setNotice("Profile photo saved.");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function account(e, action) {
    e.preventDefault();
    if (busy) return;
    const b = Object.fromEntries(new FormData(e.currentTarget));
    if (b.confirmPassword !== undefined && b.password !== b.confirmPassword)
      return setError("Passwords do not match.");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api(
        ["profile", "farm"].includes(action) ? endpoints.me : endpoints[action],
        {
          method: ["profile", "farm"].includes(action) ? "PATCH" : "POST",
          body: JSON.stringify(
            action === "farm"
              ? { fullName: user.fullName, language: lang, farmDetails: b }
              : action === "profile"
                ? { fullName: b.fullName, language: lang }
                : b,
          ),
        },
      );
      if (["profile", "farm"].includes(action)) {
        setUser(data);
        setNotice("Profile saved.");
      } else if (action === "forgotPassword") {
        go("reset");
        setNotice(data.message);
      } else {
        clear();
        setNotice(data.message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function choose(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    if (!uploadRules.mimeTypes.includes(f.type))
      return setError("Choose a JPEG, PNG or WebP photo.");
    if (f.size > uploadRules.maxBytes)
      return setError("Choose a photo smaller than 4 MiB.");
    const url = URL.createObjectURL(f);
    try {
      const dims = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
        img.onerror = reject;
        img.src = url;
      });
      if (Math.min(...dims) < uploadRules.minDimension)
        throw Error("Choose a photo at least 300 × 300 pixels.");
      setFile(f);
      setPreview(url);
      setConsent(false);
      setPlantName("");
      setLocation("");
      setResult(null);
      go("review");
    } catch (e) {
      URL.revokeObjectURL(url);
      setError(e.message || "This photo could not be opened.");
    }
  }
  async function analyze() {
    if (!file || !consent || busy) return;
    setBusy(true);
    go("processing");
    const b = new FormData();
    b.append("leaf", file);
    b.append("consent", "true");
    b.append("language", lang);
    b.append("plantName", plantName);
    b.append("location", location);
    try {
      setResult(await api(endpoints.analyses, { method: "POST", body: b }));
      go("result");
    } catch (e) {
      if (tokenRef.current) go("details");
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function open(item) {
    setBusy(true);
    setError("");
    try {
      setResult(await api(endpoints.analysis(item.id)));
      setFile(null);
      setPreview("");
      go("result");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function speak(language = lang, actions = false) {
    if (!window.speechSynthesis)
      return setError("Read aloud is unavailable in this browser.");
    const out = result?.translations?.[language];
    if (!out) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      actions
        ? out.actions.join(". ")
        : `${out.summary}. ${out.actions.join(". ")}`,
    );
    u.lang = speechLanguages[language];
    window.speechSynthesis.speak(u);
  }
  async function command(transcript) {
    const { intent, language, full } = resolveVoiceCommand(transcript);
    if (intent === "history" || intent === "analyze") {
      setVoiceOpen(false);
      go(intent === "history" ? "history" : "capture");
    } else if (intent === "language") {
      change(language);
      speak(language);
    } else if (intent === "read_result") {
      speak(lang, full);
    }
    if (intent === "unknown") setError(`Command not recognized: ${transcript}`);
    await api(endpoints.voiceCommands, {
      method: "POST",
      body: JSON.stringify({
        transcript,
        language: lang,
        intent,
        successful: intent !== "unknown",
        analysisId: result?.id || null,
      }),
    }).catch((e) => setError(e.message));
  }
  function voice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR)
      return setError(
        "Voice recognition is unavailable. Use the commands below or try Chrome or Edge.",
      );
    recognition.current?.abort();
    const r = new SR();
    recognition.current = r;
    r.lang = speechLanguages[lang];
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = (e) => {
      setListening(false);
      if (e.error !== "aborted")
        setError(`Microphone: ${e.error}. You can use the command buttons.`);
    };
    r.onresult = (e) => command(e.results[0][0].transcript);
    r.start();
  }
  async function logout() {
    try {
      await api(endpoints.logout, { method: "POST" });
      clear();
    } catch (e) {
      setError(e.message);
    }
  }
  const isAuth = ["login", "register", "forgot", "reset"].includes(screen),
    out = result?.translations?.[lang];
  const status = analysisStatus;
  const shown = filterHistory(history, query, filter);
  return (
    <LocaleContext.Provider value={lang}>
      <div
        className={`phone ${isAuth ? "botanical" : ""} ${featureLocked || subscriptionPopup ? "subscription-page-frozen" : ""}`}
      >
        <input
          ref={camera}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={choose}
        />
        <input
          ref={gallery}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={choose}
        />
        {restoring ? (
          <main className="restore">
            <Leaf large />
            <p>{localize("Opening Krishi Karshak…")}</p>
          </main>
        ) : (
          <>
            {!isAuth && (
              <header>
                <div className="brand-inline">
                  <Leaf />
                  <b>{localize(brand.name)}</b>
                </div>
                <button
                  className="account-avatar"
                  aria-label={localize(
                    `Open profile for ${user?.fullName || "your account"}`,
                  )}
                  onClick={() => go("profile")}
                >
                  <UserAvatar user={user} />
                </button>
              </header>
            )}
            {notice && (
              <div className="notice" role="status">
                {notice}
              </div>
            )}
            {error && (
              <div className="alert" role="alert">
                {error}
                <button
                  className="icon-button"
                  aria-label={localize("Dismiss error")}
                  onClick={() => setError("")}
                >
                  ×
                </button>
              </div>
            )}
            {featureLocked && (
              <div className="notice" role="status">
                <span>{subscriptionMessage}</span>
                <button onClick={() => setSubscriptionPopup(true)}>
                  View plans
                </button>
              </div>
            )}
            <main
              inert={featureLocked}
              aria-disabled={featureLocked || undefined}
              className={`${isAuth ? "auth-content" : "content"}${featureLocked ? " subscription-locked" : ""}`}
            >
              {["login", "register"].includes(screen) && (
                <>
                  <div className="brand">
                    <Leaf large />
                    {screen === "login" && (
                      <p>
                        {localize("Healthy Crops")}
                        <br />
                        {localize("Thriving Farms")}
                      </p>
                    )}
                    {screen === "register" && (
                      <p>
                        <>
                          {localize("Grow Today")}
                          <br />
                          {localize("Greener Tomorrow")}
                        </>
                      </p>
                    )}
                  </div>
                  <section className="mobile-auth-card">
                    <span className="auth-eyebrow">
                      {localize("Account access")}
                    </span>
                    <h2>
                      {localize(
                        authStage === "otp"
                          ? "Verify OTP"
                          : authStage === "pin"
                            ? "Set your PIN"
                            : "Welcome to Krishi Karshak",
                      )}
                    </h2>
                    <p className="muted">
                      {localize(
                        authStage === "otp"
                          ? "Enter the six-digit code sent to your mobile number."
                          : authStage === "pin"
                            ? "Choose a four-digit PIN to secure your account."
                            : "Enter your mobile number to sign in or create an account.",
                      )}
                    </p>
                    <form onSubmit={auth}>
                      {["mobile", "request", "login-pin"].includes(
                        authStage,
                      ) && (
                        <>
                          <label htmlFor="mobile-number">
                            {localize("Enter mobile number")}{" "}
                            <span
                              className="required-marker"
                              aria-hidden="true"
                            >
                              *
                            </span>
                          </label>
                          <div className="mobile-phone-input">
                            <span
                              className="country-prefix"
                              aria-label="Country code +91"
                            >
                              +91
                            </span>
                            <input
                              id="mobile-number"
                              name="mobileNumber"
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel-national"
                              placeholder={localize("Enter mobile number")}
                              maxLength={11}
                              pattern="[6-9][0-9]{4} ?[0-9]{5}"
                              value={authMobile.replace(
                                /(\d{5})(\d+)/,
                                "$1 $2",
                              )}
                              onChange={(e) =>
                                void checkAuthMobile(e.target.value)
                              }
                              disabled={busy}
                              required
                            />
                          </div>
                        </>
                      )}
                      {authChecking && (
                        <p role="status">
                          {localize("Checking mobile number...")}
                        </p>
                      )}
                      {authStage === "login-pin" && (
                        <>
                          <label>
                            {localize("Enter 4-digit PIN")}
                            <PasswordField
                              key={authMobile}
                              name="pin"
                              autoComplete="current-password"
                              inputMode="numeric"
                              pattern="[0-9]{4}"
                              maxLength={4}
                              required
                              autoFocus
                            />
                          </label>
                          <button
                            type="button"
                            className="text-button"
                            disabled={busy}
                            onClick={() => void sendAuthOtp(true)}
                          >
                            {localize("Forgot PIN? Request OTP")}
                          </button>
                        </>
                      )}
                      {authStage === "request" && (
                        <>
                          <p>
                            {localize(
                              "Create your profile with OTP verification.",
                            )}
                          </p>
                          <label>
                            {localize("Full name")}
                            <input
                              name="fullName"
                              autoComplete="name"
                              minLength={2}
                              maxLength={150}
                              value={authName}
                              onChange={(e) => setAuthName(e.target.value)}
                              required
                            />
                          </label>
                        </>
                      )}
                      {authStage === "otp" && (
                        <>
                          <p className="muted">+91 {authMobile}</p>
                          <label>
                            {localize("OTP")}
                            <input
                              name="otp"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              pattern="[0-9]{6}"
                              maxLength={6}
                              required
                            />
                          </label>
                          {!authReset && (
                            <label>
                              {localize("Full name")}
                              <input
                                name="fullName"
                                autoComplete="name"
                                minLength={2}
                                maxLength={150}
                                value={authName}
                                onChange={(e) => setAuthName(e.target.value)}
                                required
                              />
                            </label>
                          )}
                          {!otpChallenge.deliveryEnabled &&
                            otpChallenge.testOtp && (
                              <p role="status">
                                {localize("Test OTP")}:{" "}
                                <strong>{otpChallenge.testOtp}</strong>
                              </p>
                            )}
                        </>
                      )}
                      {authStage === "pin" && (
                        <>
                          <label>
                            {localize("Set 4-digit PIN")}
                            <PasswordField
                              name="pin"
                              inputMode="numeric"
                              pattern="[0-9]{4}"
                              maxLength={4}
                              required
                            />
                          </label>
                          <label>
                            {localize("Confirm PIN")}
                            <PasswordField
                              name="confirmPin"
                              inputMode="numeric"
                              pattern="[0-9]{4}"
                              maxLength={4}
                              required
                            />
                          </label>
                        </>
                      )}
                      <button disabled={busy || authChecking}>
                        {localize(
                          authStage === "mobile"
                            ? "Continue"
                            : authStage === "request"
                              ? "Request OTP"
                              : authStage === "login-pin"
                                ? "Sign in"
                                : authStage === "otp"
                                  ? "Verify OTP"
                                  : "Save and sign in",
                        )}
                      </button>
                    </form>
                    {["otp", "pin"].includes(authStage) && (
                      <button
                        className="outline"
                        disabled={busy}
                        onClick={() => void checkAuthMobile(authMobile)}
                      >
                        {localize("Back to mobile number")}
                      </button>
                    )}
                    <Language lang={lang} change={change} />
                    <p className="auth-security muted">
                      {localize("Your plants. Your care. All in one place.")}
                    </p>
                  </section>
                  <Footer text="Your plants. Your care. All in one place." />
                </>
              )}
              {screen === "home" && (
                <>
                  <section className="greeting">
                    <span className="sun">☀</span>
                    <h1>{localize(accountGreeting(user?.fullName))}</h1>
                    <p>
                      {localize("Healthy plants make")}
                      <br />
                      {localize("a happier you.")}
                    </p>
                  </section>
                  <Weather
                    api={api}
                    user={user}
                    lang={lang}
                    summary
                  />
                  {subscriptionEnabled && subscriptionAccess !== true && (
                    <section className="card" role="status">
                      <p>{subscriptionMessage}</p>
                      <button onClick={() => go("subscription")}>
                        View subscription plans
                      </button>
                    </section>
                  )}
                  <section className="analyze-card">
                    <span className="camera-circle">
                      <Icon name="camera" />
                    </span>
                    <h2>{localize("Analyze a leaf")}</h2>
                    <p>
                      {localize(
                        "Take a photo or choose from your gallery to detect plant issues, get insights and care recommendations.",
                      )}
                    </p>
                    <button className="light" onClick={() => go("capture")}>
                      <Icon name="camera" />
                      {localize("Take photo")}
                    </button>
                    <button
                      className="glass"
                      onClick={() => gallery.current.click()}
                    >
                      <Icon name="gallery" />
                      {localize("Choose from gallery")}
                    </button>
                  </section>
                  <button
                    className="feature card"
                    onClick={() => go("history")}
                  >
                    <span className="feature-icon">
                      <Icon name="history" />
                    </span>
                    <span>
                      <b>{localize("Recent analyses")}</b>
                      <small>
                        {localize("View your past leaf analyses and results")}
                      </small>
                    </span>
                    <span>›</span>
                  </button>
                  <button className="feature card" onClick={() => go("learn")}>
                    <span className="feature-icon yellow">☀</span>
                    <span>
                      <b>{localize("Plant care tips")}</b>
                      <small>
                        {localize(
                          "Everyday habits for healthier, happier plants",
                        )}
                      </small>
                    </span>
                    <span>›</span>
                  </button>
                </>
              )}
              {screen === "capture" && (
                <>
                  <h2>{localize(screens.capture)}</h2>
                  <div className="camera-guide">
                    <Leaf large />
                    <div className="frame" />
                    <p>{localize("Place one leaf inside the frame")}</p>
                    <small>
                      {localize("Your device camera opens when you tap below.")}
                    </small>
                  </div>
                  <section className="soft card">
                    <h3>{localize("A clearer photo helps")}</h3>
                    <p>{localize(photoTip)}</p>
                  </section>
                  <button onClick={() => camera.current.click()}>
                    {localize("Open camera")}
                  </button>
                  <button
                    className="outline"
                    onClick={() => gallery.current.click()}
                  >
                    {localize("Choose from gallery")}
                  </button>
                </>
              )}
              {screen === "review" && (
                <>
                  <h2>{localize(screens.review)}</h2>
                  <img
                    className="photo review-photo"
                    src={preview}
                    alt={localize("Selected leaf for review")}
                  />
                  <section className="soft card">
                    <h3>{localize("Check your photo")}</h3>
                    <p>{localize("Confirm these before continuing:")}</p>
                    {photoChecks.map((text) => (
                      <p className="quality" key={text}>
                        <span>✓</span>
                        {localize(text)}
                      </p>
                    ))}
                  </section>
                  <div className="button-row">
                    <button className="outline" onClick={() => go("capture")}>
                      {localize("Retake")}
                    </button>
                    <button onClick={() => go("details")}>
                      {localize("Use photo")}
                    </button>
                  </div>
                </>
              )}
              {screen === "details" && (
                <>
                  <h2>{localize(screens.details)}</h2>
                  <div className="ready soft card">
                    <img
                      src={preview}
                      alt={localize("Leaf ready to analyze")}
                    />
                    <div>
                      <h3>{localize("Ready to analyze")}</h3>
                      <p>
                        {localize(
                          "Add a few details (optional) for more helpful results.",
                        )}
                      </p>
                    </div>
                  </div>
                  <label>
                    {localize("Plant name")}
                    <span className="muted">{localize("(optional)")}</span>
                    <input
                      value={plantName}
                      onChange={(e) => setPlantName(e.target.value)}
                      maxLength={150}
                      placeholder={localize("e.g. Tomato")}
                    />
                  </label>
                  <label>
                    {localize("Location")}
                    <span className="muted">{localize("(optional)")}</span>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      maxLength={255}
                      placeholder={localize("e.g. Garden, Balcony, Indoors")}
                    />
                  </label>
                  <label className="consent">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      {localize(consentText)}
                      <small>{localize(consentDetail)}</small>
                    </span>
                  </label>
                  <button disabled={!consent || busy} onClick={analyze}>
                    {localize("Analyze leaf")}
                  </button>
                </>
              )}
              {screen === "processing" && (
                <div className="processing" role="status" aria-live="polite">
                  <div className="scanner">
                    <img src={preview} alt={localize("Leaf being analyzed")} />
                    <div className="scan-line" />
                  </div>
                  <h2>{localize("Analyzing your leaf…")}</h2>
                  <p>
                    {localize(
                      "Checking the photo and assessing visible plant health.",
                    )}
                  </p>
                  <ol className="steps">
                    <li>{localize("Image received")}</li>
                    <li className="active">
                      {localize("AI analysis in progress")}
                    </li>
                    <li>{localize("Preparing recommendations")}</li>
                  </ol>
                  <div className="soft card">
                    {localize("This may take a few moments.")}
                    <br />
                    {localize("Good plant care is worth the wait!")}
                  </div>
                </div>
              )}
              {screen === "result" && result && (
                <>
                  <Photo id={result.id} fallback={preview} api={api} />
                  <div className="status-banner">
                    <b>{status(result)}</b>
                    <small>
                      {localize(
                        result.status === "REVIEW_REQUIRED"
                          ? "The image or confidence needs closer review. Consider a clearer photo."
                          : "AI screening based on visible evidence.",
                      )}
                    </small>
                  </div>
                  {out ? (
                    <>
                      <div className="metrics">
                        <div>
                          <small>{localize("Likely condition")}</small>
                          <h2>{result.condition}</h2>
                        </div>
                        <div>
                          <small>{localize("Confidence")}</small>
                          <h2>{Math.round(result.confidence * 100)}%</h2>
                        </div>
                      </div>
                      <p className="severity">
                        {localize("Severity")}
                        <b>{result.severity}</b>
                      </p>
                      <section className="soft card">
                        <h3>{localize("Summary")}</h3>
                        <p>{out.summary}</p>
                      </section>
                      <p className="small">
                        {localize("Select language for results")}
                      </p>
                      <div className="result-languages">
                        {Object.entries(languages).map(([id, text]) => (
                          <button
                            key={id}
                            className={lang === id ? "" : "outline"}
                            aria-pressed={lang === id}
                            onClick={() => change(id)}
                          >
                            {localize(text)}
                          </button>
                        ))}
                      </div>
                      <div className="button-row">
                        <button
                          className="outline"
                          onClick={() => setVoiceOpen(true)}
                        >
                          {localize("◖ Listen")}
                        </button>
                        <button
                          onClick={() => {
                            setTab("analysis");
                            go("full");
                          }}
                        >
                          {localize("View full analysis →")}
                        </button>
                      </div>
                      <p className="disclaimer">ⓘ {out.disclaimer}</p>
                    </>
                  ) : (
                    <section className="card">
                      <h3>
                        {localize(
                          result.status === "FAILED"
                            ? "Analysis could not be completed"
                            : "Result is not ready",
                        )}
                      </h3>
                      <p>{localize("Take a new photo and try again.")}</p>
                      <button onClick={() => go("capture")}>
                        {localize("Try again")}
                      </button>
                    </section>
                  )}
                  <Audit result={result} />
                </>
              )}
              {screen === "full" && result && (
                <>
                  <div className="detail-title">
                    <Leaf />
                    <div>
                      <h2>{result.plant}</h2>
                      <p>{result.condition}</p>
                    </div>
                    <span className="badge">{status(result)}</span>
                  </div>
                  <div className="tabs">
                    <button
                      className={tab === "analysis" ? "active" : ""}
                      onClick={() => setTab("analysis")}
                    >
                      {localize("Full analysis")}
                    </button>
                    <button
                      className={tab === "resources" ? "active" : ""}
                      onClick={() => setTab("resources")}
                    >
                      {localize("Related resources")}
                    </button>
                  </div>
                  {tab === "analysis" ? (
                    <>
                      {[
                        ["Visible symptoms", out?.symptoms],
                        [
                          "Likely causes",
                          out?.likely_causes || result.likely_causes,
                        ],
                        ["Immediate actions", out?.actions],
                        [
                          "Treatment options",
                          out?.treatment || result.treatment,
                        ],
                        ["Prevention", out?.prevention || result.prevention],
                      ].map(([title, items]) => (
                        <section className="card detail-section" key={title}>
                          <h3>{localize(title)}</h3>
                          <ul>
                            {items?.map((text, i) => (
                              <li key={i}>{localize(text)}</li>
                            ))}
                          </ul>
                        </section>
                      ))}
                      <section className="expert card">
                        <h3>{localize("When to consult an expert")}</h3>
                        <p>
                          {out?.when_to_consult_expert ||
                            result.when_to_consult_expert}
                        </p>
                      </section>
                      <p className="disclaimer">
                        {out?.safety_note || result.safety_note}
                      </p>
                      {lang !== "en" && !out?.treatment && (
                        <p className="small">
                          {localize(
                            "Summary, symptoms and actions use your selected language. Additional guidance is provided in English.",
                          )}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <section className="card">
                        <h3>{localize("Get local guidance")}</h3>
                        <p>
                          {localize(
                            "Share your photo and analysis with a local horticulturist or agricultural extension service, especially if symptoms spread.",
                          )}
                        </p>
                        <p>
                          {localize(
                            "Follow product labels and local guidance before using treatments.",
                          )}
                        </p>
                      </section>
                      <button className="outline" onClick={() => go("learn")}>
                        {localize("Open plant care tips")}
                      </button>
                    </>
                  )}
                  <button
                    className="outline"
                    onClick={() => setVoiceOpen(true)}
                  >
                    {localize("Voice assistant")}
                  </button>
                </>
              )}
              {screen === "subscription" && (
                <Subscription api={api} onAccess={setSubscriptionAccess} />
              )}
              {screen === "services" && <Services onCalculator={kind => go(`${kind}-calculator`)} />}
              {["fertilizer-calculator", "pesticide-calculator"].includes(screen) && <ServiceCalculator key={screen} kind={screen === "fertilizer-calculator" ? "fertilizer" : "pesticide"} onBack={() => go("services")} />}
              {screen === "history" && (
                <>
                  <h2>{localize(screens.history)}</h2>
                  <p className="muted">
                    {localize("Keep track of your plant health journey")}
                  </p>
                  <input
                    type="search"
                    aria-label={localize("Search plants and conditions")}
                    placeholder={localize("Search plants, conditions…")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select
                    aria-label={localize("Filter analyses")}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">{localize("All analyses")}</option>
                    <option value="attention">
                      {localize("Needs attention")}
                    </option>
                    <option value="review">
                      {localize("Review required")}
                    </option>
                  </select>
                  {busy && <p role="status">{localize("Opening analysis…")}</p>}
                  {shown.map((x) => (
                    <button
                      className="history-card card"
                      key={x.id}
                      disabled={busy}
                      onClick={() => open(x)}
                    >
                      <div className="history-top">
                        <Photo id={x.id} api={api} thumbnail />
                        <div>
                          <b>
                            {x.plant_name ||
                              x.provided_plant_name ||
                              "Unidentified plant"}
                          </b>
                          <small>{x.disease_name || x.status}</small>
                        </div>
                        <span className="badge">{status(x)}</span>
                        <span>›</span>
                      </div>
                      <small>
                        {new Date(x.created_at).toLocaleDateString()} ·{" "}
                        {localize(
                          x.confidence == null
                            ? "Confidence pending"
                            : `${Math.round(x.confidence * 100)}% confidence`,
                        )}{" "}
                        · {x.severity}
                      </small>
                    </button>
                  ))}
                  {!shown.length && (
                    <section className="empty card">
                      <Leaf large />
                      <h3>
                        {localize(
                          history.length
                            ? "No matching analyses"
                            : "Your plant journey starts here",
                        )}
                      </h3>
                      <p>
                        {localize(
                          history.length
                            ? "Try another search or filter."
                            : "Analyze your first leaf to save its results here.",
                        )}
                      </p>
                      <button onClick={() => go("capture")}>
                        {localize("Analyze a leaf")}
                      </button>
                    </section>
                  )}
                </>
              )}
              {screen === "learn" && (
                <>
                  <h2>{localize(screens.learn)}</h2>
                  <p className="muted">
                    {localize("Small habits. Healthier plants.")}
                  </p>
                  {careTips.map(([title, text]) => (
                    <section className="soft card" key={title}>
                      <h3>{localize(title)}</h3>
                      <p>{localize(text)}</p>
                    </section>
                  ))}
                </>
              )}
              {screen === "market" && <Market api={api} />}
              {screen === "weather" && (
                <Weather api={api} user={user} lang={lang} />
              )}
              {screen === "farm" && (
                <>
                  <h2>{localize(screens.farm)}</h2>
                  <FarmOverview
                    user={user}
                    busy={busy}
                    onSave={saveFarmDetails}
                    onAdd={() => go("farm-details")}
                  />
                </>
              )}
              {screen === "profile" && (
                <>
                  <h2>{localize(screens.profile)}</h2>
                  <section className="profile-hero">
                    <UserAvatar user={user} large />
                    <div>
                      <h3>{user?.fullName || "Your account"}</h3>
                      <p className="muted">{user?.email}</p>
                    </div>
                  </section>
                  <div className="profile-menu">
                    <button
                      className="profile-menu-card"
                      onClick={() => go("subscription")}
                    >
                      <span className="profile-menu-icon" aria-hidden="true">
                        ◈
                      </span>
                      <span className="profile-menu-copy">
                        <strong>{localize("Subscription and AutoPay")}</strong>
                      </span>
                      <span aria-hidden="true">›</span>
                    </button>
                    {profileSettings.map((item) => (
                      <button
                        key={item.route}
                        className="profile-menu-card"
                        onClick={() => go(item.route)}
                      >
                        <span className="profile-menu-icon">
                          <Icon name={item.icon} />
                        </span>
                        <span className="profile-menu-copy">
                          <strong>{localize(item.title)}</strong>
                          <small>{localize(item.subtitle)}</small>
                        </span>
                        <span aria-hidden="true">&#8250;</span>
                      </button>
                    ))}
                  </div>
                  <button
                    className="profile-menu-card"
                    disabled={busy}
                    onClick={logout}
                  >
                    <span className="profile-menu-icon">&#8618;</span>
                    <span className="profile-menu-copy">
                      <strong>{localize("Sign out")}</strong>
                      <small>{localize("Sign out of your account")}</small>
                    </span>
                    <span aria-hidden="true">&#8250;</span>
                  </button>
                </>
              )}
              {[
                "language",
                "account-details",
                "security",
                "farm-details",
              ].includes(screen) && (
                <>
                  <button
                    className="text-button"
                    onClick={() =>
                      go(screen === "farm-details" ? "farm" : "profile")
                    }
                  >
                    &#8592;{" "}
                    {localize(
                      screen === "farm-details"
                        ? "Back to Farm"
                        : "Back to profile",
                    )}
                  </button>
                  <h2>{localize(screens[screen])}</h2>
                  {screen === "language" && (
                    <section className="card">
                      <p className="muted">
                        {localize("Choose your preferred language")}
                      </p>
                      <Language lang={lang} change={change} />
                    </section>
                  )}
                  {screen === "farm-details" && (
                    <FarmDetails
                      creationOnly
                      onCreated={() => go("farm")}
                      farms={user?.farms || []}
                      details={user?.farmDetails}
                      busy={busy}
                      onSave={saveFarmDetails}
                    />
                  )}
                  {screen === "account-details" && (
                    <UserDetails
                      user={user}
                      busy={busy}
                      onSave={saveUserDetails}
                      onUpload={uploadProfilePhoto}
                    />
                  )}
                  {screen === "security" && (
                    <section className="card">
                      <h3>{localize("PIN & security")}</h3>
                      <p>
                        {localize(
                          "Verify your mobile number with OTP to set a new PIN.",
                        )}
                      </p>
                      <button
                        disabled={busy}
                        onClick={async () => {
                          await api(endpoints.logout, { method: "POST" });
                          clear();
                        }}
                      >
                        {localize("Set PIN with OTP")}
                      </button>
                    </section>
                  )}
                </>
              )}
            </main>
            {(subscriptionPopup || featureLocked) && (
              <SubscriptionPopup
                api={api}
                onNavigate={go}
                onAccess={(access) => {
                  setSubscriptionAccess(access);
                  if (access && featureLocked) setSubscriptionPopup(false);
                }}
              />
            )}
            {!isAuth && screen !== "processing" && (
              <nav aria-label={localize("Main navigation")}>
                {[
                  ["home", "home", "Home"],
                  ["market", "market", "Market"],
                  ["services", "services", "Services"],
                  ["farm", "farm", "Farm"],
                  ["profile", "profile", "Profile"],
                ].map(([next, icon, text]) => (
                  <button
                    key={next}
                    className={
                      screen === next ||
                      (next === "services" && ["fertilizer-calculator", "pesticide-calculator"].includes(screen)) ||
                      (next === "farm" && screen === "farm-details") ||
                      (next === "profile" &&
                        [
                          "language",
                          "account-details",
                          "security",
                        ].includes(screen))
                        ? "active"
                        : ""
                    }
                    aria-current={
                      screen === next ||
                      (next === "services" && ["fertilizer-calculator", "pesticide-calculator"].includes(screen)) ||
                      (next === "farm" && screen === "farm-details") ||
                      (next === "profile" &&
                        [
                          "language",
                          "account-details",
                          "security",
                        ].includes(screen))
                        ? "page"
                        : undefined
                    }
                    onClick={() => go(next)}
                  >
                    <span className="nav-icon">
                      <Icon name={icon} />
                    </span>
                    <small>{localize(text)}</small>
                  </button>
                ))}
              </nav>
            )}
            {voiceOpen && (
              <div
                className="modal-backdrop"
                onClick={() => {
                  recognition.current?.abort();
                  setVoiceOpen(false);
                }}
              >
                <section
                  className="voice-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-label={localize("Voice assistant")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="handle" />
                  <h2>{localize("How can I help?")}</h2>
                  <p className="muted">
                    {localize(
                      "Speak naturally. I’m here to help with your plant care.",
                    )}
                  </p>
                  <button
                    className={`microphone ${listening ? "listening" : ""}`}
                    aria-label={localize("Start listening")}
                    onClick={voice}
                  >
                    <Icon name="mic" />
                  </button>
                  <b role="status">
                    {localize(
                      listening ? "Listening…" : "Tap the microphone to speak",
                    )}
                  </b>
                  {error && (
                    <p className="alert" role="alert">
                      {error}
                    </p>
                  )}
                  <h3>{localize("Try saying:")}</h3>
                  {voiceCommands.map((text) => (
                    <button
                      className="voice-command"
                      key={text}
                      onClick={() => command(text)}
                    >
                      {localize(text)}
                    </button>
                  ))}
                  <button
                    className="secondary"
                    onClick={() => {
                      recognition.current?.abort();
                      window.speechSynthesis?.cancel();
                      setVoiceOpen(false);
                    }}
                  >
                    {localize("Cancel")}
                  </button>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </LocaleContext.Provider>
  );
}
function Footer({ text }) {
  const localize = useLocale();
  return (
    <footer>
      <Leaf />
      <p>{localize(text)}</p>
    </footer>
  );
}
function Audit({ result }) {
  const localize = useLocale();
  return (
    <details className="card audit">
      <summary>{localize("Analysis details")}</summary>
      <dl>
        {[
          ["Plant", result.plant || result.provided_plant_name],
          ["Likely condition", result.condition],
          [
            "Date",
            result.created_at && new Date(result.created_at).toLocaleString(),
          ],
          ["Upload record", result.original_file_name],
          ["Model", result.model_name],
          ["Language", languages[result.requested_language]],
          ["Location", result.plant_location],
          ["Provided plant", result.provided_plant_name],
          ["Status", result.status],
          ["Consent", result.consent_to_analyze ? "Provided" : "Not recorded"],
        ].map(([label, value]) =>
          value ? (
            <React.Fragment key={label}>
              <dt>{localize(label)}</dt>
              <dd>{value}</dd>
            </React.Fragment>
          ) : null,
        )}
      </dl>
    </details>
  );
}
function Photo({ id, fallback, api, thumbnail = false }) {
  const localize = useLocale();
  const [src, setSrc] = useState(fallback),
    [failed, setFailed] = useState(false);
  const container = useRef();
  useEffect(() => {
    let active = true,
      url;
    setSrc(fallback);
    setFailed(false);
    const load = () => {
      if (!fallback)
        api(endpoints.image(id), {}, true)
          .then((blob) => {
            url = URL.createObjectURL(blob);
            if (active) setSrc(url);
            else URL.revokeObjectURL(url);
          })
          .catch(() => {
            if (active) setFailed(true);
          });
    };
    let observer;
    if (thumbnail && window.IntersectionObserver) {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      });
      observer.observe(container.current);
    } else load();
    return () => {
      active = false;
      observer?.disconnect();
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, fallback]);
  return (
    <div
      ref={container}
      className={thumbnail ? "thumbnail" : "photo-container"}
    >
      {src ? (
        <img
          className="photo result-photo"
          src={src}
          alt={localize("Analyzed leaf")}
        />
      ) : (
        <div className="photo-placeholder">
          <Leaf large />
          {!thumbnail && (failed ? "Photo unavailable" : "Loading leaf photo…")}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
