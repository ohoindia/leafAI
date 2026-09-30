import type { Request } from "express";
import type { JwtPayload } from "jsonwebtoken";
export interface SessionClaims extends JwtPayload {
  sub: string;
  sid: string;
}
export interface ApiRequest extends Request {
  id: string;
  user: SessionClaims;
}
