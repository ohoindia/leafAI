export const fertilizerPackage: string;
export const fertilizerStore: string;
export const officerContacts: string;
export const fertilizerDescription: string;
export const officerDescription: string;
export const locationNote: string;
export function resolveServiceLocation(
  latitude: number,
  longitude: number,
): Promise<{ district: string; mandal: string; cluster: string }>;
