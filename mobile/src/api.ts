import { requestApi } from "../../common/api.js";
export { ApiError } from "../../common/api.js";
export type { Analysis, HistoryItem, Language } from "../../common/types";
export const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || "";
export async function request<T>(
  path: string,
  token = "",
  options: RequestInit = {},
): Promise<T> {
  if (!/^https?:\/\//.test(apiUrl))
    throw new Error(
      "Set EXPO_PUBLIC_API_URL in mobile/.env to your backend URL, then restart Expo.",
    );
  return requestApi<T>(path.startsWith("/api/") ? path : `/api${path}`, {
    ...options,
    baseUrl: apiUrl,
    token,
    credentials: "omit",
  });
}
