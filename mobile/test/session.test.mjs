import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, endpoints } from "../../common/api.js";
import { createPersistentSession } from "../../common/persistent-session.js";

const original = { accessToken: "old-access", refreshToken: "old-refresh" };
const renewed = { accessToken: "new-access", refreshToken: "new-refresh" };
function fixture(send, saved = original) {
  let stored = saved;
  const session = createPersistentSession({
    read: async () => stored,
    write: async value => { stored = value; },
    send,
  });
  return { session, stored: () => stored };
}

test("relaunch restores saved credentials and persists the rotated refresh token", async () => {
  const { session, stored } = fixture(async (path, token, options) => {
    assert.equal(path, endpoints.refresh);
    assert.equal(token, "");
    assert.deepEqual(JSON.parse(options.body), { refreshToken: "old-refresh" });
    return renewed;
  });
  assert.equal(await session.restore(), "new-access");
  assert.deepEqual(stored(), renewed);
});

test("concurrent expired requests share one refresh and retry with renewed credentials", async () => {
  let refreshes = 0;
  const { session } = fixture(async (path, token) => {
    if (path === endpoints.refresh) {
      refreshes++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return renewed;
    }
    if (token === "old-access") throw new ApiError("Expired", 401);
    assert.equal(token, "new-access");
    return path;
  });
  await session.save(original);
  assert.deepEqual(await Promise.all([
    session.request(endpoints.me, "old-access"),
    session.request(endpoints.analyses, "old-access"),
  ]), [endpoints.me, endpoints.analyses]);
  assert.equal(refreshes, 1);
});

test("offline relaunch keeps credentials; a revoked session removes them", async () => {
  const offline = fixture(async () => { throw Error("Offline"); });
  assert.equal(await offline.session.restore(), "old-access");
  assert.deepEqual(offline.stored(), original);
  const revoked = fixture(async () => { throw new ApiError("Revoked", 401); });
  assert.equal(await revoked.session.restore(), "");
  assert.equal(revoked.stored(), null);
});

test("logout cannot be undone by an in-flight refresh", async () => {
  let finish;
  const { session, stored } = fixture(() => new Promise(resolve => { finish = resolve; }));
  const restore = session.restore();
  await new Promise(resolve => setTimeout(resolve, 0));
  await session.clear();
  finish(renewed);
  assert.equal(await restore, "");
  assert.equal(stored(), null);
});

test("failed credential storage prevents a login that would be lost on restart", async () => {
  const session = createPersistentSession({ read: async () => null, write: async () => { throw Error("Storage failed"); }, send: async () => renewed });
  await assert.rejects(session.save(original), /Storage failed/);
});
