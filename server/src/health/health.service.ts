import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../common/database.service.js";
@Injectable()
export class HealthService {
  constructor(private readonly db: DatabaseService) {}
  async status() {
    await this.db.query("SELECT 1");
    return { status: "ok" };
  }
}
