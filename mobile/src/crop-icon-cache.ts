import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { createCropIconCache } from "../../common/crop-icon-cache.js";
import { cropIconPath, cropIconVersion } from "../../common/crop-icons.js";
import { apiUrl } from "./api";

const directory = `${FileSystem.cacheDirectory || ""}crop-icons-${cropIconVersion}/`;
const file = (key: string) => {
  cropIconPath(key); // Allowlisted identifiers only.
  return `${directory}${key}.png`;
};

export const recoverCropIcon = createCropIconCache({
  async read(key) {
    if (Platform.OS === "web" || !FileSystem.cacheDirectory) return null;
    try {
      const info = await FileSystem.getInfoAsync(file(key));
      if (!info.exists || info.isDirectory || info.size === 0) return null;
      const signature = await FileSystem.readAsStringAsync(info.uri, {
        encoding: "base64",
        position: 0,
        length: 8,
      });
      return signature === "iVBORw0KGgo=" ? info.uri : null;
    } catch {
      return null;
    }
  },
  async remove(key) {
    if (Platform.OS !== "web" && FileSystem.cacheDirectory)
      await FileSystem.deleteAsync(file(key), { idempotent: true });
  },
  async download(key) {
    if (!/^https?:\/\//.test(apiUrl))
      throw new Error("Crop icon server is not configured.");
    const url = `${apiUrl}${cropIconPath(key)}`;
    if (Platform.OS === "web" || !FileSystem.cacheDirectory) return url;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const target = file(key);
    const temporary = `${target}.download`;
    try {
      const task = FileSystem.createDownloadResumable(url, temporary);
      const timeout = setTimeout(() => {
        void task.cancelAsync().catch(() => {});
      }, 15000);
      let response;
      try {
        response = await task.downloadAsync();
      } finally {
        clearTimeout(timeout);
      }
      const type =
        Object.entries(response?.headers || {}).find(
          ([name]) => name.toLowerCase() === "content-type",
        )?.[1] || "";
      const info = await FileSystem.getInfoAsync(temporary);
      if (
        !response ||
        response.status !== 200 ||
        !type.startsWith("image/png") ||
        !info.exists ||
        info.isDirectory ||
        info.size === 0
      )
        throw new Error("Crop icon download failed.");
      const signature = await FileSystem.readAsStringAsync(temporary, {
        encoding: "base64",
        position: 0,
        length: 8,
      });
      if (signature !== "iVBORw0KGgo=")
        throw new Error("Invalid crop icon file.");
      await FileSystem.deleteAsync(target, { idempotent: true });
      await FileSystem.moveAsync({ from: temporary, to: target });
      return target;
    } finally {
      await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(
        () => {},
      );
    }
  },
});
