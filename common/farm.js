export const farmSections = [
  {
    title: "Farm details",
    fields: [
      {
        key: "farmName",
        label: "Farm / plot name",
        type: "text",
      },
      { key: "ppbNo", label: "PPB No", type: "text" },
      { key: "syNo", label: "Sy No", type: "text" },
      {
        key: "phone",
        label: "Contact phone",
        type: "text",
      },
      {
        key: "area",
        label: "Farm area",
        type: "number",
      },
      {
        key: "areaUnit",
        label: "Area unit",
        type: "select",
        options: ["acres", "hectares", "square metres"],
      },
      {
        key: "ownership",
        label: "Land ownership",
        type: "select",
        options: ["Owned", "Leased", "Shared"],
      },
    ],
  },
  {
    title: "Address",
    fields: [
      {
        key: "village",
        label: "Village / town",
        type: "text",
      },
      {
        key: "district",
        label: "District",
        type: "text",
      },
      {
        key: "state",
        label: "State",
        type: "text",
      },
      {
        key: "country",
        label: "Country",
        type: "text",
      },
      {
        key: "postalCode",
        label: "Postal code",
        type: "text",
      },
      {
        key: "latitude",
        label: "Latitude",
        type: "latitude",
      },
      {
        key: "longitude",
        label: "Longitude",
        type: "longitude",
      },
    ],
  },
  {
    title: "Soil",
    fields: [
      {
        key: "soilType",
        label: "Soil type",
        type: "select",
        options: [
          "Clay",
          "Sandy",
          "Loamy",
          "Silty",
          "Black",
          "Red",
          "Other",
          "Unknown",
        ],
      },
      {
        key: "soilPh",
        label: "Soil pH",
        type: "ph",
      },
      {
        key: "soilTestDate",
        label: "Last soil test date",
        type: "date",
      },
    ],
  },
  {
    title: "Water",
    fields: [
      {
        key: "waterSource",
        label: "Water source",
        type: "text",
      },
      {
        key: "irrigation",
        label: "Irrigation method",
        type: "text",
      },
      {
        key: "drainage",
        label: "Drainage conditions",
        type: "text",
      },
    ],
  },
  {
    title: "Present crop",
    fields: [
      {
        key: "presentCrop",
        label: "Present crop",
        type: "text",
      },
      {
        key: "presentVariety",
        label: "Crop variety",
        type: "text",
      },
      {
        key: "season",
        label: "Growing season",
        type: "text",
      },
      {
        key: "sowingDate",
        label: "Sowing / transplanting date",
        type: "date",
      },
      {
        key: "harvestDate",
        label: "Expected harvest date",
        type: "date",
      },
      {
        key: "cropArea",
        label: "Crop area (farm area unit)",
        type: "number",
      },
      {
        key: "growthStage",
        label: "Growth stage",
        type: "text",
      },
      {
        key: "seedSource",
        label: "Seed source",
        type: "text",
      },
      {
        key: "spacing",
        label: "Plant / row spacing",
        type: "text",
      },
      {
        key: "irrigationSchedule",
        label: "Irrigation schedule",
        type: "text",
      },
      {
        key: "fertilizers",
        label: "Fertilizers / manure and application dates",
        type: "notes",
      },
      {
        key: "pesticides",
        label: "Pesticides and application dates",
        type: "notes",
      },
      {
        key: "currentIssues",
        label: "Symptoms, pests and affected area",
        type: "notes",
      },
    ],
  },
  {
    title: "Previous crop",
    fields: [
      {
        key: "previousCrop",
        label: "Previous crop",
        type: "text",
      },
      {
        key: "previousVariety",
        label: "Previous crop variety",
        type: "text",
      },
      {
        key: "previousSeason",
        label: "Previous season / year",
        type: "text",
      },
      {
        key: "previousHarvestDate",
        label: "Previous harvest date",
        type: "date",
      },
      {
        key: "previousYield",
        label: "Previous yield (include unit)",
        type: "text",
      },
      {
        key: "previousIssues",
        label: "Previous pests / diseases",
        type: "notes",
      },
      {
        key: "previousTreatment",
        label: "Previous treatments and results",
        type: "notes",
      },
      {
        key: "residueManagement",
        label: "Crop residue management",
        type: "notes",
      },
    ],
  },
  {
    title: "Additional details",
    fields: [
      {
        key: "farmingMethod",
        label: "Farming method",
        type: "select",
        options: ["Conventional", "Organic", "Integrated", "Other"],
      },
      {
        key: "otherCrops",
        label: "Other crops / intercropping",
        type: "notes",
      },
      {
        key: "weather",
        label: "Recent weather conditions",
        type: "notes",
      },
      {
        key: "notes",
        label: "Other farm details",
        type: "notes",
      },
    ],
  },
];
