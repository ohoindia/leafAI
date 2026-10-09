export const endpoints = {
  register: "/api/auth/register",
  login: "/api/auth/login",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
  me: "/api/auth/me",
  analyses: "/api/analyses",
  voiceCommands: "/api/voice-commands",
  analysis: (id) => `/api/analyses/${encodeURIComponent(id)}`,
  image: (id) => `/api/analyses/${encodeURIComponent(id)}/image`,
};
export const uploadRules = {
  minDimension: 300,
  maxBytes: 4 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
};
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
// Platform adapters provide the origin and cookie/session policy.
export async function requestApi(
  path,
  {
    baseUrl = "",
    token = "",
    credentials = "omit",
    responseType = "json",
    ...options
  } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    path === endpoints.analyses && options.method === "POST" ? 180000 : 30000,
  );
  try {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData) && !headers.has("Content-Type"))
      headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
      ...options,
      credentials,
      signal: options.signal || controller.signal,
      headers: Object.fromEntries(headers.entries()),
    });
    if (response.status === 204) return undefined;
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(
        body?.error || body?.message || `Request failed (${response.status})`,
        response.status,
      );
    }
    return responseType === "blob" ? response.blob() : response.json();
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error(
        "The request timed out. Check history before retrying an analysis.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
