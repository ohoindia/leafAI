import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { UserDetails, UserAvatar } from "./UserDetails";
import { FarmDetails } from "./FarmDetails";
import { profileSettings, accountGreeting, languages, speechLanguages, brand, screens, careTips, photoChecks, photoTip, consentText, consentDetail, voiceCommands, analysisStatus, filterHistory } from '../../common/content.js';
import { endpoints, uploadRules, requestApi } from '../../common/api.js';
function Leaf({ large = false }) {
  return <img className={large ? "leaf large" : "leaf"} src="/leaf-logo.svg" alt="" />;
}
function Icon({ name }) {
  const paths = {
    home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
    camera: "M3 7h5l2-3h4l2 3h5v13H3Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    gallery: "M3 3h18v18H3Z m0 14 5-5 4 4 4-6 5 7 M8 7h.01",
    history: "M4 5v5h5 M4 10a8 8 0 1 1 0 5 M12 7v5l3 2",
    language: "M3 12h18 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 3c-5 5-5 13 0 18 5-5 5-13 0-18",
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
  const dialog = useRef(null);
  return <>
    <button type="button" className="language-action" aria-haspopup="dialog" onClick={() => dialog.current.showModal()}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 6.5h14M5 17.5h14" /></svg>
      Change language <span>{languages[lang]}</span>
    </button>
    <dialog ref={dialog} className="language-popup" aria-label="Choose your language" onClick={e => { if (e.target === e.currentTarget) dialog.current.close(); }}>
      <div className="language-popup-header"><h2>Choose your language</h2><button type="button" className="icon-button" aria-label="Close language selection" onClick={() => dialog.current.close()}>×</button></div>
      <p className="muted">Select your preferred language.</p>
      <div className="language-options">
        {Object.entries(languages).map(([id, text]) => <button type="button" key={id} lang={id} aria-pressed={lang === id} className={`language-option ${lang === id ? "selected" : ""}`} onClick={() => { change(id); dialog.current.close(); }}>
          <span className="language-glyph">{id === "en" ? "A" : id === "te" ? "అ" : "अ"}</span><span>{text}</span><span className="chevron">{lang === id ? "✓" : "○"}</span>
        </button>)}
      </div>
    </dialog>
  </>;
}
function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return <div className="password-field">
    <input {...props} type={visible ? "text" : "password"} />
    <button type="button" className="password-eye" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(!visible)}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
        {visible && <path d="m3 3 18 18" />}
      </svg>
    </button>
  </div>;
}
function App() {
  const [screen, setScreen] = useState("login"),
    [lang, setLang] = useState(localStorage.getItem("leaf-language") || "en"),
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
  const camera = useRef(),
    gallery = useRef(),
    recognition = useRef(),
    tokenRef = useRef(""),
    refreshRef = useRef(null);
  function go(next) {
    setError("");
    setNotice("");
    setScreen(next);
    window.scrollTo(0, 0);
  }
  function change(next) {
    setLang(next);
    localStorage.setItem("leaf-language", next);
    document.documentElement.lang = next;
  }
  function clear() {
    tokenRef.current = "";
    setToken("");
    setUser(null);
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
      refreshRef.current = requestApi(endpoints.refresh, { method: 'POST', credentials: 'include' })
        .then((x) => {
          tokenRef.current = x.accessToken;
          setToken(x.accessToken);
          return x.accessToken;
        })
        .finally(() => (refreshRef.current = null));
    return refreshRef.current;
  }
  async function api(url, opt = {}, image = false) {
    const send = () => requestApi(url, { ...opt, credentials: 'include', token: tokenRef.current, responseType: image ? 'blob' : 'json' });
    try { return await send(); }
    catch (error) {
      if (error.status !== 401 || url.startsWith('/api/auth/')) throw error;
      try { await refresh(); } catch (refreshError) { clear(); throw refreshError; }
      return send();
    }
  }

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
      api(endpoints.analyses)
        .then(setHistory)
        .catch((e) => setError(e.message));
      api(endpoints.me)
        .then(setUser)
        .catch((e) => setError(e.message));
    }
  }, [token, result]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function auth(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const b = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (screen === "register")
        await api(endpoints.register, {
          method: "POST",
          body: JSON.stringify({ ...b, language: lang }),
        });
      const x = await api(endpoints.login, {
        method: "POST",
        body: JSON.stringify({ email: b.email, password: b.password }),
      });
      tokenRef.current = x.accessToken;
      setToken(x.accessToken);
      setUser(x.user);
      change(x.user.language || lang);
      go("home");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveFarmDetails(farmDetails) {
    if (busy) return false;
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await api(endpoints.me, { method: "PATCH", body: JSON.stringify({ fullName: user.fullName, language: lang, farmDetails }) });
      setUser(data); setNotice("Farm details saved.");
      return true;
    } catch (e) { setError(e.message); return false; }
    finally { setBusy(false); }
  }
  async function saveUserDetails(fullName, userDetails) {
    if (busy) return false;
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await api(endpoints.me, { method: "PATCH", body: JSON.stringify({ fullName, language: lang, userDetails }) });
      setUser(data); setNotice("User details saved."); return true;
    } catch (e) { setError(e.message); return false; }
    finally { setBusy(false); }
  }
  async function uploadProfilePhoto(file) {
    if (busy) return false;
    setBusy(true); setError(""); setNotice("");
    try {
      const form = new FormData(); form.append("photo", file);
      setUser(await api(endpoints.profilePhoto, { method: "POST", body: form }));
      setNotice("Profile photo saved."); return true;
    } catch (e) { setError(e.message); return false; }
    finally { setBusy(false); }
  }
  async function account(e, action) {
    e.preventDefault(); if (busy) return;
    const b = Object.fromEntries(new FormData(e.currentTarget));
    if (b.confirmPassword !== undefined && b.password !== b.confirmPassword) return setError("Passwords do not match.");
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await api(["profile", "farm"].includes(action) ? endpoints.me : endpoints[action], { method: ["profile", "farm"].includes(action) ? "PATCH" : "POST", body: JSON.stringify(action === "farm" ? { fullName: user.fullName, language: lang, farmDetails: b } : action === "profile" ? { fullName: b.fullName, language: lang } : b) });
      if (["profile", "farm"].includes(action)) { setUser(data); setNotice("Profile saved."); }
      else if (action === "forgotPassword") { go("reset"); setNotice(data.message); }
      else { clear(); setNotice(data.message); }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
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
    let intent = "unknown";
    const tx = transcript.toLowerCase();
    if (/history|చరిత్ర|इतिहास/.test(tx)) {
      intent = "history";
      setVoiceOpen(false);
      go("history");
    } else if (/telugu|తెలుగు/.test(tx)) {
      intent = "language";
      change("te");
      speak("te");
    } else if (/hindi|हिंदी/.test(tx)) {
      intent = "language";
      change("hi");
      speak("hi");
    } else if (/english/.test(tx)) {
      intent = "language";
      change("en");
      speak("en");
    } else if (/treat|steps|చికిత్స|उपचार/.test(tx)) {
      intent = "read_result";
      speak(lang, true);
    } else if (/read|result|చదువు|पढ़/.test(tx)) {
      intent = "read_result";
      speak();
    } else if (/analy|విశ్లేష|विश्लेष/.test(tx)) {
      intent = "analyze";
      setVoiceOpen(false);
      go("capture");
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
    <div className={`phone ${isAuth ? "botanical" : ""}`}>
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
          <p>Opening Krishi Karshak…</p>
        </main>
      ) : (
        <>
          {!isAuth && (
            <header>             
              <div className="brand-inline">
                <Leaf />
                <div>
                  <b>{brand.name}</b>
                  <small>{brand.tagline}</small>
                </div>
              </div>
              <button className="account-avatar" aria-label={`Open profile for ${user?.fullName || "your account"}`} onClick={() => go("profile")}>
                <UserAvatar user={user} />
              </button>
            </header>
          )}
          {notice && <div className="notice" role="status">{notice}</div>}
          {error && (
            <div className="alert" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                ×
              </button>
            </div>
          )}
          <main className={isAuth ? "auth-content" : "content"}>
            {["login", "register"].includes(screen) && (
              <>                
                <div className="brand">
                  <Leaf large />
                  <h1>{brand.name}</h1>
                  <p>
                    {screen === "login" ? (
                      <>
                        Good Plants
                        <br />
                        Brighter Days
                      </>
                    ) : (
                      <>
                        Grow Today
                        <br />
                        Greener Tomorrow
                      </>
                    )}
                  </p>
                </div>
                <h2>{screen === "login" ? screens.login : screens.register}</h2>
                <p className="muted">
                  {screen === "login"
                    ? "Welcome back! Sign in to continue caring for your plants."
                    : "Join Krishi Karshak and start your plant care journey."}
                </p>
                <form onSubmit={auth}>
                  {screen === "register" && (
                    <input
                      name="fullName"
                      autoComplete="name"
                      aria-label="Full name"
                      placeholder="Full name"
                      required
                      minLength={2}
                      maxLength={150}
                    />
                  )}
                  <label htmlFor="auth-email">Email address</label>
                  <input id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    aria-label="Email"
                    placeholder="Email"
                    required
                    maxLength={255}
                  />
                  <label htmlFor="auth-password">Password</label>
                  <PasswordField id="auth-password"
                    name="password"
                    autoComplete={
                      screen === "register"
                        ? "new-password"
                        : "current-password"
                    }
                    aria-label="Password"
                    placeholder="Password (10+ characters)"
                    required
                    minLength={10}
                    maxLength={128}
                  />
                  {screen === "login" && <button type="button" className="text-button" onClick={() => go("forgot")}>Forgot password?</button>}
                  <button disabled={busy}>
                    {busy
                      ? "Please wait…"
                      : screen === "login"
                        ? "Sign in"
                        : "Create account"}
                  </button>
                </form>
                <div className="divider">or</div>
                <button
                  className="outline"
                  disabled={busy}
                  onClick={() => go(screen === "login" ? "register" : "login")}
                >
                  {screen === "login" ? "Create account" : "Sign in"}
                </button>
                <Language lang={lang} change={change} />
                <Footer text="Your plants. Your care. All in one place." />
              </>
            )}
            {["forgot", "reset"].includes(screen) && <section className="account-card">
              <Leaf large /><h1>{screen === "forgot" ? "Forgot your password?" : "Create a new password"}</h1>
              <p className="muted">{screen === "forgot" ? "Enter your account email to receive a recovery code valid for 15 minutes." : "Paste the code from your email. Choose a password with at least 10 characters."}</p>
              <form onSubmit={e => account(e, screen === "forgot" ? "forgotPassword" : "resetPassword")}>
                {screen === "forgot" ? <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={255} /></label> : <>
                  <label>Recovery code<input name="token" autoComplete="one-time-code" required maxLength={2048} /></label>
                  <label>New password<PasswordField name="password" autoComplete="new-password" required minLength={10} maxLength={128} /></label>
                  <label>Confirm password<PasswordField name="confirmPassword" autoComplete="new-password" required minLength={10} maxLength={128} /></label>
                </>}
                <button disabled={busy}>{busy ? "Please wait..." : screen === "forgot" ? "Send recovery code" : "Reset password"}</button>
              </form>
              {screen === "forgot" && <button className="text-button" onClick={() => go("reset")}>Already have a recovery code?</button>}
              <button className="outline" disabled={busy} onClick={() => go("login")}>Back to sign in</button>
            </section>}
            {screen === "home" && (
              <>
                <section className="greeting">
                  <span className="sun">☀</span>
                  <h1>
                    {accountGreeting(user?.fullName)}
                  </h1>
                  <p>
                    Healthy plants make
                    <br />a happier you.
                  </p>
                </section>
                <section className="analyze-card">
                  <span className="camera-circle">
                    <Icon name="camera" />
                  </span>
                  <h2>Analyze a leaf</h2>
                  <p>
                    Take a photo or choose from your gallery to detect plant
                    issues, get insights and care recommendations.
                  </p>
                  <button className="light" onClick={() => go("capture")}>
                    <Icon name="camera" /> Take photo
                  </button>
                  <button
                    className="glass"
                    onClick={() => gallery.current.click()}
                  >
                    <Icon name="gallery" /> Choose from gallery
                  </button>
                </section>
                <button className="feature card" onClick={() => go("history")}>
                  <span className="feature-icon">
                    <Icon name="history" />
                  </span>
                  <span>
                    <b>Recent analyses</b>
                    <small>View your past leaf analyses and results</small>
                  </span>
                  <span>›</span>
                </button>
                <button className="feature card" onClick={() => go("learn")}>
                  <span className="feature-icon yellow">☀</span>
                  <span>
                    <b>Plant care tips</b>
                    <small>Everyday habits for healthier, happier plants</small>
                  </span>
                  <span>›</span>
                </button>
              </>
            )}
            {screen === "capture" && (
              <>
                <h2>{screens.capture}</h2>
                <div className="camera-guide">
                  <Leaf large />
                  <div className="frame" />
                  <p>Place one leaf inside the frame</p>
                  <small>Your device camera opens when you tap below.</small>
                </div>
                <section className="soft card">
                  <h3>A clearer photo helps</h3>
                  <p>
                    {photoTip}
                  </p>
                </section>
                <button onClick={() => camera.current.click()}>
                  Open camera
                </button>
                <button
                  className="outline"
                  onClick={() => gallery.current.click()}
                >
                  Choose from gallery
                </button>
              </>
            )}
            {screen === "review" && (
              <>
                <h2>{screens.review}</h2>
                <img
                  className="photo review-photo"
                  src={preview}
                  alt="Selected leaf for review"
                />
                <section className="soft card">
                  <h3>Check your photo</h3>
                  <p>Confirm these before continuing:</p>
                  {photoChecks.map((text) => (
                    <p className="quality" key={text}>
                      <span>✓</span>
                      {text}
                    </p>
                  ))}
                </section>
                <div className="button-row">
                  <button className="outline" onClick={() => go("capture")}>
                    Retake
                  </button>
                  <button onClick={() => go("details")}>Use photo</button>
                </div>
              </>
            )}
            {screen === "details" && (
              <>
                <h2>{screens.details}</h2>
                <div className="ready soft card">
                  <img src={preview} alt="Leaf ready to analyze" />
                  <div>
                    <h3>Ready to analyze</h3>
                    <p>
                      Add a few details (optional) for more helpful results.
                    </p>
                  </div>
                </div>
                <label>
                  Plant name <span className="muted">(optional)</span>
                  <input
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    maxLength={150}
                    placeholder="e.g. Tomato"
                  />
                </label>
                <label>
                  Location <span className="muted">(optional)</span>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    maxLength={255}
                    placeholder="e.g. Garden, Balcony, Indoors"
                  />
                </label>
                <label className="consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    {consentText}
                    <small>
                      {consentDetail}
                    </small>
                  </span>
                </label>
                <button disabled={!consent || busy} onClick={analyze}>
                  Analyze leaf
                </button>
              </>
            )}
            {screen === "processing" && (
              <div className="processing" role="status" aria-live="polite">
                <div className="scanner">
                  <img src={preview} alt="Leaf being analyzed" />
                  <div className="scan-line" />
                </div>
                <h2>Analyzing your leaf…</h2>
                <p>Checking the photo and assessing visible plant health.</p>
                <ol className="steps">
                  <li>Image received</li>
                  <li className="active">AI analysis in progress</li>
                  <li>Preparing recommendations</li>
                </ol>
                <div className="soft card">
                  This may take a few moments.
                  <br />
                  Good plant care is worth the wait!
                </div>
              </div>
            )}
            {screen === "result" && result && (
              <>
                <Photo id={result.id} fallback={preview} api={api} />
                <div className="status-banner">
                  <b>{status(result)}</b>
                  <small>
                    {result.status === "REVIEW_REQUIRED"
                      ? "The image or confidence needs closer review. Consider a clearer photo."
                      : "AI screening based on visible evidence."}
                  </small>
                </div>
                {out ? (
                  <>
                    <div className="metrics">
                      <div>
                        <small>Likely condition</small>
                        <h2>{result.condition}</h2>
                      </div>
                      <div>
                        <small>Confidence</small>
                        <h2>{Math.round(result.confidence * 100)}%</h2>
                      </div>
                    </div>
                    <p className="severity">
                      Severity <b>{result.severity}</b>
                    </p>
                    <section className="soft card">
                      <h3>Summary</h3>
                      <p>{out.summary}</p>
                    </section>
                    <p className="small">Select language for results</p>
                    <div className="result-languages">
                      {Object.entries(languages).map(([id, text]) => (
                        <button
                          key={id}
                          className={lang === id ? "" : "outline"}
                          aria-pressed={lang === id}
                          onClick={() => change(id)}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                    <div className="button-row">
                      <button
                        className="outline"
                        onClick={() => setVoiceOpen(true)}
                      >
                        ◖ Listen
                      </button>
                      <button
                        onClick={() => {
                          setTab("analysis");
                          go("full");
                        }}
                      >
                        View full analysis →
                      </button>
                    </div>
                    <p className="disclaimer">ⓘ {out.disclaimer}</p>
                  </>
                ) : (
                  <section className="card">
                    <h3>
                      {result.status === "FAILED"
                        ? "Analysis could not be completed"
                        : "Result is not ready"}
                    </h3>
                    <p>Take a new photo and try again.</p>
                    <button onClick={() => go("capture")}>Try again</button>
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
                    Full analysis
                  </button>
                  <button
                    className={tab === "resources" ? "active" : ""}
                    onClick={() => setTab("resources")}
                  >
                    Related resources
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
                      ["Treatment options", out?.treatment || result.treatment],
                      ["Prevention", out?.prevention || result.prevention],
                    ].map(([title, items]) => (
                      <section className="card detail-section" key={title}>
                        <h3>{title}</h3>
                        <ul>
                          {items?.map((text, i) => (
                            <li key={i}>{text}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                    <section className="expert card">
                      <h3>When to consult an expert</h3>
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
                        Summary, symptoms and actions use your selected
                        language. Additional guidance is provided in English.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <section className="card">
                      <h3>Get local guidance</h3>
                      <p>
                        Share your photo and analysis with a local
                        horticulturist or agricultural extension service,
                        especially if symptoms spread.
                      </p>
                      <p>
                        Follow product labels and local guidance before using
                        treatments.
                      </p>
                    </section>
                    <button className="outline" onClick={() => go("learn")}>
                      Open plant care tips
                    </button>
                  </>
                )}
                <button className="outline" onClick={() => setVoiceOpen(true)}>
                  Voice assistant
                </button>
              </>
            )}
            {screen === "history" && (
              <>
                <h2>{screens.history}</h2>
                <p className="muted">Keep track of your plant health journey</p>
                <input
                  type="search"
                  aria-label="Search plants and conditions"
                  placeholder="Search plants, conditions…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  aria-label="Filter analyses"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All analyses</option>
                  <option value="attention">Needs attention</option>
                  <option value="review">Review required</option>
                </select>
                {busy && <p role="status">Opening analysis…</p>}
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
                      {x.confidence == null
                        ? "Confidence pending"
                        : `${Math.round(x.confidence * 100)}% confidence`}{" "}
                      · {x.severity}
                    </small>
                  </button>
                ))}
                {!shown.length && (
                  <section className="empty card">
                    <Leaf large />
                    <h3>
                      {history.length
                        ? "No matching analyses"
                        : "Your plant journey starts here"}
                    </h3>
                    <p>
                      {history.length
                        ? "Try another search or filter."
                        : "Analyze your first leaf to save its results here."}
                    </p>
                    <button onClick={() => go("capture")}>
                      Analyze a leaf
                    </button>
                  </section>
                )}
              </>
            )}
            {screen === "learn" && (
              <>
                <h2>{screens.learn}</h2>
                <p className="muted">Small habits. Healthier plants.</p>
                {careTips.map(([title, text]) => (
                  <section className="soft card" key={title}>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </section>
                ))}
              </>
            )}
            {screen === "profile" && <>
              <h2>{screens.profile}</h2>
                <section className="profile-hero card">
                  <UserAvatar user={user} large />
                  <div><h3>{user?.fullName || "Your account"}</h3><p className="muted">{user?.email}</p></div>
                </section>
              <div className="profile-menu">
                {profileSettings.map(item => <button key={item.route} className="profile-menu-card" onClick={() => go(item.route)}>
                  <span className="profile-menu-icon"><Icon name={item.icon} /></span>
                  <span className="profile-menu-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span><span aria-hidden="true">&#8250;</span>
                </button>)}
              </div>
              <button className="profile-menu-card" disabled={busy} onClick={logout}><span className="profile-menu-icon">&#8618;</span><span className="profile-menu-copy"><strong>Sign out</strong><small>Sign out of your account</small></span><span aria-hidden="true">&#8250;</span></button>
            </>}
            {["language", "account-details", "security", "farm-details"].includes(screen) && <>
              <button className="text-button" onClick={() => go("profile")}>&#8592; Back to profile</button>
              <h2>{screens[screen]}</h2>
              {screen === "language" && <section className="card"><p className="muted">Choose your preferred language</p><Language lang={lang} change={change} /></section>}
              {screen === "farm-details" && <FarmDetails details={user?.farmDetails} busy={busy} onSave={saveFarmDetails} />}
              {screen === "account-details" && <UserDetails user={user} busy={busy} onSave={saveUserDetails} onUpload={uploadProfilePhoto} />}
              {screen === "security" && <>
                <section className="card"><h3>Password & security</h3>
                  <form onSubmit={e => account(e, "changePassword")}>
                    <label>Current password<PasswordField name="currentPassword" autoComplete="current-password" required minLength={10} maxLength={128} /></label>
                    <label>New password<PasswordField name="password" autoComplete="new-password" required minLength={10} maxLength={128} /></label>
                    <label>Confirm password<PasswordField name="confirmPassword" autoComplete="new-password" required minLength={10} maxLength={128} /></label>
                    <button disabled={busy}>Update password</button>
                  </form>
                </section>
              </>}
            </>}

          </main>
          {!isAuth && screen !== "processing" && (
            <nav aria-label="Main navigation">
              {[
                ["home", "home", "Home"],
                ["capture", "search", "Diagnose"],
                ["history", "history", "History"],
                ["profile", "profile", "Profile"],
              ].map(([next, icon, text]) => (
                <button
                  key={next}
                  className={(screen === next || (next === "profile" && ["language", "account-details", "security", "farm-details"].includes(screen))) ? "active" : ""}
                  aria-current={(screen === next || (next === "profile" && ["language", "account-details", "security", "farm-details"].includes(screen))) ? "page" : undefined}
                  onClick={() => go(next)}
                >
                  <Icon name={icon} />
                  <small>{text}</small>
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
                aria-label="Voice assistant"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="handle" />
                <h2>How can I help?</h2>
                <p className="muted">
                  Speak naturally. I’m here to help with your plant care.
                </p>
                <button
                  className={`microphone ${listening ? "listening" : ""}`}
                  aria-label="Start listening"
                  onClick={voice}
                >
                  <Icon name="mic" />
                </button>
                <b role="status">
                  {listening ? "Listening…" : "Tap the microphone to speak"}
                </b>
                {error && (
                  <p className="alert" role="alert">
                    {error}
                  </p>
                )}
                <h3>Try saying:</h3>
                {voiceCommands.map((text) => (
                  <button
                    className="voice-command"
                    key={text}
                    onClick={() => command(text)}
                  >
                    {text}
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
                  Cancel
                </button>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
function Footer({ text }) {
  return (
    <footer>
      <Leaf />
      <p>{text}</p>
    </footer>
  );
}
function Audit({ result }) {
  return (
    <details className="card audit">
      <summary>Analysis details</summary>
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
              <dt>{label}</dt>
              <dd>{value}</dd>
            </React.Fragment>
          ) : null,
        )}
      </dl>
    </details>
  );
}
function Photo({ id, fallback, api, thumbnail = false }) {
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
        <img className="photo result-photo" src={src} alt="Analyzed leaf" />
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
