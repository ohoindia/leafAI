import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import type { ApiRequest, SessionClaims } from "../common/api-request.js";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
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
      req.user = claims as SessionClaims;
      return true;
    } catch {
      throw new UnauthorizedException("Authentication required");
    }
  }
}
