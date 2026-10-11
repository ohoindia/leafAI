import { Module, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthModule } from "../auth/auth.module.js";
import { AuthGuard } from "../auth/auth.guard.js";
import type { ApiRequest } from "../common/api-request.js";
import { WeatherService } from "./weather.service.js";
@Controller("weather")
@ApiTags("Weather")
@ApiBearerAuth()
@UseGuards(AuthGuard)
class WeatherController {
  constructor(private readonly service: WeatherService) {}
  @Get() forecast(@Req() req: ApiRequest) {
    return this.service.forecast(req);
  }
  @Get("locations") locations(@Query("q") query: string) {
    return this.service.locations(query);
  }
}
@Module({
  imports: [AuthModule],
  controllers: [WeatherController],
  providers: [WeatherService],
})
export class WeatherModule {}
