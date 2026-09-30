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
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiParam, ApiTags } from "@nestjs/swagger";
@Controller("analyses")
@ApiTags("Analyses")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class AnalysesController {
  constructor(private readonly service: AnalysesService) {}
  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", required: ["leaf", "consent"], properties: {
    leaf: { type: "string", format: "binary", description: `JPEG, PNG or WebP; at least 300 x 300 pixels; maximum ${env.MAX_UPLOAD_BYTES} bytes.` },
    consent: { type: "string", enum: ["true"] },
    language: { type: "string", enum: ["en", "te", "hi"], default: "en" },
  } } })
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
  @ApiParam({ name: "id", type: String, format: "uuid" })
  findOne(@Req() req: ApiRequest) {
    return this.service.findOne(req);
  }
}
