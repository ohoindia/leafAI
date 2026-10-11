export function createCropIconCache(store: {
  read(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
  download(key: string): Promise<string>;
}): (key: string, refresh?: boolean) => Promise<string>;
