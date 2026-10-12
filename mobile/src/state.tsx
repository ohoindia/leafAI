import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import * as Speech from "expo-speech";
import { request, ApiError } from "./api";
import { endpoints, uploadRules } from "../../common/api.js";
import { speechLanguages, brand, screens } from "../../common/content.js";
import type { Analysis, HistoryItem, Language, User } from "../../common/types";
import { normalizeLanguage } from "../../common/locale.js";
import { subscriptionRequired } from "../../common/subscription.js";
import { session, preferenceStorage } from "./session";
import type { SessionTokens } from "../../common/persistent-session.js";

function useAppState() {
  const [lang, setLang] = useState<Language>("en");
  const [restoring, setRestoring] = useState(true);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User>();
  const [subscriptionPopup, setSubscriptionPopup] = useState(false);
  const [billingStatus, setBillingStatus] = useState<{enabled: boolean; access: boolean | null}>({enabled: false, access: null});
  useEffect(() => {
    let active = true;
    const check = () => request<{enabled: boolean; access: boolean}>("/api/billing", token).then(value => { if (active) setBillingStatus(value); }).catch(() => {});
    if (!token) return;
    void check();
    const timer = setInterval(() => void check(), 60000);
    return () => { active = false; clearInterval(timer); };
  }, [token]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const languageWrites = useRef(Promise.resolve());
  const [profilePhotoDraft, setProfilePhotoDraft] = useState<string>();
  const [photo, setPhoto] = useState<string>();
  const [consent, setConsent] = useState(false);
  const [plantName, setPlantName] = useState("");
  const [location, setLocation] = useState("");
  const [result, setResult] = useState<Analysis>();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  useEffect(() => {
    const unsubscribe = session.subscribe(accessToken => {
      setToken(accessToken);
      if (accessToken) setRestoring(false);
      if (!accessToken) {
        setSubscriptionPopup(false);
        setUser(undefined);
        setHistory([]);
        setResult(undefined);
        setPhoto(undefined);
        setProfilePhotoDraft(undefined);
        setConsent(false);
        setPlantName("");
        setLocation("");
      }
    });
    let active = true;
    void (async () => {
      try {
        const savedLanguage = await preferenceStorage.get("leaf-language");
        if (active && savedLanguage) setLang(normalizeLanguage(savedLanguage));
        const accessToken = await session.restore();
        if (active && accessToken) {
          const profile = await request<User>(endpoints.me, accessToken);
          if (active) setUser(profile);
          const billing = await request<{enabled: boolean; access: boolean}>("/api/billing", accessToken);
          if (active) setBillingStatus(billing);
          if (billing.access) {
            const analyses = await request<HistoryItem[]>(endpoints.analyses, accessToken);
            if (active) setHistory(analyses);
          }
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to restore your session.");
      } finally { if (active) setRestoring(false); }
    })();
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(
    () => () => {
      void Speech.stop();
    },
    [],
  );
  function go(screen: keyof typeof screens) {
    setError("");
    setNotice("");
    setSubscriptionPopup(subscriptionRequired(screen, billingStatus.enabled, billingStatus.access));
    router.push(`/${screen}`);
  }
  function change(value: Language) {
    const language = normalizeLanguage(value);
    setLang(language);
    languageWrites.current = languageWrites.current.catch(() => {}).then(() => preferenceStorage.set("leaf-language", language));
    void languageWrites.current.catch(() => setError("Unable to save your language preference."));
    void Speech.stop();
  }
  async function clearSession() {
    await session.clear();
    void Speech.stop();
    setToken("");
    setUser(undefined);
    setPhoto(undefined);
    setProfilePhotoDraft(undefined);
    setResult(undefined);
    setConsent(false);
    setHistory([]);
    setPlantName("");
    setLocation("");
    setNotice("");
    router.replace("/login");
  }
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && token) {
        await clearSession();
        setError("Session expired. Please sign in again.");
      } else
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong. Please try again.",
        );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function loadHistory(accessToken = token) {
    const billing = await request<{enabled: boolean; access: boolean}>("/api/billing", accessToken);
    setBillingStatus(billing);
    if (!billing.access) { setHistory([]); return; }
    setHistory(await request<HistoryItem[]>(endpoints.analyses, accessToken));
  }
  async function authenticate(
    identifier: string,
    pin: string,
    pinLogin = false,
  ) {
    return run(async () => {
      const data = await request<SessionTokens & { user: User }>(
        endpoints.login,
        "",
        {
          method: "POST",
          body: JSON.stringify(
            pinLogin
              ? { mobileNumber: identifier, pin, language: lang, sessionType: "mobile" }
              : { guid: identifier, pin, language: lang, sessionType: "mobile" },
          ),
        },
      );
      await session.save({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setUser(data.user);
      router.replace("/home");
      await loadHistory(data.accessToken);
    });
  }
  async function saveProfile(
    fullName: string,
    farmDetails?: User["farmDetails"],
    userDetails?: User["userDetails"],
    farmId?: string,
    newCrop = false,
    addPreviousCrop = false,
  ) {
    return run(async () => {
      if (fullName.trim().length < 2 || fullName.trim().length > 150)
        throw new Error("Enter a full name between 2 and 150 characters.");
      const data = await request<User>(endpoints.me, token, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: fullName.trim(),
          language: lang,
          farmDetails,
          userDetails,
          farmId,
          newCrop,
          addPreviousCrop,
        }),
      });
      setUser(data);
      setNotice("Profile saved.");
    });
  }
  async function pickProfilePhoto(camera: boolean) {
    return run(async () => {
      if (
        camera &&
        !(await ImagePicker.requestCameraPermissionsAsync()).granted
      )
        throw new Error(
          "Allow camera access in Settings, or choose from gallery.",
        );
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      };
      const selected = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (selected.canceled) return;
      const asset = selected.assets[0];
      const resized = await ImageManipulator.manipulateAsync(
        asset.uri,
        [
          {
            resize:
              asset.width >= asset.height
                ? { width: Math.min(asset.width, 768) }
                : { height: Math.min(asset.height, 768) },
          },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      setProfilePhotoDraft(resized.uri);
    });
  }
  async function uploadProfilePhoto() {
    if (!profilePhotoDraft) return;
    return run(async () => {
      const form = new FormData();
      const file = new File(profilePhotoDraft);
      if (file.size > uploadRules.maxBytes)
        throw new Error("Choose a photo smaller than 4 MiB.");
      form.append("photo", file, "profile.jpg");
      setUser(
        await request<User>(endpoints.profilePhoto, token, {
          method: "POST",
          body: form,
        }),
      );
      setProfilePhotoDraft(undefined);
      setNotice("Profile photo saved.");
    });
  }
  async function recover(email: string) {
    return run(async () => {
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        email.trim().length > 255
      )
        throw new Error("Enter a valid email address.");
      const data = await request<{ message: string }>(
        endpoints.forgotPassword,
        "",
        { method: "POST", body: JSON.stringify({ email: email.trim() }) },
      );
      setNotice(data.message);
    });
  }
  async function resetPassword(recoveryToken: string, password: string) {
    return run(async () => {
      if (!recoveryToken.trim())
        throw new Error("Enter the recovery code from your email.");
      if (password.length < 10 || password.length > 128)
        throw new Error("Use a password between 10 and 128 characters.");
      await request(endpoints.resetPassword, "", {
        method: "POST",
        body: JSON.stringify({ token: recoveryToken.trim(), password }),
      });
      router.replace("/login");
      setNotice("Password reset. Sign in with your new password.");
    });
  }
  async function changePassword(currentPassword: string, password: string) {
    return run(async () => {
      if (
        currentPassword.length < 10 ||
        currentPassword.length > 128 ||
        password.length < 10 ||
        password.length > 128
      )
        throw new Error(
          "Passwords must contain between 10 and 128 characters.",
        );
      await request(endpoints.changePassword, token, {
        method: "POST",
        body: JSON.stringify({ currentPassword, password }),
      });
      await clearSession();
      setNotice("Password updated. Please sign in again.");
    });
  }
  async function pick(camera: boolean) {
    await run(async () => {
      if (
        camera &&
        !(await ImagePicker.requestCameraPermissionsAsync()).granted
      )
        throw new Error(
          "Allow camera access in Settings, or choose a photo from your gallery.",
        );
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 1,
      };
      const selected = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (selected.canceled) return;
      const asset = selected.assets[0];
      if (Math.min(asset.width, asset.height) < uploadRules.minDimension)
        throw new Error("Choose a photo at least 300 × 300 pixels.");
      const resized = await ImageManipulator.manipulateAsync(
        asset.uri,
        [
          {
            resize:
              asset.width >= asset.height
                ? { width: Math.min(asset.width, 1600) }
                : { height: Math.min(asset.height, 1600) },
          },
        ],
        {
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );
      if ((resized.base64?.length || 0) * 0.75 > uploadRules.maxBytes)
        throw new Error("Choose a photo smaller than 4 MiB.");
      setPhoto(resized.uri);
      setConsent(false);
      setPlantName("");
      setLocation("");
      setResult(undefined);
      void Speech.stop();
      go("review");
    });
  }
  async function analyze() {
    if (!photo || !consent || lock.current) return;
    await run(async () => {
      go("processing");
      const form = new FormData();
      // Expo 57 fetch requires file bytes, rather than React Native URI parts.
      form.append("leaf", new File(photo), "leaf.jpg");
      form.append("language", lang);
      form.append("consent", "true");
      form.append("plantName", plantName);
      form.append("location", location);
      let data: Analysis;
      try {
        data = await request<Analysis>(endpoints.analyses, token, {
          method: "POST",
          body: form,
        });
      } catch (e) {
        router.replace("/details");
        throw e;
      }
      setResult(data);
      router.replace("/result");
      await loadHistory();
    });
  }
  async function openHistory(item: HistoryItem) {
    await run(async () => {
      const data = await request<Analysis>(endpoints.analysis(item.id), token);
      setResult(data);
      setPhoto(undefined);
      void Speech.stop();
      go("result");
    });
  }
  async function speak(actions = false, language = lang) {
    const out = result?.translations?.[language];
    if (!out) {
      throw new Error("Open an analysis result first.");
    }
    await Speech.stop();
    Speech.speak(
      actions
        ? out.actions.join(". ")
        : `${out.summary}. ${out.actions.join(". ")}`,
      {
        language: speechLanguages[language],
        onError: () =>
          Alert.alert(
            brand.name,
            "Install a voice for this language in device settings.",
          ),
      },
    );
  }
  async function command(transcript: string) {
    await run(async () => {
      let intent = "unknown";
      if (/history|చరిత్ర|इतिहास/i.test(transcript)) {
        intent = "history";
        go("history");
      } else if (/telugu|తెలుగు|hindi|हिंदी|kannada|ಕನ್ನಡ|tamil|தமிழ்|english/i.test(transcript)) {
        intent = "language";
        const language = /telugu|తెలుగు/i.test(transcript)
          ? "te"
          : /hindi|हिंदी/i.test(transcript)
            ? "hi"
            : /kannada|ಕನ್ನಡ/i.test(transcript)
              ? "kn"
              : /tamil|தமிழ்/i.test(transcript)
                ? "ta"
                : "en";
        change(language);
        if (result?.translations?.[language]) await speak(false, language);
      } else if (/treat|steps|చికిత్స|उपचार/i.test(transcript)) {
        intent = "read_result";
        await speak(true);
      } else if (/read|result|చదువు|पढ़/i.test(transcript)) {
        intent = "read_result";
        await speak();
      } else if (/analy|విశ్లేష|विश्लेष/i.test(transcript)) {
        intent = "analyze";
        go("capture");
      }
      await request(endpoints.voiceCommands, token, {
        method: "POST",
        body: JSON.stringify({
          transcript,
          language: lang,
          intent,
          successful: intent !== "unknown",
          analysisId: result?.id || null,
        }),
      });
      if (intent === "unknown")
        throw new Error(`Command not recognized: ${transcript}`);
    });
  }
  async function logout() {
    await run(async () => {
      try { await request(endpoints.logout, token, { method: "POST" }); }
      finally { await clearSession(); }
    });
  }
  return {
    subscriptionPopup,
    setSubscriptionPopup,
    billingStatus,
    setBillingStatus,
    lang,
    restoring,
    change,
    token,
    user,
    busy,
    error,
    notice,
    setError,
    photo,
    consent,
    setConsent,
    plantName,
    setPlantName,
    location,
    setLocation,
    result,
    history,
    go,
    run,
    loadHistory,
    authenticate,
    saveProfile,
    profilePhotoDraft,
    setProfilePhotoDraft,
    pickProfilePhoto,
    uploadProfilePhoto,
    recover,
    resetPassword,
    changePassword,
    pick,
    analyze,
    openHistory,
    speak,
    command,
    logout,
  };
}
const Context = createContext<ReturnType<typeof useAppState> | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const state = useAppState();
  return <Context.Provider value={state}>{state.restoring
    ? <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator /></View>
    : children}</Context.Provider>;
}
export function useLeafCare() {
  const state = useContext(Context);
  if (!state) throw new Error("Missing AppProvider");
  return state;
}
