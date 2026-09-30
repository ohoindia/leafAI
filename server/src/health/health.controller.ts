import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service.js";
@Controller("health")
export class HealthController {
  constructor(private readonly service: HealthService) {}
  @Get()
  status() {
    return this.service.status();
  }
}
