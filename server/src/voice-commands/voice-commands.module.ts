import { Module } from "@nestjs/common";
import { VoiceCommandsController } from "./voice-commands.controller.js";
import { VoiceCommandsService } from "./voice-commands.service.js";

import { AuthModule } from "../auth/auth.module.js";
@Module({
  imports: [AuthModule],
  controllers: [VoiceCommandsController],
  providers: [VoiceCommandsService],
})
export class VoiceCommandsModule {}
