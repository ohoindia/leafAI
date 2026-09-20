import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "./config.js";

export const s3 = env.UPLOAD_BUCKET ? new S3Client({}) : null;

export async function saveUpload(key, bytes) {
  if (s3) {
    await s3.send(new PutObjectCommand({
      Bucket: env.UPLOAD_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: "application/octet-stream",
      ServerSideEncryption: "AES256",
    }));
    return;
  }
  const directory = path.resolve("uploads");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, key), bytes, { mode: 0o600 });
}
