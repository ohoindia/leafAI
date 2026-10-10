import crypto from "node:crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Injectable, UnauthorizedException, ServiceUnavailableException } from "@nestjs/common";
import { env } from "../config.js";
import { DatabaseService } from "../common/database.service.js";
import { SecurityService } from "../common/security.service.js";
import type { ApiRequest } from "../common/api-request.js";
import { farmDetailsSchema } from "./farm-schema.js";
const creds = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((x) => x.toLowerCase()),
  password: z.string().min(10).max(128),
});
@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly security: SecurityService,
  ) {}
  async me(req: ApiRequest) {
    const [rows] = await this.db.execute(
      "SELECT id,full_name,email,preferred_language,role,farm_details FROM users WHERE id=? AND is_active=1",
      [req.user.sub],
    );
    if (!rows[0]) throw new UnauthorizedException("Session expired");
    const u = rows[0];
    return {
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      language: u.preferred_language,
      role: u.role,
      farmDetails: typeof u.farm_details === "string" ? JSON.parse(u.farm_details) : (u.farm_details || {}),
    };
  }
  async updateProfile(req: ApiRequest) {
    const b = z.object({ fullName: z.string().trim().min(2).max(150), language: z.enum(["en", "te", "hi"]), farmDetails: farmDetailsSchema.optional() }).parse(req.body);
    if (b.farmDetails !== undefined) {
      await this.db.execute("UPDATE users SET full_name=?,preferred_language=?,farm_details=? WHERE id=? AND is_active=1", [b.fullName, b.language, JSON.stringify(b.farmDetails), req.user.sub]);
    } else {
      await this.db.execute("UPDATE users SET full_name=?,preferred_language=? WHERE id=? AND is_active=1", [b.fullName, b.language, req.user.sub]);
    }
    return this.me(req);
  }
  async forgotPassword(req: ApiRequest) {
    const { email } = creds.pick({ email: true }).parse(req.body);
    if (!env.RESET_EMAIL_WEBHOOK_URL || !env.RESET_EMAIL_WEBHOOK_SECRET)
      throw new ServiceUnavailableException("Password recovery is not configured. Please contact support.");
    const [rows] = await this.db.execute("SELECT id,password_hash FROM users WHERE email=? AND is_active=1", [email]);
    if (rows[0]) {
      const token = jwt.sign({ purpose: "password-reset", fingerprint: this.security.sha256(rows[0].password_hash) }, env.JWT_REFRESH_SECRET, { subject: String(rows[0].id), expiresIn: "15m", audience: "krishi-password-reset" });
      const response = await fetch(env.RESET_EMAIL_WEBHOOK_URL, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESET_EMAIL_WEBHOOK_SECRET}` },
        body: JSON.stringify({ to: email, subject: "Reset your Krishi Karshak password", token, expiresInMinutes: 15 }), signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new ServiceUnavailableException("Unable to send recovery email. Please try again later.");
    }
    return { message: "If an account exists, a recovery code has been sent to your email." };
  }
  async resetPassword(req: ApiRequest) {
    const b = z.object({ token: z.string().min(1).max(2048), password: creds.shape.password }).parse(req.body);
    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(b.token, env.JWT_REFRESH_SECRET, { audience: "krishi-password-reset" });
      if (typeof decoded === "string" || decoded.purpose !== "password-reset" || !decoded.sub) throw Error();
      payload = decoded;
    } catch { throw new UnauthorizedException("Recovery code is invalid or expired. Request a new code."); }
    const [rows] = await this.db.execute("SELECT password_hash FROM users WHERE id=? AND is_active=1", [payload.sub!]);
    if (!rows[0] || this.security.sha256(rows[0].password_hash) !== payload.fingerprint)
      throw new UnauthorizedException("Recovery code is invalid or expired. Request a new code.");
    await this.replacePassword(payload.sub!, rows[0].password_hash, b.password);
    return { message: "Password reset. Sign in with your new password." };
  }
  private async replacePassword(userId: string, oldHash: string, password: string) {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const [result] = await this.db.execute("UPDATE users SET password_hash=?,failed_login_count=0,locked_until=NULL WHERE id=? AND password_hash=?", [hash, userId, oldHash]);
    if (!result.affectedRows) throw new UnauthorizedException("Password changed. Please try again.");
    await this.db.execute("UPDATE user_sessions SET revoked_at=NOW(3) WHERE user_id=? AND revoked_at IS NULL", [userId]);
  }
  async changePassword(req: ApiRequest) {
    const b = z.object({ currentPassword: creds.shape.password, password: creds.shape.password }).parse(req.body);
    const [rows] = await this.db.execute("SELECT password_hash FROM users WHERE id=? AND is_active=1", [req.user.sub]);
    if (!rows[0] || !(await argon2.verify(rows[0].password_hash, b.currentPassword))) throw new UnauthorizedException("Current password is incorrect");
    await this.replacePassword(req.user.sub, rows[0].password_hash, b.password);
    return { message: "Password updated. Please sign in again." };
  }
  async register(req: ApiRequest) {
    const b = creds
      .extend({
        fullName: z.string().min(2).max(150),
        language: z.enum(["en", "te", "hi"]).default("en"),
      })
      .parse(req.body);
    const hash = await argon2.hash(b.password, { type: argon2.argon2id });
    const [r] = await this.db.execute(
      "INSERT INTO users(email,password_hash,full_name,preferred_language) VALUES(?,?,?,?)",
      [b.email, hash, b.fullName, b.language],
    );
    await this.db.audit(
      r.insertId,
      "USER_REGISTERED",
      "USER",
      String(r.insertId),
      req,
    );
    return { message: "Account created" };
  }
  async login(req: ApiRequest) {
    const b = creds.parse(req.body);
    const [rows] = await this.db.execute(
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
        await this.db.execute(
          "UPDATE users SET failed_login_count=?,locked_until=IF(? >= 5,DATE_ADD(NOW(3),INTERVAL 15 MINUTE),locked_until) WHERE id=?",
          [n, n, u.id],
        );
      }
      await this.db.execute(
        "INSERT INTO login_events(user_id,email_attempted,event_type,ip_address,user_agent) VALUES(?,?,?,INET6_ATON(?),?)",
        [u?.id || null, b.email, "LOGIN_FAILED", req.ip, req.get("user-agent")],
      );
      throw new UnauthorizedException("Invalid credentials");
    }
    const sid = crypto.randomUUID();
    const tokens = this.security.issueTokens(u, sid);
    await this.db.execute(
      "INSERT INTO user_sessions(id,user_id,refresh_token_hash,ip_address,user_agent,expires_at) VALUES(?,?,?,INET6_ATON(?),?,DATE_ADD(NOW(3),INTERVAL 7 DAY))",
      [
        sid,
        u.id,
        this.security.sha256(tokens.refreshToken),
        req.ip,
        req.get("user-agent"),
      ],
    );
    await this.db.execute(
      "UPDATE users SET failed_login_count=0,locked_until=NULL,last_login_at=NOW(3) WHERE id=?",
      [u.id],
    );
    await this.db.execute(
      "INSERT INTO login_events(user_id,email_attempted,event_type,ip_address,user_agent) VALUES(?,?,?,INET6_ATON(?),?)",
      [u.id, b.email, "LOGIN_SUCCESS", req.ip, req.get("user-agent")],
    );
    return {
      tokens,
      user: {
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        language: u.preferred_language,
        role: u.role,
        farmDetails: typeof u.farm_details === "string" ? JSON.parse(u.farm_details) : (u.farm_details || {}),
      },
    };
  }
  async refresh(req: ApiRequest) {
    try {
      const token = req.cookies.refreshToken;
      const p = jwt.verify(token, env.JWT_REFRESH_SECRET, {
        issuer: "leaf-care-ai",
        audience: "leaf-care-web",
      });
      if (typeof p === "string" || !p.sid || !p.sub)
        throw new Error("Invalid session");
      const [rows] = await this.db.execute(
        "SELECT s.*,u.role FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.refresh_token_hash=? AND s.revoked_at IS NULL AND s.expires_at>NOW(3)",
        [p.sid, this.security.sha256(token)],
      );
      if (!rows[0]) throw Error();
      const next = this.security.issueTokens(
        { id: p.sub, role: rows[0].role },
        p.sid,
      );
      await this.db.execute(
        "UPDATE user_sessions SET refresh_token_hash=?,last_used_at=NOW(3) WHERE id=?",
        [this.security.sha256(next.refreshToken), p.sid],
      );
      return next;
    } catch {
      throw new UnauthorizedException("Session expired");
    }
  }
  async logout(req: ApiRequest) {
    await this.db.execute(
      "UPDATE user_sessions SET revoked_at=NOW(3) WHERE id=? AND user_id=?",
      [req.user.sid, req.user.sub],
    );
  }
}
