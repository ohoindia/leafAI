import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
const copy = {
  en: {
    title: "LeafCare AI",
    sub: "Understand your plant leaf in seconds",
    upload: "Upload or capture a leaf",
    analyze: "Analyze leaf",
    listen: "Voice command",
    history: "Recent analyses",
    login: "Sign in",
    register: "Create account",
    consent: "I consent to this image being processed for AI analysis.",
    tip: "For best results: one leaf, natural light, both sides, plain background.",
  },
  te: {
    title: "లీఫ్‌కేర్ AI",
    sub: "మీ మొక్క ఆకును క్షణాల్లో అర్థం చేసుకోండి",
    upload: "ఆకు ఫోటోను అప్‌లోడ్ చేయండి",
    analyze: "ఆకును విశ్లేషించండి",
    listen: "వాయిస్ కమాండ్",
    history: "ఇటీవలి విశ్లేషణలు",
    login: "లాగిన్",
    register: "ఖాతా సృష్టించండి",
    consent:
      "AI విశ్లేషణ కోసం ఈ చిత్రాన్ని ప్రాసెస్ చేయడానికి నేను అంగీకరిస్తున్నాను.",
    tip: "మంచి ఫలితాల కోసం: ఒక ఆకు, సహజ కాంతి, రెండు వైపులు, సాధారణ నేపథ్యం.",
  },
  hi: {
    title: "लीफकेयर AI",
    sub: "अपने पौधे की पत्ती को कुछ सेकंड में समझें",
    upload: "पत्ती की फोटो अपलोड करें",
    analyze: "पत्ती का विश्लेषण करें",
    listen: "वॉइस कमांड",
    history: "हाल के विश्लेषण",
    login: "साइन इन",
    register: "खाता बनाएँ",
    consent:
      "मैं AI विश्लेषण के लिए इस चित्र को प्रोसेस करने की सहमति देता/देती हूँ।",
    tip: "बेहतर परिणाम: एक पत्ती, प्राकृतिक रोशनी, दोनों तरफ, सादा बैकग्राउंड।",
  },
};
const speechLang = { en: "en-IN", te: "te-IN", hi: "hi-IN" };
function App() {
  const [lang, setLang] = useState("en"),
    [token, setToken] = useState(sessionStorage.token || ""),
    [user, setUser] = useState(null),
    [mode, setMode] = useState("login"),
    [file, setFile] = useState(),
    [preview, setPreview] = useState(),
    [consent, setConsent] = useState(false),
    [result, setResult] = useState(),
    [loading, setLoading] = useState(false),
    [history, setHistory] = useState([]),
    form = useRef();
  const t = copy[lang];
  const api = async (url, opt = {}) => {
    let r = await fetch(url, {
      ...opt,
      credentials: "include",
      headers: {
        ...(opt.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opt.headers,
      },
    });
    if (r.status === 401 && url != "/api/auth/login") {
      const rr = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (rr.ok) {
        const x = await rr.json();
        sessionStorage.token = x.accessToken;
        setToken(x.accessToken);
        r = await fetch(url, {
          ...opt,
          credentials: "include",
          headers: {
            ...(opt.body instanceof FormData
              ? {}
              : { "Content-Type": "application/json" }),
            Authorization: `Bearer ${x.accessToken}`,
          },
        });
      }
    }
    if (!r.ok) throw new Error((await r.json()).error || "Request failed");
    return r.status === 204 ? null : r.json();
  };
  useEffect(() => {
    if (token)
      api("/api/analyses")
        .then(setHistory)
        .catch(() => {});
  }, [token, result]);
  const submitAuth = async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (mode === "register") {
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ ...b, language: lang }),
        });
        setMode("login");
        return;
      }
      const x = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(b),
      });
      sessionStorage.token = x.accessToken;
      setToken(x.accessToken);
      setUser(x.user);
    } catch (e) {
      alert(e.message);
    }
  };
  const analyze = async () => {
    if (!file || !consent) return alert("Choose an image and provide consent.");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("leaf", file);
      fd.append("language", lang);
      fd.append("consent", "true");
      setResult(await api("/api/analyses", { method: "POST", body: fd }));
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };
  const speak = () => {
    if (!result) return;
    const out = result.translations[lang];
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      `${out.summary}. ${out.actions.join(". ")}`,
    );
    u.lang = speechLang[lang];
    speechSynthesis.speak(u);
  };
  const voice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR)
      return alert(
        "Voice recognition is not supported in this browser. Use Chrome or Edge.",
      );
    const r = new SR();
    r.lang = speechLang[lang];
    r.onresult = async (e) => {
      const tx = e.results[0][0].transcript.toLowerCase();
      let intent = "unknown",
        ok = true;
      if (/analy|విశ్లేష|विश्लेष/.test(tx)) {
        intent = "analyze";
        analyze();
      } else if (/history|చరిత్ర|इतिहास/.test(tx)) {
        intent = "history";
        document
          .querySelector("#history")
          ?.scrollIntoView({ behavior: "smooth" });
      } else if (/read|చదువు|पढ़/.test(tx)) {
        intent = "read_result";
        speak();
      } else if (/english/.test(tx)) {
        intent = "language";
        setLang("en");
      } else if (/తెలుగు|telugu/.test(tx)) {
        intent = "language";
        setLang("te");
      } else if (/हिंदी|hindi/.test(tx)) {
        intent = "language";
        setLang("hi");
      } else ok = false;
      await api("/api/voice-commands", {
        method: "POST",
        body: JSON.stringify({
          transcript: tx,
          language: lang,
          intent,
          successful: ok,
          analysisId: result?.id || null,
        }),
      }).catch(() => {});
      if (!ok) alert(`Command not recognized: ${tx}`);
    };
    r.start();
  };
  if (!token)
    return (
      <main className="auth">
        <section className="brand">
          <span className="leaf">⌁</span>
          <h1>{t.title}</h1>
          <p>{t.sub}</p>
        </section>
        <form className="card" onSubmit={submitAuth}>
          {mode === "register" && (
            <input
              name="fullName"
              placeholder="Full name"
              required
              minLength="2"
            />
          )}
          <input name="email" type="email" placeholder="Email" required />
          <input
            name="password"
            type="password"
            placeholder="Password (10+ characters)"
            required
            minLength="10"
          />
          <button>{mode === "login" ? t.login : t.register}</button>
          <button
            type="button"
            className="link"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? t.register : t.login}
          </button>
        </form>
        <Lang lang={lang} setLang={setLang} />
      </main>
    );
  const out = result?.translations?.[lang];
  return (
    <>
      <header>
        <div>
          <b>🌿 {t.title}</b>
          <small>{user?.fullName || ""}</small>
        </div>
        <Lang lang={lang} setLang={setLang} />
      </header>
      <main className="app">
        <section className="hero">
          <p className="eyebrow">AI PLANT HEALTH ASSISTANT</p>
          <h1>{t.sub}</h1>
          <p>{t.tip}</p>
        </section>
        <section className="grid">
          <article className="card uploader">
            <h2>{t.upload}</h2>
            <label className="drop">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={(e) => {
                  const f = e.target.files[0];
                  setFile(f);
                  setPreview(f && URL.createObjectURL(f));
                }}
              />
              {preview ? (
                <>
                  <img src={preview} />
                  <span>Tap to replace</span>
                </>
              ) : (
                <>
                  <b>📷</b>
                  <span>Camera or gallery</span>
                </>
              )}
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {t.consent}
            </label>
            <button disabled={loading} onClick={analyze}>
              {loading ? "Analyzing…" : t.analyze}
            </button>
            <button className="secondary" onClick={voice}>
              🎙 {t.listen}
            </button>
          </article>
          <article className="card result">
            {out ? (
              <>
                <div className="resultHead">
                  <div>
                    <p className="eyebrow">RESULT</p>
                    <h2>{result.plant}</h2>
                    <p>{result.scientific_name}</p>
                  </div>
                  <span className={`severity ${result.severity}`}>
                    {result.severity}
                  </span>
                </div>
                <h3>
                  {result.condition} · {Math.round(result.confidence * 100)}%
                </h3>
                <p>{out.summary}</p>
                <h3>Visible symptoms</h3>
                <ul>
                  {out.symptoms.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
                <h3>Recommended actions</h3>
                <ol>
                  {out.actions.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ol>
                <button className="secondary" onClick={speak}>
                  🔊 Read result aloud
                </button>
                <p className="disclaimer">{out.disclaimer}</p>
              </>
            ) : (
              <div className="empty">
                🍃<h2>Your analysis will appear here</h2>
                <p>
                  Upload a clear leaf image to identify likely disease, pest,
                  nutrient, or environmental stress.
                </p>
              </div>
            )}
          </article>
        </section>
        <section id="history" className="card history">
          <h2>{t.history}</h2>
          {history.length ? (
            history.map((x) => (
              <div className="historyRow" key={x.id}>
                <span>🌱</span>
                <div>
                  <b>{x.plant_name || "Unidentified plant"}</b>
                  <small>{x.disease_name || x.status}</small>
                </div>
                <time>{new Date(x.created_at).toLocaleDateString()}</time>
              </div>
            ))
          ) : (
            <p>No analyses yet.</p>
          )}
        </section>
      </main>
    </>
  );
}
function Lang({ lang, setLang }) {
  return (
    <select
      aria-label="Language"
      value={lang}
      onChange={(e) => setLang(e.target.value)}
    >
      <option value="en">English</option>
      <option value="te">తెలుగు</option>
      <option value="hi">हिंदी</option>
    </select>
  );
}
createRoot(document.getElementById("root")).render(<App />);
