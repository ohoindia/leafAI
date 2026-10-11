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
  @ApiBody({
    schema: {
      type: "object",
      required: ["fullName", "language"],
      properties: {
        fullName: { type: "string", minLength: 2, maxLength: 150 },
        language: { type: "string", enum: ["en", "te", "hi"] },
        farmDetails: {
          type: "object",
          description: "Farm and crop fields from the farm form",
        },
        farmId: {
          type: "string",
          description:
            "Owned farm UUID, or new to add a farm; omitted targets the first farm",
        },
        newCrop: {
          type: "boolean",
          description: "Archive the current crop and begin another season",
          default: false,
        },
        addPreviousCrop: {
          type: "boolean",
          description: "Append an optional previous crop history record",
          default: false,
        },
        userDetails: { type: "object" },
      },
    },
  })
  updateProfile(@Req() req: ApiRequest) {
    return this.service.updateProfile(req);
  }
  @Post("me/photo")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor("photo", {
      storage: memoryStorage(),
      limits: { fileSize: 4 * 1024 * 1024, files: 1 },
    }),
  )
  uploadPhoto(@Req() req: ApiRequest) {
    return this.service.uploadPhoto(req);
  }
  private setRefreshCookie(res: Response, token: string) {
    res.cookie("refreshToken", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 7 * 864e5,
    });
  }
  @Post("check-mobile")
  @HttpCode(200)
  checkMobile(@Req() req: ApiRequest) {
    return this.service.checkMobile(req);
  }
  @Post("request-otp")
  @HttpCode(200)
  requestOtp(@Req() req: ApiRequest) {
    return this.service.requestOtp(req);
  }
  @Post("verify-otp")
  @HttpCode(200)
  verifyOtp(@Req() req: ApiRequest) {
    return this.service.verifyOtp(req);
  }
  @Post("login")
  @HttpCode(200)
  @ApiBody({
    schema: {
      type: "object",
      required: ["pin"],
      properties: {
        mobileNumber: { type: "string", pattern: "^[6-9][0-9]{9}$" },
        guid: { type: "string", format: "uuid" },
        pin: { type: "string", pattern: "^[0-9]{4}$" },
        language: { type: "string", enum: ["en", "te", "hi"] },
      },
    },
  })
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
