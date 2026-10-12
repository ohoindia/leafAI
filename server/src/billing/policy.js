import crypto from "node:crypto";
export function validSignature(body, signature, secret) {
  if (!secret || typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), crypto.createHmac("sha256", secret).update(body).digest());
}
export function nextMonth(now = new Date()) {
  const date = new Date(now);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return Math.floor(date.getTime() / 1000);
}
export function entitled(row, now = Date.now() / 1000) {
  return Boolean(row && Number(row.access_until) > now);
}
