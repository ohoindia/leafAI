import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { DatabaseService } from "../common/database.service.js";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import type { ApiRequest, SessionClaims } from "../common/api-request.js";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ApiRequest>();
    try {
      const token = req.headers.authorization?.replace(/^Bearer /, "");
      if (!token) throw new Error("Missing token");
      const claims = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        issuer: "leaf-care-ai",
        audience: "leaf-care-web",
      });
      if (typeof claims === "string" || !claims.sub || !claims.sid)
        throw new Error("Invalid token");
      const [rows] = await this.db.execute(
        "SELECT s.id FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>NOW(3) AND u.is_active=1",
        [String(claims.sid), claims.sub],
      );
      if (!rows.length) throw new Error("Session expired");
      req.user = claims as SessionClaims;
      return true;
    } catch {
      throw new UnauthorizedException("Authentication required");
    }
  }
}
