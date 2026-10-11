import type {
  FarmDetails,
  FarmField,
  FarmFieldKey,
  FarmRecord,
} from "./farm.js";
export const farmPresentation: Record<
  string,
  { description: string; basic: FarmFieldKey[]; extra: string; empty: string }
>;
export const farmPlaceholders: Partial<Record<FarmFieldKey, string>>;
export function farmDisplayValue(
  field: FarmField,
  details: FarmDetails,
): string;
export function farmSectionSummary(
  title: string,
  details: FarmDetails,
  crops?: FarmRecord["crops"],
): string;
