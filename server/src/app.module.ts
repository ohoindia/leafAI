import { MarketModule } from "./market/market.module.js";
import { WeatherModule } from "./weather/weather.module.js";
import { Module } from "@nestjs/common";
import { CommonModule } from "./common/common.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { AnalysesModule } from "./analyses/analyses.module.js";
import { VoiceCommandsModule } from "./voice-commands/voice-commands.module.js";
import { HealthModule } from "./health/health.module.js";
@Module({
  imports: [
    CommonModule,
    AuthModule,
    AnalysesModule,
    VoiceCommandsModule,
    HealthModule,
    WeatherModule,
    MarketModule,
  ],
})
export class AppModule {}
