import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
Object.assign(process.env, {
  NODE_ENV: "test", DB_HOST: "localhost", DB_NAME: "test", DB_USER: "test", DB_PASSWORD: "test",
  OPENAI_API_KEY: "test", JWT_ACCESS_SECRET: "a".repeat(32), JWT_REFRESH_SECRET: "b".repeat(32), UPLOAD_ENCRYPTION_KEY: "c".repeat(64),
});
const { issueTokens, sha256 } = await import("../dist/security.js");
const { AuthService } = await import("../dist/auth/auth.service.js");

test("mobile refresh credentials last until revocation while access tokens and web sessions still expire", () => {
  const mobile = issueTokens({ id: 7, role: "USER" }, "session", true);
  const web = issueTokens({ id: 7, role: "USER" }, "session");
  const access = jwt.decode(mobile.accessToken);
  assert.equal(access.exp - access.iat, 900);
  assert.equal(jwt.decode(mobile.refreshToken).exp, undefined);
  assert.equal(jwt.decode(mobile.refreshToken).persistent, true);
  const refresh = jwt.decode(web.refreshToken);
  assert.equal(refresh.exp - refresh.iat, 7 * 86400);
  assert.notEqual(mobile.refreshToken, issueTokens({ id: 7, role: "USER" }, "session", true).refreshToken);
});

test("PIN login keeps the pre-login language and creates a persistent mobile session", async () => {
  const user = { id: 7, role: "USER", is_active: 1, mobile_verified_at: new Date(), pin_hash: await argon2.hash("1234"), preferred_language: "en" };
  const writes = [];
  const execute = async (sql, args) => {
    if (sql.startsWith("SELECT * FROM users")) return [[user]];
    if (sql.startsWith("SELECT")) return [[]];
    writes.push({ sql, args });
    return [{ affectedRows: 1 }];
  };
  const service = new AuthService({ execute, transaction: work => work({ execute }) }, { issueTokens, sha256 });
  const result = await service.login({ body: { mobileNumber: "9876543210", pin: "1234", language: "ta", sessionType: "mobile" }, ip: "127.0.0.1", get: () => "test" });
  assert.equal(result.user.language, "ta");
  assert.ok(writes.some(({ sql, args }) => sql.startsWith("UPDATE users SET preferred_language") && args[0] === "ta"));
  assert.ok(writes.some(({ sql }) => sql.startsWith("INSERT INTO user_sessions") && sql.includes("9999-12-31")));
  assert.equal(jwt.decode(result.tokens.refreshToken).persistent, true);
});

test("mobile refresh rotates credentials and rejects revoked or inactive sessions", async () => {
  let hash = sha256(issueTokens({ id: 7, role: "USER" }, "session", true).refreshToken);
  const tokens = issueTokens({ id: 7, role: "USER" }, "session", true);
  hash = sha256(tokens.refreshToken);
  let active = true;
  const service = new AuthService({ execute: async (sql, args) => {
    if (sql.startsWith("SELECT")) {
      assert.ok(sql.includes("u.is_active=1"));
      return [active && args[1] === hash ? [{ role: "USER" }] : []];
    }
    hash = args[0];
    return [{ affectedRows: 1 }];
  } }, { issueTokens, sha256 });
  const next = await service.refresh({ body: { refreshToken: tokens.refreshToken } });
  assert.notEqual(next.refreshToken, tokens.refreshToken);
  assert.equal(jwt.decode(next.refreshToken).persistent, true);
  await assert.rejects(service.refresh({ body: { refreshToken: tokens.refreshToken } }), /Session expired/);
  active = false;
  await assert.rejects(service.refresh({ body: { refreshToken: next.refreshToken } }), /Session expired/);
});
