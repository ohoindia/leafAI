export type SessionTokens = { accessToken: string; refreshToken: string };
export function createPersistentSession(adapters: {
  read(): Promise<SessionTokens | null>;
  write(tokens: SessionTokens | null): Promise<void>;
  send<T>(path: string, token?: string, options?: RequestInit): Promise<T>;
}): {
  save(tokens: SessionTokens): Promise<void>;
  clear(): Promise<void>;
  restore(): Promise<string>;
  request<T>(path: string, token?: string, options?: RequestInit): Promise<T>;
  subscribe(listener: (accessToken: string) => void): () => void;
};
