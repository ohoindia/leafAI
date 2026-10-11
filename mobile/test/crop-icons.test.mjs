import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createCropIconCache } from "../../common/crop-icon-cache.js";
import { cropIconPath } from "../../common/crop-icons.js";
import { cropDetails, cropCategories, categoryImages, groupCrops } from "../../common/crops.js";
import { mspPrices } from "../../common/market.js";

test("all MSP crops and categories have matching bundled and server PNG icons", () => {
  for (const name of [...mspPrices.map(([name]) => name), ...cropCategories.map((category) => categoryImages[category])]) {
    const key = cropDetails(name).image;
    const local = fs.readFileSync(new URL(`../assets/crop-icons/v1/${key}.png`, import.meta.url));
    const remote = fs.readFileSync(new URL(`../../server/assets/crop-icons/v1/${key}.png`, import.meta.url));
    assert.deepEqual(local, remote, name);
    assert.equal(local.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  }
  const grains = ["Maize", "Jowar", "Ragi", "Bajra"].map((name) => cropDetails(name).image);
  assert.equal(new Set(grains).size, 4);
  assert.equal(groupCrops(mspPrices, ([name]) => name).flatMap((group) => group.items).length, mspPrices.length);
  assert.throws(() => cropIconPath("../../secret"), /Unknown crop icon/);
});

test("cached icons work without a network download", async () => {
  const get = createCropIconCache({ read: async () => "file://cached.png", remove: async () => {}, download: async () => { throw Error("offline"); } });
  assert.equal(await get("rice"), "file://cached.png");
});

test("missing icons download once when several cards request the same crop", async () => {
  let downloads = 0;
  const get = createCropIconCache({ read: async () => null, remove: async () => {}, download: async () => { downloads++; return "file://rice.png"; } });
  assert.deepEqual(await Promise.all([get("rice"), get("rice"), get("rice")]), Array(3).fill("file://rice.png"));
  assert.equal(downloads, 1);
});

test("a corrupt cached image is removed before downloading a replacement", async () => {
  let cached = "file://bad.png";
  const order = [];
  const get = createCropIconCache({ read: async () => cached || null, remove: async () => { order.push("remove"); cached = ""; }, download: async () => { order.push("download"); return "file://replacement.png"; } });
  assert.equal(await get("rice", true), "file://replacement.png");
  assert.deepEqual(order, ["remove", "download"]);
});

test("failed downloads release their pending request so later recovery can retry", async () => {
  let offline = true;
  const get = createCropIconCache({ read: async () => null, remove: async () => {}, download: async () => { if (offline) throw Error("offline"); return "file://rice.png"; } });
  await assert.rejects(get("rice"), /offline/);
  offline = false;
  assert.equal(await get("rice"), "file://rice.png");
});
