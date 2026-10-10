import { Module, Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuthGuard } from "../auth/auth.guard.js";
import type { ApiRequest } from "../common/api-request.js";
import { MarketService } from "./market.service.js";
@Controller("market")
@UseGuards(AuthGuard)
class MarketController {
 constructor(private readonly service: MarketService) {}
 @Get() prices(@Req() req: ApiRequest) { return this.service.prices(req); }
}
@Module({imports:[AuthModule],controllers:[MarketController],providers:[MarketService]})
export class MarketModule {}
