import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { translate } from "../../common/locale.js";
import {
  fertilizerDescription,
  officerDescription,
  locationNote,
} from "../../common/services.js";

test("web and mobile Services copy translates in every supported language", () => {
  const sources = ["../../client/src/Services.jsx", "../src/Services.tsx"].map(
    (path) => readFileSync(new URL(path, import.meta.url), "utf8"),
  );
  const keys = new Set([
    "Services",
    "District",
    "Mandal",
    "Cluster",
    "Finding location…",
    "Use my location",
    fertilizerDescription,
    officerDescription,
    locationNote,
    ...sources.flatMap((source) =>
      [...source.matchAll(/(?:t|setMessage)\("([^"\n]+)"\)/g)].map(
        (match) => match[1],
      ),
    ),
  ]);
  for (const key of keys) {
    assert.equal(translate("en", key), key);
    for (const code of ["te", "hi", "kn", "ta"]) {
      const result = translate(code, key);
      assert.notEqual(result, key, `${code}: ${key}`);
      assert.ok(result.length);
      assert.ok(!result.includes("�"), `${code}: invalid Unicode in ${key}`);
    }
  }
});
