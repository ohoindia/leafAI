import { Global, Module } from "@nestjs/common";
import { DatabaseService } from "./database.service.js";
import { SecurityService } from "./security.service.js";
import { StorageService } from "./storage.service.js";
@Global()
@Module({
  providers: [DatabaseService, SecurityService, StorageService],
  exports: [DatabaseService, SecurityService, StorageService],
})
export class CommonModule {}
