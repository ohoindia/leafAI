export type FarmFieldKey =
  | "farmName"
  | "phone"
  | "village"
  | "district"
  | "state"
  | "country"
  | "postalCode"
  | "latitude"
  | "longitude"
  | "area"
  | "areaUnit"
  | "ownership"
  | "soilType"
  | "soilPh"
  | "soilTestDate"
  | "waterSource"
  | "irrigation"
  | "drainage"
  | "presentCrop"
  | "presentVariety"
  | "season"
  | "sowingDate"
  | "harvestDate"
  | "cropArea"
  | "growthStage"
  | "seedSource"
  | "spacing"
  | "irrigationSchedule"
  | "fertilizers"
  | "pesticides"
  | "currentIssues"
  | "previousCrop"
  | "previousVariety"
  | "previousSeason"
  | "previousHarvestDate"
  | "previousYield"
  | "previousIssues"
  | "previousTreatment"
  | "residueManagement"
  | "farmingMethod"
  | "otherCrops"
  | "weather"
  | "notes";
export type FarmDetails = Partial<Record<FarmFieldKey, string>>;
export type FarmField = {
  key: FarmFieldKey;
  label: string;
  type: string;
  options?: string[];
};
export const farmSections: { title: string; fields: FarmField[] }[];

export type FarmRecord = {
  id: string;
  details: FarmDetails;
  crops: { id: string; status: "CURRENT" | "PREVIOUS"; details: FarmDetails }[];
};
