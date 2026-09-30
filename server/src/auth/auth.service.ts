import crypto from "node:crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { env } from "../config.js";
import { DatabaseService } from "../common/database.service.js";
import { SecurityService } from "../common/security.service.js";
import type { ApiRequest } from "../common/api-request.js";
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
