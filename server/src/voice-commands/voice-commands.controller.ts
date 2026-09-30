import { Controller, Post, HttpCode, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import type { ApiRequest } from "../common/api-request.js";
import { VoiceCommandsService } from "./voice-commands.service.js";
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
@Controller("voice-commands")
@ApiTags("Voice commands")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class VoiceCommandsController {
  constructor(private readonly service: VoiceCommandsService) {}
  @Post()
  @ApiBody({ schema: { type: "object", required: ["transcript", "language", "successful"], properties: {
    transcript: { type: "string", minLength: 1, maxLength: 1000 },
    language: { type: "string", enum: ["en", "te", "hi"] },
    intent: { type: "string", maxLength: 80 },
    successful: { type: "boolean" },
    analysisId: { type: "string", format: "uuid", nullable: true },
  } } })
  @HttpCode(204)
  async create(@Req() req: ApiRequest) {
    await this.service.create(req);
  }
}
