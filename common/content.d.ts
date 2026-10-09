import type { Language, Analysis, HistoryItem } from "./types";
export const brand: { name: string; tagline: string };
export const languages: Record<Language, string>;
export const speechLanguages: Record<Language, string>;
export const screens: Record<
  | "language"
  | "login"
  | "register"
  | "home"
  | "capture"
  | "review"
  | "details"
  | "processing"
  | "result"
  | "full"
  | "history"
  | "learn"
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
  item: Partial<Analysis> & Partial<HistoryItem>,
): string;
export function filterHistory(
  items: HistoryItem[],
  query: string,
  filter: string,
): HistoryItem[];
