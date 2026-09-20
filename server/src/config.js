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
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_VISION_MODEL: z.string().default("gpt-6-astra"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  UPLOAD_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  TRUST_PROXY: z.coerce.number().default(0),
});
export const env = schema.parse(process.env);
export const origins = env.ALLOWED_ORIGINS.split(",").map((x) => x.trim());
