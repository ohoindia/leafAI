import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadEnvironment } from "../dist/load-environment.js";

test("loads root .env from both root and server launch directories", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "leaf-env-"));
  try {
    const server = path.join(root, "server");
    mkdirSync(server);
    writeFileSync(path.join(root, ".env"), "DB_HOST=root-db\nDB_NAME=leaf_ai\n");
    for (const cwd of [root, server]) {
      const target = {};
      loadEnvironment({ root, cwd, target });
      assert.equal(target.DB_HOST, "root-db");
      assert.equal(target.DB_NAME, "leaf_ai");
    }
    writeFileSync(path.join(server, ".env"), "DB_HOST=server-db\n");
    const fromRoot = {};
    loadEnvironment({ root, cwd: root, target: fromRoot });
    assert.equal(fromRoot.DB_HOST, "server-db");
    const target = { DB_NAME: "deployment-db" };
    loadEnvironment({ root, cwd: server, target });
    assert.equal(target.DB_HOST, "server-db");
    assert.equal(target.DB_NAME, "deployment-db");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("Lambda uses injected variables without reading local env files", () => {
  const target = { AWS_LAMBDA_FUNCTION_NAME: 'leafcare-test', DB_HOST: 'aws-db' };
  const result = loadEnvironment({ target });
  assert.deepEqual(result.parsed, {});
  assert.deepEqual(target, { AWS_LAMBDA_FUNCTION_NAME: 'leafcare-test', DB_HOST: 'aws-db' });
});

test("explicit dotenv path takes precedence over default files", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "leaf-env-"));
  try {
    writeFileSync(path.join(root, ".env"), "DB_HOST=default-db\nDB_NAME=default-name\n");
    writeFileSync(path.join(root, "custom.env"), "DB_HOST=custom-db\n");
    const target = { DOTENV_CONFIG_PATH: "custom.env" };
    loadEnvironment({ root, cwd: root, target });
    assert.equal(target.DB_HOST, "custom-db");
    assert.equal(target.DB_NAME, undefined);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
