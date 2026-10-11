import express from "express";
import { fileURLToPath } from "node:url";

export function cropIconAssets() {
  return express.static(fileURLToPath(new URL("../../assets/crop-icons/v1/", import.meta.url)), {
    fallthrough: true,
    dotfiles: "deny",
    index: false,
    maxAge: "1y",
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  });
}
