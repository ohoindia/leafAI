import { Injectable } from "@nestjs/common";
import type { OnApplicationShutdown } from "@nestjs/common";
import { saveUpload, readUpload, s3 } from "../storage.js";
@Injectable()
export class StorageService implements OnApplicationShutdown {
  saveUpload = saveUpload;
  readUpload = readUpload;
  onApplicationShutdown() {
    s3?.destroy();
  }
}
