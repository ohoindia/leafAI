import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { env } from "../config.js";
import { AuthGuard } from "../auth/auth.guard.js";
import type { ApiRequest } from "../common/api-request.js";
import { AnalysesService } from "./analyses.service.js";
@Controller("analyses")
@UseGuards(AuthGuard)
export class AnalysesController {
  constructor(private readonly service: AnalysesService) {}
  @Post()
  @UseInterceptors(
    FileInterceptor("leaf", {
      storage: memoryStorage(),
      limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  create(@Req() req: ApiRequest) {
    return this.service.create(req);
  }
  @Get()
  list(@Req() req: ApiRequest) {
    return this.service.list(req);
  }
  @Get(":id")
  findOne(@Req() req: ApiRequest) {
    return this.service.findOne(req);
  }
}
