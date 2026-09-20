import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "./config.js";

export const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
export function issueTokens(user, sessionId) {
  return {
    accessToken: jwt.sign(
      { sub: String(user.id), role: user.role, sid: sessionId },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "15m", issuer: "leaf-care-ai", audience: "leaf-care-web" },
    ),
    refreshToken: jwt.sign(
      { sub: String(user.id), sid: sessionId, type: "refresh" },
      env.JWT_REFRESH_SECRET,
      { expiresIn: "7d", issuer: "leaf-care-ai", audience: "leaf-care-web" },
    ),
  };
}
export function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: "leaf-care-ai",
      audience: "leaf-care-web",
    });
    next();
  } catch {
    res.status(401).json({ error: "Authentication required" });
  }
}
export function encrypt(bytes) {
  const key = Buffer.from(env.UPLOAD_ENCRYPTION_KEY, "hex"),
    iv = crypto.randomBytes(12),
    cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}
