import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { DatabaseService } from "../common/database.service.js";
import type { ApiRequest } from "../common/api-request.js";
@Injectable()
export class VoiceCommandsService {
  constructor(private readonly db: DatabaseService) {}
  async create(req: ApiRequest) {
    const b = z
      .object({
        transcript: z.string().min(1).max(1000),
        language: z.enum(["en", "te", "hi"]),
        intent: z.string().max(80).optional(),
        successful: z.boolean(),
        analysisId: z.string().uuid().nullable().optional(),
      })
      .parse(req.body);
    await this.db.execute(
      "INSERT INTO voice_commands(user_id,analysis_id,language_code,transcript,detected_intent,was_successful) VALUES(?,?,?,?,?,?)",
      [
        req.user.sub,
        b.analysisId || null,
        b.language,
        b.transcript,
        b.intent || null,
        b.successful,
      ],
    );
  }
}
