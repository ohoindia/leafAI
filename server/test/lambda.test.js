import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import crypto from "node:crypto";

Object.assign(process.env, {
  NODE_ENV: "production",
  AWS_LAMBDA_FUNCTION_NAME: "leafcare-test",
  AWS_REGION: "us-east-1",
  DB_HOST: "localhost",
  DB_NAME: "test",
  DB_USER: "test",
  DB_PASSWORD: "test",
  DB_SSL: "false",
  OPENAI_API_KEY: "test-only",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  UPLOAD_ENCRYPTION_KEY: "c".repeat(64),
  UPLOAD_BUCKET: "test-uploads",
  ALLOWED_ORIGINS: "https://main.example.amplifyapp.com",
  TRUST_PROXY: "0",
  MAX_UPLOAD_BYTES: String(4 * 1024 * 1024),
});
delete process.env.APP_SECRET_ARN;

const { handler } = await import("../src/lambda.js");
const { db } = await import("../src/db.js");
const { s3, saveUpload } = await import("../src/storage.js");
const { issueTokens, encrypt } = await import("../src/security.js");
after(async () => {
  mock.restoreAll();
  s3.destroy();
  await db.end();
});

function event(path, method = "GET", overrides = {}) {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: path,
    rawQueryString: "",
    headers: { host: "example.lambda-url.us-east-1.on.aws" },
    requestContext: {
      requestId: crypto.randomUUID(),
      http: {
        method,
        path,
        sourceIp: "192.0.2.1",
        protocol: "HTTP/1.1",
        userAgent: "test",
      },
    },
    isBase64Encoded: false,
    ...overrides,
  };
}

test("Function URL health request returns JSON without caching and reuses the handler", async () => {
  const query = mock.method(db, "query", async () => [[{ ok: 1 }]]);
  try {
    for (let i = 0; i < 2; i++) {
      const context = {};
      const result = await handler(event("/api/health"), context);
      assert.equal(result.statusCode, 200);
      assert.deepEqual(JSON.parse(result.body), { status: "ok" });
      assert.equal(result.headers["cache-control"], "no-store, private");
      assert.equal(context.callbackWaitsForEmptyEventLoop, false);
    }
    assert.equal(query.mock.callCount(), 2);
  } finally {
    query.mock.restore();
  }
});

test("protected and unknown API routes return JSON errors, not website HTML", async () => {
  const denied = await handler(event("/api/analyses"), {});
  assert.equal(denied.statusCode, 401);
  const missing = await handler(event("/api/missing"), {});
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(JSON.parse(missing.body), { error: "Not found" });
});

test("Amplify origin is accepted by CORS", async () => {
  const result = await handler(
    event("/api/analyses", "OPTIONS", {
      headers: {
        origin: process.env.ALLOWED_ORIGINS,
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    }),
    {},
  );
  assert.equal(result.statusCode, 204);
  assert.equal(
    result.headers["access-control-allow-origin"],
    process.env.ALLOWED_ORIGINS,
  );
  assert.equal(result.headers["access-control-allow-credentials"], "true");
});

test("Function URL cookies support refresh and emit secure same-origin cookies", async () => {
  const tokens = issueTokens({ id: 1, role: "USER" }, crypto.randomUUID());
  const execute = mock.method(db, "execute", async () => [[{ role: "USER" }]]);
  try {
    const result = await handler(
      event("/api/auth/refresh", "POST", {
        cookies: [`refreshToken=${tokens.refreshToken}`],
      }),
      {},
    );
    assert.equal(result.statusCode, 200);
    assert.ok(JSON.parse(result.body).accessToken);
    assert.equal(result.cookies.length, 1);
    assert.match(result.cookies[0], /HttpOnly/);
    assert.match(result.cookies[0], /Secure/);
    assert.match(result.cookies[0], /SameSite=Strict/);
    assert.match(result.cookies[0], /Path=\/api\/auth/);
    const logout = await handler(
      event("/api/auth/logout", "POST", {
        headers: { authorization: `Bearer ${tokens.accessToken}` },
      }),
      {},
    );
    assert.equal(logout.statusCode, 204);
    assert.match(logout.cookies[0], /refreshToken=;/);
    assert.match(logout.cookies[0], /Expires=Thu, 01 Jan 1970/);
  } finally {
    execute.mock.restore();
  }
});

test("base64 multipart upload enforces the Lambda-safe size limit", async () => {
  const token = issueTokens(
    { id: 1, role: "USER" },
    crypto.randomUUID(),
  ).accessToken;
  const boundary = "leafcare-test-boundary";
  const bytes = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="leaf"; filename="leaf.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    Buffer.alloc(4 * 1024 * 1024 + 1),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const result = await handler(
    event("/api/analyses", "POST", {
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "content-length": String(bytes.length),
      },
      body: bytes.toString("base64"),
      isBase64Encoded: true,
    }),
    {},
  );
  assert.equal(result.statusCode, 400);
  assert.equal(JSON.parse(result.body).error, "File too large");
});

test("encrypted upload bytes are written to the private S3 bucket", async () => {
  const send = mock.method(s3, "send", async () => ({}));
  try {
    const plain = Buffer.from("test image");
    const { encrypted } = encrypt(plain);
    await saveUpload("test.bin", encrypted);
    const input = send.mock.calls[0].arguments[0].input;
    assert.equal(input.Bucket, "test-uploads");
    assert.equal(input.Key, "test.bin");
    assert.deepEqual(input.Body, encrypted);
    assert.notDeepEqual(input.Body, plain);
    assert.equal(input.ServerSideEncryption, "AES256");
  } finally {
    send.mock.restore();
  }
});
