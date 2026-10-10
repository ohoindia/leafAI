import {
  Controller,
  Get,
  Post,
  Patch,
  HttpCode,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Response } from "express";
import type { ApiRequest } from "../common/api-request.js";
import { env } from "../config.js";
import { AuthService } from "./auth.service.js";
import { AuthGuard } from "./auth.guard.js";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";

const credentials = {
  email: {
    type: "string" as const,
    format: "email",
    example: "you@example.com",
  },
  password: {
    type: "string" as const,
    minLength: 10,
    maxLength: 128,
    format: "password",
  },
};

@Controller("auth")
@ApiTags("Authentication")
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @Get("me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  me(@Req() req: ApiRequest, @Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store, private");
    return this.service.me(req);
  }
  @Patch("me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiBody({ schema: { type: "object", required: ["fullName", "language"], properties: {
    fullName: { type: "string", minLength: 2, maxLength: 150 },
    language: { type: "string", enum: ["en", "te", "hi"] },
    farmDetails: { type: "object", description: "Farm and crop fields from the farm form" },
    farmId: { type: "string", description: "Owned farm UUID, or new to add a farm; omitted targets the first farm" },
    newCrop: { type: "boolean", description: "Archive the current crop and begin another season", default: false },
    addPreviousCrop: { type: "boolean", description: "Append an optional previous crop history record", default: false },
    userDetails: { type: "object" },
  } } })
  updateProfile(@Req() req: ApiRequest) { return this.service.updateProfile(req); }
  @Post("me/photo")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("photo", { storage: memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } }))
  uploadPhoto(@Req() req: ApiRequest) { return this.service.uploadPhoto(req); }
  @Post("forgot-password")
  @HttpCode(200)
  forgotPassword(@Req() req: ApiRequest) { return this.service.forgotPassword(req); }
  @Post("reset-password")
  @HttpCode(200)
  resetPassword(@Req() req: ApiRequest) { return this.service.resetPassword(req); }
  @Post("change-password")
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  changePassword(@Req() req: ApiRequest) { return this.service.changePassword(req); }
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
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password", "fullName"],
      properties: {
        ...credentials,
        fullName: { type: "string", minLength: 2, maxLength: 150 },
        language: { type: "string", enum: ["en", "te", "hi"], default: "en" },
      },
    },
  })
  register(@Req() req: ApiRequest) {
    return this.service.register(req);
  }
  @Post("login")
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: credentials,
    },
  })
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
  @ApiOperation({
    summary: "Refresh access token using the HttpOnly cookie set by login",
  })
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
