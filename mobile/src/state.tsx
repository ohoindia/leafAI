import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Speech from "expo-speech";
import { request, ApiError } from "./api";
import { endpoints, uploadRules } from "../../common/api.js";
import { speechLanguages, brand, screens } from "../../common/content.js";
import type { Analysis, HistoryItem, Language, User } from "../../common/types";

function useAppState() {
  const [lang, setLang] = useState<Language>("en");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const [photo, setPhoto] = useState<string>();
  const [consent, setConsent] = useState(false);
  const [plantName, setPlantName] = useState("");
  const [location, setLocation] = useState("");
  const [result, setResult] = useState<Analysis>();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  useEffect(
    () => () => {
      void Speech.stop();
    },
    [],
  );
  function go(screen: keyof typeof screens) {
    setError("");
    router.push(`/${screen}`);
  }
  function change(value: Language) {
    setLang(value);
    void Speech.stop();
  }
  function clearSession() {
    void Speech.stop();
    setToken("");
    setUser(undefined);
    setPhoto(undefined);
    setResult(undefined);
    setConsent(false);
    setHistory([]);
    setPlantName("");
    setLocation("");
    router.replace("/login");
  }
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && token) {
        clearSession();
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
    setHistory(await request<HistoryItem[]>(endpoints.analyses, accessToken));
  }
  async function authenticate(
    email: string,
    password: string,
    fullName: string,
    register: boolean,
  ) {
    return run(async () => {
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        password.length < 10 ||
        password.length > 128 ||
        (register && fullName.trim().length < 2)
      )
        throw new Error(
          "Enter a valid email, password (10-128 characters), and name when registering.",
        );
      if (register)
        await request(endpoints.register, "", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
            fullName: fullName.trim(),
            language: lang,
          }),
        });
      const data = await request<{ accessToken: string; user: User }>(
        endpoints.login,
        "",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), password }),
        },
      );
      setToken(data.accessToken);
      setUser(data.user);
      change(data.user.language || lang);
      router.replace("/home");
      await loadHistory(data.accessToken);
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
      form.append("leaf", {
        uri: photo,
        name: "leaf.jpg",
        type: "image/jpeg",
      } as unknown as Blob);
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
      if (/history/i.test(transcript)) {
        intent = "history";
        go("history");
      } else if (/telugu|hindi|english/i.test(transcript)) {
        intent = "language";
        const language = /telugu/i.test(transcript)
          ? "te"
          : /hindi/i.test(transcript)
            ? "hi"
            : "en";
        change(language);
        await speak(false, language);
      } else if (/treatment|steps/i.test(transcript)) {
        intent = "read_result";
        await speak(true);
      } else if (/read|result/i.test(transcript)) {
        intent = "read_result";
        await speak();
      } else if (/analy/i.test(transcript)) {
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
    });
  }
  async function logout() {
    await run(async () => {
      await request(endpoints.logout, token, { method: "POST" });
      clearSession();
    });
  }
  return {
    lang,
    change,
    token,
    user,
    busy,
    error,
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
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useLeafCare() {
  const state = useContext(Context);
  if (!state) throw new Error("Missing AppProvider");
  return state;
}
