import { Injectable } from "@nestjs/common";
import type { OnApplicationShutdown } from "@nestjs/common";
import { db, audit } from "../db.js";
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  // Queries return either rows or write metadata, depending on the SQL statement.
  execute(sql: string, values: unknown[] = []): Promise<any> {
    return db.execute(sql, values);
  }
  query(sql: string): Promise<any> {
    return db.query(sql);
  }
  audit = audit;
  async onApplicationShutdown() {
    await db.end();
  }
}
