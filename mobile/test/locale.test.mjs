import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { localeLabels, translate } from "../../common/locale.js";
import { languages, screens, photoChecks } from "../../common/content.js";
import { farmSections } from "../../common/farm.js";
import {
  farmPresentation,
  farmPlaceholders,
} from "../../common/farm-presentation.js";
import { userDetailSections } from "../../common/profile.js";
import { weatherMetrics } from "../../common/weather.js";

test("client and mobile literal UI label calls share complete translations", () => {
  for (const root of ["../../client/src/", "../src/"]) {
    const directory = new URL(root, import.meta.url);
    for (const file of readdirSync(directory, { recursive: true })) {
      if (!/\.(jsx|tsx)$/.test(file)) continue;
      const source = readFileSync(new URL(file.replaceAll("\\", "/"), directory), "utf8");
      // Match static calls, including multiline calls with a trailing comma.
      for (const match of source.matchAll(/\b(?:localize|t)\(\s*(["'])([^"'\n]*)\1\s*,?\s*\)/g)) {
        const label = match[2];
        for (const language of Object.keys(languages).filter((code) => code !== "en")) {
          assert.notEqual(translate(language, label), label, `${file}: ${language}: ${label}`);
        }
      }
    }
  }
});

test("every shared label has translations in every supported Indian language", () => {
  for (const [key, translations] of Object.entries(localeLabels)) {
    assert.equal(translations.length, 4, key);
    for (const value of translations) {
      assert.ok(value?.trim(), key);
      assert.notEqual(value, key, key);
      assert.deepEqual(
        value.match(/\{\w+\}/g) ?? [],
        key.match(/\{\w+\}/g) ?? [],
        key,
      );
    }
  }
});

test("screen titles, form labels and choices, and weather metrics are localized", () => {
  const labels = [...Object.values(screens), ...photoChecks];
  labels.push(...Object.values(farmPlaceholders));
  for (const section of Object.values(farmPresentation)) {
    labels.push(section.description, section.empty);
    if (section.extra) labels.push(section.extra);
  }
  for (const section of [...farmSections, ...userDetailSections]) {
    labels.push(section.title);
    for (const field of section.fields) {
      labels.push(field.label, ...(field.options ?? []));
      if (field.placeholder) labels.push(field.placeholder);
    }
  }
  // Enumerate the metric catalogue through its public API.
  const allFields = new Proxy({}, { has: () => true, get: () => 1 });
  labels.push(...weatherMetrics(allFields, {}).map((metric) => metric.label));
  for (const language of Object.keys(languages).filter(
    (code) => code !== "en",
  )) {
    for (const label of labels) {
      assert.notEqual(
        translate(language, label),
        label,
        `${language}: ${label}`,
      );
    }
  }
});

test("regional language tags translate and preserve dynamic greeting names", () => {
  assert.equal(translate("kn-IN", "Good morning, Ravi"), "ಶುಭೋದಯ, Ravi");
  assert.equal(
    translate("ta_IN", "Enter 4-digit PIN"),
    "4 இலக்க PIN ஐ உள்ளிடவும்",
  );
  assert.equal(translate("en", "Enter 4-digit PIN"), "Enter 4-digit PIN");
  assert.equal(
    translate("te", "An unknown server message"),
    "An unknown server message",
  );
});
