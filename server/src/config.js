import { loadEnvironment } from "./load-environment.js";
import { z } from "zod";

loadEnvironment();

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(8080),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  DB_SSL: z.enum(["true", "false"]).default("false"),
  DB_SSL_CA: z.string().optional(),
  UPLOAD_BUCKET: z.string().min(1).optional(),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024)
    .default(4 * 1024 * 1024),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_VISION_MODEL: z.string().default("gpt-6-astra"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  UPLOAD_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  TRUST_PROXY: z.coerce.number().default(0),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
  throw new Error(
    `Missing or invalid environment settings: ${fields.join(", ")}. ` +
    "Configure server/.env using server/.env.example, or supply Lambda environment variables. " +
    "Set database credentials, OPENAI_API_KEY, JWT secrets, and a 64-character hexadecimal UPLOAD_ENCRYPTION_KEY.",
  );
}
export const env = parsed.data;
if (process.env.AWS_LAMBDA_FUNCTION_NAME && !env.UPLOAD_BUCKET) {
  throw new Error(
    "UPLOAD_BUCKET is required in Lambda; local storage is not durable",
  );
}
if (env.DB_SSL === "true" && !env.DB_SSL_CA) {
  throw new Error("DB_SSL_CA is required when DB_SSL is true");
}
export const origins = env.ALLOWED_ORIGINS.split(",").map((x) => x.trim());
