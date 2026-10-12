export const cropCategories: string[];
export const categoryImages: Record<string, string>;
export function cropDetails(name?: string): { category: string; image: string };
export function groupCrops<T>(
  items: T[],
  nameOf: (item: T) => string,
): { category: string; items: T[] }[];
