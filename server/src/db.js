import mysql from "mysql2/promise";
import { env } from "./config.js";
export const db = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  connectTimeout: 10_000,
  enableKeepAlive: true,
  ...(env.DB_SSL === "true"
    ? { ssl: { ca: env.DB_SSL_CA, rejectUnauthorized: true } }
    : {}),
  timezone: "Z",
  charset: "utf8mb4",
});
export async function audit(
  userId,
  action,
  entityType,
  entityId,
  req,
  metadata = {},
) {
  await db.execute(
    "INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,request_id,ip_address,metadata) VALUES(?,?,?,?,?,INET6_ATON(?),?)",
    [
      userId || null,
      action,
      entityType,
      entityId || null,
      req.id,
      req.ip,
      JSON.stringify(metadata),
    ],
  );
}
