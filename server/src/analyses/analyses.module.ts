import { Module } from "@nestjs/common";
import { AnalysesController } from "./analyses.controller.js";
import { AnalysesService } from "./analyses.service.js";

import { AuthModule } from "../auth/auth.module.js";
import { LeafAnalysisService } from "./leaf-analysis.service.js";
@Module({
  imports: [AuthModule],
  controllers: [AnalysesController],
  providers: [AnalysesService, LeafAnalysisService],
})
export class AnalysesModule {}
