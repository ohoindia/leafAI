import type { FarmDetails, FarmField, FarmFieldKey } from "./farm.js";
export const farmPresentation: Record<string, { description: string; basic: FarmFieldKey[]; extra: string; empty: string }>;
export const farmPlaceholders: Partial<Record<FarmFieldKey, string>>;
export function farmDisplayValue(field: FarmField, details: FarmDetails): string;
