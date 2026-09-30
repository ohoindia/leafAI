import { Controller, Post, HttpCode, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import type { ApiRequest } from "../common/api-request.js";
import { VoiceCommandsService } from "./voice-commands.service.js";
@Controller("voice-commands")
@UseGuards(AuthGuard)
export class VoiceCommandsController {
  constructor(private readonly service: VoiceCommandsService) {}
  @Post()
  @HttpCode(204)
  async create(@Req() req: ApiRequest) {
    await this.service.create(req);
  }
}
