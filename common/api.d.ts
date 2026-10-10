export const endpoints: {
  market: string;
  weather: string;
  weatherLocations: string;
  checkMobile: string;
  requestOtp: string;
  verifyOtp: string;
  forgotPassword: string;
  resetPassword: string;
  changePassword: string;
  register: string;
  login: string;
  refresh: string;
  logout: string;
  profilePhoto: string;
  me: string;
  analyses: string;
  voiceCommands: string;
  analysis(id: string): string;
  image(id: string): string;
};
export const uploadRules: {
  minDimension: number;
  maxBytes: number;
  mimeTypes: string[];
};
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number);
}
export function requestApi<T>(
  path: string,
  options?: RequestInit & {
    baseUrl?: string;
    token?: string;
    responseType?: "json" | "blob";
  },
): Promise<T>;
