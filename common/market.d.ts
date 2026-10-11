export const marketSource: string;
export const mspSource: string;
export const mspSeason: string;
export const mspPrices: [string, number][];
export const mandiNote: string;
export const mspNote: string;
export const riceNote: string;
export function price(value: number | null): string;
export type MarketData = {
  location: { state: string; district: string };
  status: string;
  message: string;
  fetchedAt: string;
  truncated: boolean;
  records: {
    commodity: string;
    variety: string;
    market: string;
    date: string;
    min: number | null;
    max: number | null;
    modal: number | null;
  }[];
};
