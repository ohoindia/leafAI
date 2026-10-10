import type { Language, Analysis, HistoryItem } from "./types";
export const brand: { name: string; tagline: string };
export const languages: Record<Language, string>;
export const speechLanguages: Record<Language, string>;
export const screens: Record<
  | "language"
  | "login"
  | "forgot"
  | "register"
  | "farm"
  | "weather"
  | "market"
  | "home"
  | "capture"
  | "review"
  | "details"
  | "processing"
  | "result"
  | "full"
  | "history"
  | "learn"
  | "farm-details"
  | "account-details"
  | "security"
  | "profile"
  | "voice",
  string
>;
export const photoChecks: string[];
export const photoTip: string;
export const consentText: string;
export const consentDetail: string;
export const voiceCommands: string[];
export const careTips: string[][];
export function analysisStatus(
  item: Partial<Pick<Analysis, "status" | "condition" | "severity">> & Partial<Pick<HistoryItem, "disease_name">>,
): string;
export function filterHistory(
  items: HistoryItem[],
  query: string,
  filter: string,
): HistoryItem[];

export function accountInitials(name?: string): string;
export function accountGreeting(name?: string, hour?: number): string;

export const profileSettings: { route: "farm" | "language" | "account-details" | "security"; title: string; subtitle: string; icon: string }[];
