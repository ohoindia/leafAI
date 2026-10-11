import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { cropIconAssets } from "../dist/common/crop-icons.js";

test("mobile crop icon endpoint serves PNGs with caching, and missing files return 404", async () => {
  const app = express();
  app.use("/api/crop-icons/v1", cropIconAssets());
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}/api/crop-icons/v1`;
    const response = await fetch(`${root}/maize.png`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /image\/png/);
    assert.match(response.headers.get("cache-control"), /immutable/);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(Buffer.from(bytes.subarray(0, 8)).toString("hex"), "89504e470d0a1a0a");
    assert.equal((await fetch(`${root}/missing.png`)).status, 404);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
