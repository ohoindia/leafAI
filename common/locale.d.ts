import type { Language } from "./types";
export function normalizeLanguage(value: unknown): Language;
export const localeLabels: Record<string, [string, string, string?, string?]>;
export function translate<T>(language: unknown, text: T): T;
