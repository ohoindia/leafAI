import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import sharp from "sharp";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env, origins } from "./config.js";
import { db, audit } from "./db.js";
import { auth, encrypt, issueTokens, sha256 } from "./security.js";
import { analyzeLeaf } from "./analysis.js";
import { saveUpload } from "./storage.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, private");
  next();
});
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
app.use(
  cors({
    origin: (o, cb) =>
      !o || origins.includes(o)
        ? cb(null, true)
        : cb(new Error("Origin blocked")),
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(
  "/api",
  rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: "draft-8" }),
);
const authLimit = rateLimit({ windowMs: 15 * 60_000, limit: 10 });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
});
const creds = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((x) => x.toLowerCase()),
  password: z.string().min(10).max(128),
});

app.post("/api/auth/register", authLimit, async (req, res, next) => {
  try {
    const b = creds
      .extend({
        fullName: z.string().min(2).max(150),
        language: z.enum(["en", "te", "hi"]).default("en"),
      })
      .parse(req.body);
    const hash = await argon2.hash(b.password, { type: argon2.argon2id });
    const [r] = await db.execute(
      "INSERT INTO users(email,password_hash,full_name,preferred_language) VALUES(?,?,?,?)",
      [b.email, hash, b.fullName, b.language],
    );
    await audit(r.insertId, "USER_REGISTERED", "USER", String(r.insertId), req);
    res.status(201).json({ message: "Account created" });
  } catch (e) {
    next(e);
  }
});
app.post("/api/auth/login", authLimit, async (req, res, next) => {
  try {
    const b = creds.parse(req.body);
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email=? LIMIT 1",
      [b.email],
    );
    const u = rows[0];
    const valid =
      u &&
      u.is_active &&
      (!u.locked_until || new Date(u.locked_until) < new Date()) &&
      (await argon2.verify(u.password_hash, b.password));
    if (!valid) {
      if (u) {
        const n = u.failed_login_count + 1;
        await db.execute(
          "UPDATE users SET failed_login_count=?,locked_until=IF(? >= 5,DATE_ADD(NOW(3),INTERVAL 15 MINUTE),locked_until) WHERE id=?",
          [n, n, u.id],
        );
      }
      await db.execute(
        "INSERT INTO login_events(user_id,email_attempted,event_type,ip_address,user_agent) VALUES(?,?,?,INET6_ATON(?),?)",
        [u?.id || null, b.email, "LOGIN_FAILED", req.ip, req.get("user-agent")],
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const sid = crypto.randomUUID();
    const tokens = issueTokens(u, sid);
    await db.execute(
      "INSERT INTO user_sessions(id,user_id,refresh_token_hash,ip_address,user_agent,expires_at) VALUES(?,?,?,INET6_ATON(?),?,DATE_ADD(NOW(3),INTERVAL 7 DAY))",
      [sid, u.id, sha256(tokens.refreshToken), req.ip, req.get("user-agent")],
    );
    await db.execute(
      "UPDATE users SET failed_login_count=0,locked_until=NULL,last_login_at=NOW(3) WHERE id=?",
      [u.id],
    );
    await db.execute(
      "INSERT INTO login_events(user_id,email_attempted,event_type,ip_address,user_agent) VALUES(?,?,?,INET6_ATON(?),?)",
      [u.id, b.email, "LOGIN_SUCCESS", req.ip, req.get("user-agent")],
    );
    res
      .cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth",
        maxAge: 7 * 864e5,
      })
      .json({
        accessToken: tokens.accessToken,
        user: {
          id: u.id,
          fullName: u.full_name,
          email: u.email,
          language: u.preferred_language,
          role: u.role,
        },
      });
  } catch (e) {
    next(e);
  }
});
app.post("/api/auth/refresh", async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    const p = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: "leaf-care-ai",
      audience: "leaf-care-web",
    });
    const [rows] = await db.execute(
      "SELECT s.*,u.role FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.refresh_token_hash=? AND s.revoked_at IS NULL AND s.expires_at>NOW(3)",
      [p.sid, sha256(token)],
    );
    if (!rows[0]) throw Error();
    const next = issueTokens({ id: p.sub, role: rows[0].role }, p.sid);
    await db.execute(
      "UPDATE user_sessions SET refresh_token_hash=?,last_used_at=NOW(3) WHERE id=?",
      [sha256(next.refreshToken), p.sid],
    );
    res
      .cookie("refreshToken", next.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth",
        maxAge: 7 * 864e5,
      })
      .json({ accessToken: next.accessToken });
  } catch {
    res.status(401).json({ error: "Session expired" });
  }
});
app.post("/api/auth/logout", auth, async (req, res) => {
  await db.execute(
    "UPDATE user_sessions SET revoked_at=NOW(3) WHERE id=? AND user_id=?",
    [req.user.sid, req.user.sub],
  );
  res.clearCookie("refreshToken", { path: "/api/auth" }).status(204).end();
});

app.post(
  "/api/analyses",
  auth,
  upload.single("leaf"),
  async (req, res, next) => {
    const started = Date.now(),
      analysisId = crypto.randomUUID(),
      uploadId = crypto.randomUUID();
    try {
      if (req.body.consent !== "true")
        return res.status(400).json({ error: "Consent is required" });
      if (!req.file)
        return res.status(400).json({ error: "Leaf image is required" });
      const meta = await sharp(req.file.buffer, { failOn: "error" }).metadata();
      if (
        !["jpeg", "png", "webp"].includes(meta.format) ||
        meta.width < 300 ||
        meta.height < 300
      )
        return res.status(400).json({
          error: "Use a clear JPEG, PNG or WebP image at least 300×300",
        });
      const normalized = await sharp(req.file.buffer)
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 88 })
        .toBuffer();
      const safe = `${uploadId}.bin`,
        enc = encrypt(normalized);
      await saveUpload(safe, enc.encrypted);
      await db.execute(
        "INSERT INTO leaf_uploads(id,user_id,original_file_name,storage_key,mime_type,size_bytes,sha256_hash,encryption_iv,encryption_tag,consent_to_analyze) VALUES(?,?,?,?,?,?,?,?,?,1)",
        [
          uploadId,
          req.user.sub,
          path.basename(req.file.originalname).slice(0, 255),
          safe,
          "image/jpeg",
          normalized.length,
          sha256(normalized),
          enc.iv,
          enc.tag,
        ],
      );
      await db.execute(
        "INSERT INTO leaf_analyses(id,upload_id,user_id,requested_language,model_name,prompt_version) VALUES(?,?,?,?,?,?)",
        [
          analysisId,
          uploadId,
          req.user.sub,
          ["en", "te", "hi"].includes(req.body.language)
            ? req.body.language
            : "en",
          env.OPENAI_VISION_MODEL,
          "leaf-v1",
        ],
      );
      const result = await analyzeLeaf(normalized, "image/jpeg"),
        d = result.data,
        status =
          d.confidence < 0.55 || !d.is_leaf ? "REVIEW_REQUIRED" : "COMPLETED";
      await db.execute(
        "UPDATE leaf_analyses SET model_response_id=?,status=?,plant_name=?,disease_name=?,confidence=?,severity=?,analysis_json=?,output_en=?,output_te=?,output_hi=?,processing_ms=?,completed_at=NOW(3) WHERE id=?",
        [
          result.id,
          status,
          d.plant,
          d.condition,
          d.confidence,
          d.severity,
          JSON.stringify(d),
          JSON.stringify(d.translations.en),
          JSON.stringify(d.translations.te),
          JSON.stringify(d.translations.hi),
          Date.now() - started,
          analysisId,
        ],
      );
      await audit(
        req.user.sub,
        "LEAF_ANALYZED",
        "LEAF_ANALYSIS",
        analysisId,
        req,
        { model: env.OPENAI_VISION_MODEL, status },
      );
      res.status(201).json({ id: analysisId, status, ...d });
    } catch (e) {
      await db
        .execute(
          "UPDATE leaf_analyses SET status='FAILED',error_code='ANALYSIS_FAILED',error_message=?,processing_ms=?,completed_at=NOW(3) WHERE id=?",
          [String(e.message).slice(0, 1000), Date.now() - started, analysisId],
        )
        .catch(() => {});
      next(e);
    }
  },
);
app.get("/api/analyses", auth, async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      "SELECT id,status,plant_name,disease_name,confidence,severity,requested_language,created_at FROM leaf_analyses WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
      [req.user.sub],
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});
app.get("/api/analyses/:id", auth, async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      "SELECT id,status,plant_name,disease_name,confidence,severity,analysis_json,created_at FROM leaf_analyses WHERE id=? AND user_id=?",
      [req.params.id, req.user.sub],
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});
app.post("/api/voice-commands", auth, async (req, res, next) => {
  try {
    const b = z
      .object({
        transcript: z.string().min(1).max(1000),
        language: z.enum(["en", "te", "hi"]),
        intent: z.string().max(80).optional(),
        successful: z.boolean(),
        analysisId: z.string().uuid().nullable().optional(),
      })
      .parse(req.body);
    await db.execute(
      "INSERT INTO voice_commands(user_id,analysis_id,language_code,transcript,detected_intent,was_successful) VALUES(?,?,?,?,?,?)",
      [
        req.user.sub,
        b.analysisId || null,
        b.language,
        b.transcript,
        b.intent || null,
        b.successful,
      ],
    );
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
app.get("/api/health", async (req, res) => {
  await db.query("SELECT 1");
  res.json({ status: "ok" });
});
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
if (env.NODE_ENV === "production" && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.use(express.static("public"));
  app.get("*splat", (req, res) =>
    res.sendFile(path.resolve("public/index.html")),
  );
}
app.use((err, req, res, next) => {
  console.error(req.id, err);
  if (err instanceof z.ZodError)
    return res.status(400).json({
      error: "Invalid input",
      details: err.issues.map((x) => ({
        path: x.path.join("."),
        message: x.message,
      })),
    });
  if (err.code === "ER_DUP_ENTRY")
    return res.status(409).json({ error: "Record already exists" });
  if (err instanceof multer.MulterError)
    return res.status(400).json({ error: err.message });
  res.status(500).json({ error: "Request failed", requestId: req.id });
});
export default app;
