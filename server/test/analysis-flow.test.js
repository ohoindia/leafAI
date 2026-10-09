import assert from "node:assert/strict";
import { after, test } from "node:test";
import crypto from "node:crypto";
import sharp from "sharp";

Object.assign(process.env, {
  NODE_ENV: "test",
  AWS_LAMBDA_FUNCTION_NAME: "test",
  UPLOAD_BUCKET: "test-uploads",
  DB_HOST: "localhost",
  DB_NAME: "test",
  DB_USER: "test",
  DB_PASSWORD: "test",
  OPENAI_API_KEY: "test",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  UPLOAD_ENCRYPTION_KEY: "c".repeat(64),
});
const { AnalysesService } =
  await import("../dist/analyses/analyses.service.js");
const { VoiceCommandsService } =
  await import("../dist/voice-commands/voice-commands.service.js");
const { encrypt, decrypt, sha256 } = await import("../dist/security.js");
const { db } = await import("../dist/db.js");
after(() => db.end());
const id = crypto.randomUUID();
const request = {
  user: { sub: "7" },
  params: { id },
  body: {
    consent: "true",
    language: "te",
    plantName: " Tomato ",
    location: " Balcony ",
  },
};
const analysis = {
  plant: "Tomato",
  condition: "Early blight",
  confidence: 0.87,
  severity: "MEDIUM",
  is_leaf: true,
  translations: {
    en: { summary: "Summary", actions: [] },
    te: { summary: "సారాంశం", actions: [] },
    hi: { summary: "सारांश", actions: [] },
  },
};

test("analysis persists context, consent, translated output and returns reopenable metadata", async () => {
  const calls = [],
    saved = [];
  const image = await sharp({
    create: { width: 400, height: 400, channels: 3, background: "green" },
  })
    .jpeg()
    .toBuffer();
  const service = new AnalysesService(
    {
      execute: async (sql, args) => {
        calls.push({ sql, args });
        return sql.startsWith("SELECT")
          ? [
              [
                {
                  id: "saved-id",
                  status: "COMPLETED",
                  analysis_json: JSON.stringify(analysis),
                  original_file_name: "leaf.jpg",
                  consent_to_analyze: 1,
                  provided_plant_name: "Tomato",
                  plant_location: "Balcony",
                },
              ],
            ]
          : [{ affectedRows: 1 }];
      },
      audit: async () => {},
    },
    { encrypt, decrypt, sha256 },
    { saveUpload: async (...args) => saved.push(args) },
    {
      analyzeLeaf: async (bytes, mime, context) => {
        assert.equal(mime, "image/jpeg");
        assert.equal(context.plantName, "Tomato");
        assert.equal(context.location, "Balcony");
        return { id: "response", data: analysis };
      },
    },
  );
  const result = await service.create({
    ...request,
    file: { buffer: image, originalname: "leaf.jpg" },
  });
  const insert = calls.find((x) =>
    x.sql.startsWith("INSERT INTO leaf_analyses"),
  );
  assert.deepEqual(insert.args.slice(-2), ["Tomato", "Balcony"]);
  assert.equal(insert.args[3], "te");
  assert.ok(calls.some((x) => x.sql.includes("consent_to_analyze")));
  assert.equal(saved.length, 1);
  assert.notDeepEqual(saved[0][1], image);
  assert.equal(result.translations.te.summary, "సారాంశం");
  assert.equal(result.original_file_name, "leaf.jpg");
  assert.equal(result.plant_location, "Balcony");
});

test("consent and metadata validation happen before writing uploads", async () => {
  const service = new AnalysesService(
    {},
    {},
    { saveUpload: () => assert.fail("Must not save invalid upload") },
    {},
  );
  await assert.rejects(
    service.create({ ...request, body: { consent: "false" } }),
    /Consent is required/,
  );
  await assert.rejects(
    service.create({
      ...request,
      body: { ...request.body, plantName: "x".repeat(151) },
      file: {},
    }),
    /too_big/,
  );
});

test("history parses MySQL JSON and preserves legacy analysis_json consumers", async () => {
  for (const json of [analysis, JSON.stringify(analysis)]) {
    const service = new AnalysesService({
      execute: async (sql, args) => {
        assert.match(sql, /a.user_id=\?/);
        assert.deepEqual(args, [id, "7"]);
        return [
          [
            {
              id,
              status: "COMPLETED",
              analysis_json: json,
              error_message: "internal secret",
              output_en: {},
            },
          ],
        ];
      },
    });
    const result = await service.findOne(request);
    assert.deepEqual(result.analysis_json, analysis);
    assert.equal(result.plant, "Tomato");
    assert.equal(result.error_message, undefined);
  }
});

test("photo retrieval is owner scoped and decrypts authenticated bytes", async () => {
  const plain = Buffer.from("leaf image"),
    data = encrypt(plain);
  const service = new AnalysesService(
    {
      execute: async (sql, args) => {
        assert.match(sql, /a.user_id=\?/);
        assert.match(sql, /deleted_at IS NULL/);
        assert.deepEqual(args, [id, "7"]);
        return [
          [
            {
              storage_key: "key",
              encryption_iv: data.iv,
              encryption_tag: data.tag,
            },
          ],
        ];
      },
    },
    { decrypt },
    { readUpload: async () => data.encrypted },
  );
  assert.deepEqual(await service.image(request), plain);
  assert.throws(() => decrypt(data.encrypted, data.iv, "0".repeat(32)));
});

test("missing or another user's photo cannot reach storage", async () => {
  const service = new AnalysesService(
    { execute: async () => [[]] },
    {},
    { readUpload: () => assert.fail("Must not read inaccessible upload") },
  );
  await assert.rejects(service.image(request), /Not found/);
  await assert.rejects(service.findOne(request), /Not found/);
});

test("voice command cannot link another user's analysis", async () => {
  let calls = 0;
  const service = new VoiceCommandsService({
    execute: async (sql, args) => {
      calls++;
      assert.match(sql, /user_id=\?/);
      assert.deepEqual(args, [id, "7"]);
      return [[]];
    },
  });
  await assert.rejects(
    service.create({
      ...request,
      body: {
        transcript: "Read my result",
        language: "en",
        intent: "read_result",
        successful: true,
        analysisId: id,
      },
    }),
    /Not found/,
  );
  assert.equal(calls, 1);
});
