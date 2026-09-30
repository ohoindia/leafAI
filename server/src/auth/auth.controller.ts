import {
  Controller,
  Post,
  HttpCode,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../common/api-request.js";
import { env } from "../config.js";
import { AuthService } from "./auth.service.js";
import { AuthGuard } from "./auth.guard.js";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";

const credentials = {
  email: { type: "string" as const, format: "email", example: "you@example.com" },
  password: { type: "string" as const, minLength: 10, maxLength: 128, format: "password" },
};

@Controller("auth")
@ApiTags("Authentication")
export class AuthController {
  constructor(private readonly service: AuthService) {}
  private setRefreshCookie(res: Response, token: string) {
    res.cookie("refreshToken", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 7 * 864e5,
    });
  }
  @Post("register")
  @ApiBody({ schema: { type: "object", required: ["email", "password", "fullName"], properties: {
    ...credentials,
    fullName: { type: "string", minLength: 2, maxLength: 150 },
    language: { type: "string", enum: ["en", "te", "hi"], default: "en" },
  } } })
  register(@Req() req: ApiRequest) {
    return this.service.register(req);
  }
  @Post("login")
  @ApiBody({ schema: { type: "object", required: ["email", "password"], properties: credentials } })
  @HttpCode(200)
  async login(
    @Req() req: ApiRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, user } = await this.service.login(req);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user };
  }
  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token using the HttpOnly cookie set by login" })
  @HttpCode(200)
  async refresh(
    @Req() req: ApiRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.service.refresh(req);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }
  @Post("logout")
  @ApiBearerAuth()
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: ApiRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.service.logout(req);
    res.clearCookie("refreshToken", { path: "/api/auth" });
  }
}
