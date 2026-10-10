import { farmSections } from "./farm.js";

export function overviewFarms(user) {
  if (user?.farms?.length) return user.farms;
  if (Object.values(user?.farmDetails || {}).some(value => value?.trim())) {
    return [{ id: "profile-farm", details: user.farmDetails, crops: [] }];
  }
  return [];
}

export function overviewFields(details, crop = false) {
  return farmSections.filter(section => crop
    ? ["Present crop", "Previous crop"].includes(section.title)
    : !["Present crop", "Previous crop"].includes(section.title))
    .flatMap(section => section.fields).filter(field => details[field.key]?.trim());
}

export function overviewCrops(farm) {
  if (farm.crops?.length) return farm.crops;
  const current = Object.fromEntries(Object.entries(farm.details).filter(([key]) => !key.startsWith("previous") && key !== "residueManagement"));
  const previous = Object.fromEntries(Object.entries(farm.details).filter(([key]) => key.startsWith("previous") || key === "residueManagement"));
  return [
    ...(overviewFields(current, true).length ? [{ id: `${farm.id}-current`, status: "CURRENT", details: current }] : []),
    ...(overviewFields(previous, true).length ? [{ id: `${farm.id}-previous`, status: "PREVIOUS", details: previous }] : []),
  ];
}
