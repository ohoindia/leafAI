export const brand = {
  name: "Krishi Karshak",
  tagline: "Healthier Plants. Brighter Tomorrows.",
};
export const languages = { en: "English", te: "తెలుగు", hi: "हिंदी" };
export const speechLanguages = { en: "en-IN", te: "te-IN", hi: "hi-IN" };
export const screens = {
  language: "Choose your language",
  login: "Sign in",
  forgot: "Password recovery",
  register: "Create account",
  home: "Home",
  capture: "Capture leaf photo",
  review: "Review photo",
  details: "Add details & consent",
  processing: "Analyzing your leaf…",
  result: "Analysis result",
  full: "Full analysis",
  history: "Analysis history",
  learn: "Plant care tips",
  profile: "Your profile",
  "account-details": "Account details",
  "farm-details": "Farm and crops",
  security: "Password & security",
  voice: "Voice assistant",
};
export const photoChecks = [
  "One leaf is clear and in focus",
  "Good, even lighting",
  "Plain background",
];
export const photoTip =
  "Use natural light, keep the leaf in focus and choose a plain background.";
export const consentText = "I consent to AI analysis of this image";
export const consentDetail =
  "Your photo is stored securely with your analysis history and processed to analyze plant health.";
export const voiceCommands = [
  "Read my result",
  "Explain in Telugu",
  "Show treatment steps",
  "Open history",
];
export const careTips = [
  [
    "Water thoughtfully",
    "Check soil moisture before watering. Water at the base and let excess water drain.",
  ],
  [
    "Find the right light",
    "Match light to your plant’s needs. Move plants gradually when changing their light exposure.",
  ],
  [
    "Keep an eye on leaves",
    "Check both sides regularly. Photograph changes so you can compare over time.",
  ],
  [
    "Give plants room",
    "Keep good airflow around plants, clean tools and remove fallen debris.",
  ],
];
export function analysisStatus(x) {
  if (x.status === "FAILED") return "Analysis failed";
  if (x.status === "PROCESSING") return "Processing";
  if (x.status === "REVIEW_REQUIRED") return "Review required";
  if (
    /^healthy\b|no visible (issues|disease)/i.test(
      x.condition || x.disease_name || "",
    )
  )
    return "Healthy";
  return x.severity === "LOW" ? "Monitor" : "Needs attention";
}
export function filterHistory(items, query, filter) {
  return items.filter(
    (x) =>
      `${x.plant_name || ""} ${x.disease_name || ""} ${x.provided_plant_name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "attention"
          ? ["MEDIUM", "HIGH", "CRITICAL"].includes(x.severity)
          : x.status === "REVIEW_REQUIRED")),
  );
}

export function accountInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts.slice(0, 2).map(part => Array.from(part)[0]).join("") : Array.from(parts[0] || "").slice(0, 2).join("")).toLocaleUpperCase() || "KK";
}
export function accountGreeting(name = "", hour = new Date().getHours()) {
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${greeting}${name.trim() ? `, ${name.trim()}` : ""}!`;
}

export const profileSettings = [
  { route: "farm-details", title: "Farm and crops", subtitle: "Farm details, present crop and previous crop", icon: "profile" },
  { route: "language", title: "Change language", subtitle: "Choose your preferred language", icon: "language" },
  { route: "account-details", title: "Account details", subtitle: "View and update your personal details", icon: "profile" },
  { route: "security", title: "Password & security", subtitle: "Manage your account password", icon: "security" },
];
