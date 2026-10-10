import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
Object.assign(process.env, { NODE_ENV: "test", DB_HOST: "localhost", DB_NAME: "test", DB_USER: "test", DB_PASSWORD: "test", OPENAI_API_KEY: "test", JWT_ACCESS_SECRET: "a".repeat(32), JWT_REFRESH_SECRET: "b".repeat(32), UPLOAD_ENCRYPTION_KEY: "c".repeat(64) });
const { AuthService } = await import("../dist/auth/auth.service.js");
const { SecurityService } = await import("../dist/common/security.service.js");
const { userDetailsSchema } = await import("../dist/auth/user-schema.js");

test("contact validation accepts international numbers and rejects malformed input", () => {
  assert.equal(userDetailsSchema.safeParse({ phone: "+91 9876543210", alternatePhone: "", addressLine1: "Home" }).success, true);
  for (const value of [{ phone: "abc" }, { phone: "123" }, { phone: "1".repeat(16) }, { addressLine1: "a".repeat(301) }, { unknown: "value" }]) assert.equal(userDetailsSchema.safeParse(value).success, false);
});

test("user contact and address saves are owner scoped and preserve farm and photo", async () => {
  let saved;
  const service = new AuthService({ execute: async (sql, values) => {
    if (sql.startsWith("UPDATE")) {
      assert.match(sql, /user_details=\?/);
      assert.doesNotMatch(sql, /farm_details=|profile_photo=/);
      assert.equal(values.at(-1), "7");
      saved = JSON.parse(values[2]);
      return [{ affectedRows: 1 }];
    }
    return [[{ full_name: "Farmer", user_details: saved, farm_details: { village: "Farm village" } }]];
  } }, new SecurityService());
  const result = await service.updateProfile({ user: { sub: "7" }, body: { fullName: "Farmer", language: "en", userDetails: { phone: "9876543210", village: " Home village " } } });
  assert.equal(result.userDetails.village, "Home village");
  assert.equal(result.farmDetails.village, "Farm village");
});

test("profile photo is normalized, encrypted and returned only for the authenticated owner", async () => {
  let stored;
  const service = new AuthService({ execute: async (sql, values) => {
    assert.equal(values.at(-1), "7");
    if (sql.startsWith("UPDATE")) {
      assert.match(sql, /profile_photo=\?/);
      assert.doesNotMatch(sql, /user_details=|farm_details=/);
      stored = values[0];
      return [{ affectedRows: 1 }];
    }
    return [[{ full_name: "Farmer", profile_photo: stored }]];
  } }, new SecurityService());
  const buffer = await sharp({ create: { width: 640, height: 480, channels: 3, background: "green" } }).png().toBuffer();
  const result = await service.uploadPhoto({ user: { sub: "7" }, file: { buffer } });
  assert.match(result.profilePhoto, /^data:image\/jpeg;base64,/);
  assert.equal(stored.includes(result.profilePhoto.split(",")[1]), false);
  const meta = await sharp(Buffer.from(result.profilePhoto.split(",")[1], "base64")).metadata();
  assert.equal(meta.width, 384);
  assert.equal(meta.height, 384);
});

test("invalid, missing and oversized photos never write to the database", async () => {
  const service = new AuthService({ execute: () => { assert.fail("Unexpected database write"); } }, new SecurityService());
  for (const file of [undefined, { buffer: Buffer.from("not an image") }, { buffer: Buffer.alloc(4 * 1024 * 1024 + 1) }]) {
    await assert.rejects(service.uploadPhoto({ user: { sub: "7" }, file }));
  }
});
