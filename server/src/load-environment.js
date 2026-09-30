import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// src/ and dist/ are both two levels below the repository root.
export function loadEnvironment({
  root = fileURLToPath(new URL("../../", import.meta.url)),
  cwd = process.cwd(),
  target = process.env,
} = {}) {
  // Lambda configuration is injected by AWS; never load a packaged .env there.
  if (target.AWS_LAMBDA_FUNCTION_NAME) return { parsed: {} };
  return dotenv.config({
    path: target.DOTENV_CONFIG_PATH
      ? path.resolve(cwd, target.DOTENV_CONFIG_PATH)
      : [path.resolve(root, "server/.env"), path.resolve(cwd, ".env"), path.resolve(root, ".env")],
    processEnv: target,
    override: false,
    quiet: true,
  });
}
