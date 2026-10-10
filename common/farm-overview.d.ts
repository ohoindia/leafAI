import type { User } from "./types";
import type { FarmRecord, FarmDetails, FarmField } from "./farm";
export function overviewFarms(user?: User): FarmRecord[];
export function overviewFields(details: FarmDetails, crop?: boolean): FarmField[];
export function overviewCrops(farm: FarmRecord): FarmRecord["crops"];
