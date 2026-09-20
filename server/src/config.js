import "dotenv/config";
import { z } from "zod";

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
export const env = schema.parse(process.env);
if (process.env.AWS_LAMBDA_FUNCTION_NAME && !env.UPLOAD_BUCKET) {
  throw new Error(
    "UPLOAD_BUCKET is required in Lambda; local storage is not durable",
  );
}
if (env.DB_SSL === "true" && !env.DB_SSL_CA) {
  throw new Error("DB_SSL_CA is required when DB_SSL is true");
}
export const origins = env.ALLOWED_ORIGINS.split(",").map((x) => x.trim());
