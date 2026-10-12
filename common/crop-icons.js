export const cropIconVersion = "v1";
export const cropIconSlots = {
  cotton: 0,
  rice: 1,
  maize: 2,
  jowar: 3,
  ragi: 4,
  bajra: 5,
  groundnut: 6,
  soybean: 7,
  sunflower: 8,
  sesame: 9,
  niger: 10,
  tur: 11,
  urad: 12,
  pulse: 13,
  chilli: 14,
  tomato: 15,
  vegetable: 16,
  fruit: 17,
  seed: 18,
  plant: 19,
  grain: 1,
};
export function cropIconPath(key) {
  if (!Object.hasOwn(cropIconSlots, key)) throw new Error("Unknown crop icon");
  return `/api/crop-icons/${cropIconVersion}/${key}.png`;
}
