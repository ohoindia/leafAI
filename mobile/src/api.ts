export type Language = 'en' | 'te' | 'hi';
export type Analysis = {
  id: string; status: string; plant: string; scientific_name: string;
  condition: string; confidence: number; severity: string;
  translations: Record<Language, { summary: string; symptoms: string[]; actions: string[]; disclaimer: string }>;
};
export type HistoryItem = { id: string; status: string; plant_name: string | null; disease_name: string | null; created_at: string };
export const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || '';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// Access tokens live only in memory. Native sessions explicitly sign in again on expiry.
export async function request<T>(path: string, token = '', options: RequestInit = {}): Promise<T> {
  if (!/^https?:\/\//.test(apiUrl)) throw new Error('Set EXPO_PUBLIC_API_URL in mobile/.env to your backend URL, then restart Expo.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), path === '/analyses' && options.method === 'POST' ? 180000 : 30000);
  try {
    const response = await fetch(`${apiUrl}/api${path}`, {
      ...options, credentials: 'omit', signal: controller.signal,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers,
      },
    });
    if (response.status === 204) return undefined as T;
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(body?.error || body?.message || `Request failed (${response.status})`, response.status);
    if (body === null) throw new Error('The API returned an invalid response. Check your backend URL.');
    return body as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The request timed out. Check history before retrying an analysis.');
    if (error instanceof TypeError) throw new Error('Cannot reach the server. Check the API URL, Wi-Fi connection, and firewall.');
    throw error;
  } finally { clearTimeout(timer); }
}
