import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  createPersistentSession,
  type SessionTokens,
} from "../../common/persistent-session.js";
import { configureSessionRequest, rawRequest } from "./api";

export const preferenceStorage = {
  async get(key: string) {
    return Platform.OS === "web"
      ? localStorage.getItem(key)
      : SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string | null) {
    if (Platform.OS === "web") {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } else if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  },
};
const sessionKey = "leaf-session-v1";
export const session = createPersistentSession({
  send: rawRequest,
  async read() {
    const value = await preferenceStorage.get(sessionKey);
    if (!value) return null;
    try {
      return JSON.parse(value) as SessionTokens;
    } catch {
      await preferenceStorage.set(sessionKey, null);
      return null;
    }
  },
  async write(tokens) {
    await preferenceStorage.set(
      sessionKey,
      tokens ? JSON.stringify(tokens) : null,
    );
  },
});
configureSessionRequest(session.request);
