export const cropCategories = [
  "Cereals & Millets",
  "Pulses",
  "Oilseeds",
  "Fibre crops",
  "Vegetables",
  "Fruits",
  "Spices",
  "Other crops",
];
export const categoryImages = {
  "All crops": "Crop plant",
  "Cereals & Millets": "Paddy",
  Pulses: "Moong",
  Oilseeds: "Sunflower seed",
  "Fibre crops": "Cotton",
  Vegetables: "Tomato",
  Fruits: "Mango",
  Spices: "Turmeric",
  "Other crops": "Crop plant",
  all: "Crop plant",
};

const crops = [
  [/cotton/i, "Fibre crops", "cotton"],
  [/rice|paddy/i, "Cereals & Millets", "rice"],
  [/maize|corn/i, "Cereals & Millets", "maize"],
  [/jowar|sorghum/i, "Cereals & Millets", "jowar"],
  [/ragi/i, "Cereals & Millets", "ragi"],
  [/bajra/i, "Cereals & Millets", "bajra"],
  [
    /rice|paddy|wheat|maize|corn|jowar|sorghum|bajra|millet|ragi|barley/i,
    "Cereals & Millets",
    "grain",
  ],
  [/groundnut|peanut/i, "Oilseeds", "groundnut"],
  [/soybean|soya/i, "Oilseeds", "soybean"],
  [/sunflower/i, "Oilseeds", "sunflower"],
  [/sesamum|sesame/i, "Oilseeds", "sesame"],
  [/nigerseed/i, "Oilseeds", "niger"],
  [
    /soybean|soya|sunflower|sesamum|sesame|nigerseed|mustard|rapeseed|safflower|castor|linseed/i,
    "Oilseeds",
    "seed",
  ],
  [/\b(tur|arhar)\b/i, "Pulses", "tur"],
  [/urad|urd|black gram/i, "Pulses", "urad"],
  [
    /\b(tur|arhar|moong|urad|gram|lentil|masur|pulses?|rajma|peas?)\b|green gram|black gram|bengal gram/i,
    "Pulses",
    "pulse",
  ],
  [/chilli|chili|mirchi/i, "Vegetables", "chilli"],
  [/tomato/i, "Vegetables", "tomato"],
  [
    /potato|onion|brinjal|eggplant|cabbage|cauliflower|okra|bhindi|gourd|carrot|bean|cucumber|cucumbar|radish|spinach|garlic/i,
    "Vegetables",
    "vegetable",
  ],
  [
    /mango|banana|apple|orange|grape|papaya|guava|pomegranate|melon|lemon|lime|pineapple|sapota/i,
    "Fruits",
    "fruit",
  ],
  [
    /turmeric|ginger|cumin|coriander|pepper|cardamom|clove|fenugreek/i,
    "Spices",
    "seed",
  ],
];

const specificImages = [
  [/banana/i, "banana"],
  [/bhindi|okra|ladies finger/i, "okra"],
  [/brinjal|eggplant/i, "brinjal"],
  [/cabbage/i, "cabbage"],
  [/cauliflower/i, "cauliflower"],
  [/cucumber|cucumbar|kheera/i, "cucumber"],
  [/lemon|lime/i, "lemon"],
  [/mustard/i, "mustard"],
  [/onion/i, "onion"],
  [/potato/i, "potato"],
  [/wheat/i, "wheat"],
  [/turmeric/i, "turmeric"],
  [/bengal gram|chickpea|^gram\b/i, "chickpea"],
  [/green.*chill/i, "green-chilli"],
  [/^apple\b/i, "apple"],
  [/orange/i, "orange"],
  [/grape/i, "grape"],
  [/papaya/i, "papaya"],
  [/guava/i, "guava"],
  [/pomegranate/i, "pomegranate"],
  [/watermelon/i, "watermelon"],
  [/pineapple/i, "pineapple"],
  [/ginger/i, "ginger"],
  [/cumin/i, "cumin"],
  [/coriander/i, "coriander"],
];

export function cropDetails(name = "") {
  const match = crops.find(([pattern]) => pattern.test(name));
  const specific = specificImages.find(([pattern]) => pattern.test(name));
  // The legacy fruit tile depicts a mango; other unpictured crops use a
  // neutral plant instead of displaying a different crop's photograph.
  const fallbackImage = match && (
    match[2] === "vegetable" || match[2] === "grain" || match[2] === "seed" ||
    (match[2] === "fruit" && !/mango/i.test(name))
  ) ? "plant" : match?.[2];
  return match
    ? { category: match[1], image: specific?.[1] || fallbackImage }
    : { category: "Other crops", image: "plant" };
}

export function groupCrops(items, nameOf) {
  return cropCategories
    .map((category) => ({
      category,
      items: items.filter(
        (item) => cropDetails(nameOf(item)).category === category,
      ),
    }))
    .filter((group) => group.items.length);
}
