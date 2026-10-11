import assert from "node:assert/strict";
import test from "node:test";
import { endpoints, requestApi, uploadRules } from "../../common/api.js";
import {
  analysisStatus,
  filterHistory,
  languages,
} from "../../common/content.js";

test("browser transport includes refresh cookies and returns protected image blobs", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/analyses/a%2Fb/image");
    assert.equal(options.credentials, "include");
    assert.equal(
      new Headers(options.headers).get("Authorization"),
      "Bearer browser-token",
    );
    return new Response("photo", { headers: { "Content-Type": "image/jpeg" } });
  };
  try {
    const blob = await requestApi(endpoints.image("a/b"), {
      token: "browser-token",
      credentials: "include",
      responseType: "blob",
    });
    assert.equal(await blob.text(), "photo");
  } finally {
    globalThis.fetch = original;
  }
});

test("history filters distinguish attention, review, and healthy entries", () => {
  const items = [
    {
      id: "healthy",
      status: "COMPLETED",
      disease_name: "Healthy leaf",
      plant_name: "Tomato",
      severity: "LOW",
    },
    {
      id: "attention",
      status: "COMPLETED",
      disease_name: "Leaf spot",
      provided_plant_name: "Rose",
      severity: "HIGH",
    },
    { id: "review", status: "REVIEW_REQUIRED", severity: "LOW" },
  ];
  assert.equal(analysisStatus(items[0]), "Healthy");
  assert.equal(analysisStatus(items[1]), "Needs attention");
  assert.equal(analysisStatus(items[2]), "Review required");
  assert.deepEqual(
    filterHistory(items, "rose", "attention").map((x) => x.id),
    ["attention"],
  );
  assert.deepEqual(
    filterHistory(items, "", "review").map((x) => x.id),
    ["review"],
  );
  assert.deepEqual(filterHistory(items, "missing", "all"), []);
});

test("shared language labels and upload limits preserve the client contract", () => {
  assert.equal(languages.te, "\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41");
  assert.equal(languages.hi, "\u0939\u093f\u0902\u0926\u0940");
  assert.equal(uploadRules.maxBytes, 4194304);
  assert.equal(uploadRules.minDimension, 300);
});
