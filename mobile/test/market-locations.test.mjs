import assert from "node:assert/strict";
import { test } from "node:test";
import { marketLocations, marketStates, matchMarketLocation } from "../../common/market-locations.js";

test("all Indian states and union territories have district choices", () => {
  assert.equal(marketStates.length, 36);
  for (const state of marketStates) {
    assert.ok(marketLocations[state].length, state);
    assert.equal(new Set(marketLocations[state]).size, marketLocations[state].length);
  }
  assert.ok(marketLocations.Telangana.includes("Ranga Reddy"));
  assert.ok(!marketLocations.Karnataka.includes("Ranga Reddy"));
  assert.ok(marketStates.includes("Ladakh"));
});

test("device and government spellings select the matching state and district", () => {
  assert.deepEqual(matchMarketLocation("Telangana", "Rangareddi"), { state: "Telangana", district: "Ranga Reddy" });
  assert.equal(matchMarketLocation("Keralam").state, "Kerala");
  assert.equal(matchMarketLocation("NCT of Delhi").state, "Delhi");
  assert.equal(matchMarketLocation("Andaman and Nicobar").state, "Andaman and Nicobar Islands");
  assert.deepEqual(matchMarketLocation("Karnataka", "Ranga Reddy"), { state: "Karnataka", district: "" });
});
