import "reflect-metadata";
import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import { ApiExceptionFilter } from "./common/api-exception.filter.js";
import type { ApiRequest } from "./common/api-request.js";
import { env, origins } from "./config.js";

export async function createApplication() {
  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    {
      bodyParser: false,
    },
  );
  server.disable("x-powered-by");
  server.set("trust proxy", env.TRUST_PROXY);
  server.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, private");
    next();
  });
  server.use((req, res, next) => {
    (req as ApiRequest).id = crypto.randomUUID();
    res.setHeader("X-Request-Id", (req as ApiRequest).id);
    next();
  });
  server.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
  server.use(
    cors({
      origin: (origin, callback) =>
        !origin || origins.includes(origin)
          ? callback(null, true)
          : callback(new Error("Origin blocked")),
      credentials: true,
    }),
  );
  server.use(express.json({ limit: "100kb" }));
  server.use(cookieParser());
  server.use(
    "/api",
    rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: "draft-8" }),
  );
  const authLimit = rateLimit({ windowMs: 15 * 60_000, limit: 10 });
  server.post(["/api/auth/register", "/api/auth/login"], authLimit);
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new ApiExceptionFilter());
  if (env.NODE_ENV === "production" && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Register the website before Nest's final 404 handler, bypassing every API request.
    const website = express.Router();
    website.use(express.static("public"));
    website.get("*splat", (_req, res) =>
      res.sendFile(path.resolve("public/index.html")),
    );
    server.use((req, res, next) => {
      if (/^\/api(?:\/|$)/i.test(req.path)) return next();
      website(req, res, next);
    });
  }
  await app.init();
  return app;
}
