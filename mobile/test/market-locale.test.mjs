import assert from "node:assert/strict";
import test from "node:test";
import { translate, normalizeLanguage } from "../../common/locale.js";
import { marketLabels } from "../../common/market-locales.js";
import { languages, speechLanguages } from "../../common/content.js";
import { price, mspPrices, mandiNote, mspNote, riceNote, mspSeason } from "../../common/market.js";

test("market copy, MSP crops, explanations and status messages translate in every supported language", () => {
  for (const code of ["te", "hi", "kn", "ta"]) {
    const t = (text) => translate(code, text);
    for (const key of [...Object.keys(marketLabels), ...mspPrices.map(([name]) => name), mandiNote, mspNote, riceNote, mspSeason]) {
      assert.notEqual(t(key), key, `${code}: ${key}`);
      assert.ok(t(key).length);
    }
    assert.equal(price(null, t), t("Not reported"));
    assert.equal(price(2441, t), `₹2,441 / ${t("quintal")}`);
  }
});

test("language switching resolves cached market copy without changing prices or unknown provider names", () => {
  const message = "Local mandi data is not connected yet. Government MSPs are available below.";
  assert.notEqual(translate("kn", message), translate("ta", message));
  assert.equal(translate("en", message), message);
  assert.equal(translate("kn", "Unknown mandi name"), "Unknown mandi name");
  for (const code of ["kn", "ta"]) {
    assert.equal(normalizeLanguage(`${code}-IN`), code);
    assert.ok(languages[code]);
    assert.equal(speechLanguages[code], `${code}-IN`);
    assert.notEqual(translate(code, "Choose your language"), "Choose your language");
    assert.notEqual(translate(code, "Good morning, Farmer"), "Good morning, Farmer");
  }
});
