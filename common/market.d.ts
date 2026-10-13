export const marketSource: string;
export const mspSource: string;
export const mspSeason: string;
export const mspPrices: [string, number][];
export const mandiNote: string;
export const mspNote: string;
export const riceNote: string;
export function price(
  value: number | null,
  translate?: (text: string) => string,
): string;
export function groupMarkets<
  T extends {
    market: string;
    state?: string;
    district?: string;
    distanceKm?: number;
  },
>(
  records: T[],
): {
  key: string;
  market: string;
  state: string;
  district: string;
  distanceKm?: number;
  records: T[];
}[];
export function commodityKey(name?: string): string;
export type MarketData = {
  location: {
    state: string;
    district: string;
    latitude?: number;
    longitude?: number;
    nearbyTown?: { town: string; state: string };
  };
  radiusKm?: number;
  originApproximate?: boolean;
  unresolvedMarkets?: number;
  recentNextOffset?: number | null;
  recentPricesIncomplete?: boolean;
  supportedRecentCrops?: string[];
  status: string;
  message: string;
  fetchedAt: string;
  syncedAt?: string | null;
  dataSource?: "database";
  truncated: boolean;
  records: {
    commodity: string;
    variety: string;
    grade?: string;
    market: string;
    state?: string;
    district?: string;
    distanceKm?: number;
    source?: string;
    priceKind?: string;
    previousPrice?: number | null;
    previousDate?: string | null;
    change?: number | null;
    date: string;
    min: number | null;
    max: number | null;
    modal: number | null;
  }[];
};
export function groupCommodityPrices<T extends { commodity: string }>(
  records: T[],
): { commodity: string; records: T[] }[];
export function marketDate(value: string | null | undefined): string;
export function marketSyncTime(value: string | null | undefined): string;
export function priceChange(
  value: number | null | undefined,
  translate?: (text: string) => string,
): string;
export function mergeMarketRecords<
  T extends {
    market: string;
    commodity: string;
    variety: string;
    grade?: string;
    date: string;
    distanceKm?: number;
    state?: string;
    district?: string;
  },
>(previous: T[], incoming: T[]): T[];
