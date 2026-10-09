import type { Language } from "./types";
export const copy: Record<
  Language,
  Record<
    | "title"
    | "sub"
    | "upload"
    | "analyze"
    | "listen"
    | "history"
    | "login"
    | "register"
    | "consent"
    | "tip",
    string
  >
>;
