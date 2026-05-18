/**
 * Starter taxonomy for new categories — shown as quick picks in the catalog UI.
 * Keys are top-level names; values are typical subcategories.
 */
export const SUGGESTED_CATALOG_CATEGORIES: Record<string, string[]> = {
  Beverages: [
    "Bottled Water",
    "Sodas",
    "Fruit Juices",
    "Energy Drinks",
    "Sports Drinks",
    "Iced Tea",
    "Tea",
    "Coffee",
    "Drinking Chocolate",
    "Malt Drinks",
    "Cordials & Syrups",
  ],
  "Dairy & Refrigerated": [
    "Fresh Milk",
    "Long Life Milk",
    "Flavoured Milk",
    "Yoghurt",
    "Cheese",
    "Butter",
    "Margarine",
    "Cream",
    "Eggs",
  ],
  Bakery: ["Bread", "Buns & Rolls", "Cakes", "Cookies", "Doughnuts"],
  "Cereals & Breakfast": [
    "Breakfast Cereals",
    "Oats",
    "Granola",
    "Muesli",
    "Cornflakes",
    "Porridge Flour",
  ],
  "Grains & Staples": [
    "Rice",
    "Beans",
    "Green Grams",
    "Ndengu",
    "Lentils",
    "Peas",
    "Cow Peas",
    "Soya Beans",
    "Maize",
    "Wheat",
    "Sorghum",
    "Millet",
  ],
  "Flours & Baking": [
    "Maize Flour",
    "Wheat Flour",
    "Self-Raising Flour",
    "Baking Powder",
    "Baking Soda",
    "Yeast",
    "Cake Mixes",
  ],
  "Pantry & Cooking Essentials": [
    "Cooking Oil",
    "Sugar",
    "Salt",
    "Spices",
    "Seasonings",
    "Soup Mixes",
    "Sauces",
    "Condiments",
    "Vinegar",
  ],
  "Pasta & Noodles": ["Pasta", "Spaghetti", "Macaroni", "Instant Noodles"],
  "Canned & Packaged Foods": [
    "Baked Beans",
    "Tomato Paste",
    "Canned Fish",
    "Canned Vegetables",
    "Canned Fruits",
  ],
  "Fresh Produce": ["Vegetables", "Leafy Greens", "Fruits", "Herbs", "Tubers"],
  "Green Grocery": [
    "Tomatoes",
    "Onions",
    "Potatoes",
    "Carrots",
    "Cabbages",
    "Kales (Sukuma Wiki)",
    "Spinach",
    "Capsicums",
    "Cucumbers",
    "Avocados",
    "Bananas",
    "Oranges",
    "Lemons",
  ],
  "Meat, Fish & Eggs": ["Beef", "Chicken", "Sausages", "Fish", "Eggs"],
  "Frozen Foods": [
    "Frozen Chicken",
    "Frozen Fish",
    "Frozen Vegetables",
    "Ice Cream",
  ],
  "Snacks & Confectionery": [
    "Biscuits",
    "Crisps",
    "Nuts",
    "Chocolate",
    "Sweets",
    "Chewing Gum",
    "Popcorn",
  ],
  "Personal Care & Beauty": [
    "Body Lotion",
    "Bath Soap",
    "Shower Gel",
    "Petroleum Jelly",
    "Shampoo",
    "Conditioner",
    "Hair Food",
    "Hair Oil",
    "Toothpaste",
    "Toothbrushes",
    "Deodorants",
    "Sanitary Towels",
    "Razors",
  ],
  "Baby Care": [
    "Diapers",
    "Baby Wipes",
    "Baby Lotion",
    "Baby Powder",
    "Baby Soap",
    "Baby Food",
  ],
  "Laundry & Cleaning": [
    "Washing Powder",
    "Laundry Bars",
    "Fabric Softeners",
    "Bleach",
    "Stain Removers",
    "Dishwashing Liquid",
    "Scouring Pads",
    "Disinfectants",
    "Floor Cleaners",
    "Toilet Cleaners",
  ],
  "Household Supplies": [
    "Toilet Paper",
    "Tissues",
    "Paper Towels",
    "Aluminium Foil",
    "Cling Film",
    "Garbage Bags",
    "Matches",
    "Candles",
    "Mosquito Coils",
  ],
  "Health & Wellness": [
    "Pain Relievers",
    "Cold Medicines",
    "Antacids",
    "Vitamins",
    "First Aid Supplies",
  ],
  "Stationery & School Supplies": [
    "Exercise Books",
    "Pens",
    "Pencils",
    "Markers",
    "Erasers",
    "Rulers",
    "Files",
    "Paper Clips",
    "Staplers",
  ],
  "Mobile & Electronics Accessories": [
    "Airtime",
    "Data Bundles",
    "Batteries",
    "Charging Cables",
    "Chargers",
    "Earphones",
    "Power Banks",
  ],
  "Pet Care": ["Dog Food", "Cat Food", "Pet Treats"],
  "Seasonal & Miscellaneous": [
    "Gift Items",
    "Decorations",
    "Umbrellas",
    "Balloons",
  ],
};

const SUGGESTION_SUB_SEP = "\u001f";

export function suggestionTopKey(parent: string): string {
  return `top:${parent}`;
}

export function suggestionSubKey(parent: string, child: string): string {
  return `sub:${parent}${SUGGESTION_SUB_SEP}${child}`;
}

export function parseSuggestionSubKey(restAfterSubPrefix: string): {
  parentName: string;
  childName: string;
} {
  const i = restAfterSubPrefix.indexOf(SUGGESTION_SUB_SEP);
  if (i < 0) {
    return { parentName: restAfterSubPrefix, childName: "" };
  }
  return {
    parentName: restAfterSubPrefix.slice(0, i),
    childName: restAfterSubPrefix.slice(i + SUGGESTION_SUB_SEP.length),
  };
}

export function keysForSuggestedGroups(groups: readonly string[]): string[] {
  const keys: string[] = [];
  for (const parent of groups) {
    const children = SUGGESTED_CATALOG_CATEGORIES[parent];
    if (!children) {
      continue;
    }
    keys.push(suggestionTopKey(parent));
    for (const child of children) {
      keys.push(suggestionSubKey(parent, child));
    }
  }
  return keys;
}

/** One-tap starter kits for the bulk category picker. */
export const CATEGORY_STARTER_KITS = [
  {
    id: "full-grocery",
    label: "Full grocery",
    hint: "All departments",
    emoji: "🛒",
    groups: Object.keys(SUGGESTED_CATALOG_CATEGORIES),
  },
  {
    id: "mini-mart",
    label: "Mini mart",
    hint: "Everyday staples",
    emoji: "🏪",
    groups: [
      "Beverages",
      "Snacks & Confectionery",
      "Dairy & Refrigerated",
      "Bakery",
      "Pantry & Cooking Essentials",
      "Personal Care & Beauty",
      "Laundry & Cleaning",
      "Household Supplies",
    ],
  },
  {
    id: "fresh-market",
    label: "Fresh market",
    hint: "Produce & protein",
    emoji: "🥬",
    groups: [
      "Fresh Produce",
      "Green Grocery",
      "Meat, Fish & Eggs",
      "Dairy & Refrigerated",
    ],
  },
  {
    id: "household",
    label: "Household",
    hint: "Home & cleaning",
    emoji: "🧴",
    groups: [
      "Laundry & Cleaning",
      "Household Supplies",
      "Personal Care & Beauty",
      "Baby Care",
    ],
  },
] as const;

/** Visual cue per department in the bulk picker. */
export const SUGGESTED_DEPARTMENT_EMOJI: Record<string, string> = {
  Beverages: "🥤",
  "Dairy & Refrigerated": "🥛",
  Bakery: "🥖",
  "Cereals & Breakfast": "🥣",
  "Grains & Staples": "🌾",
  "Flours & Baking": "🧁",
  "Pantry & Cooking Essentials": "🫒",
  "Pasta & Noodles": "🍝",
  "Canned & Packaged Foods": "🥫",
  "Fresh Produce": "🍎",
  "Green Grocery": "🥬",
  "Meat, Fish & Eggs": "🥩",
  "Frozen Foods": "🧊",
  "Snacks & Confectionery": "🍫",
  "Personal Care & Beauty": "💄",
  "Baby Care": "👶",
  "Laundry & Cleaning": "🧼",
  "Household Supplies": "🏠",
  "Health & Wellness": "💊",
  "Stationery & School Supplies": "✏️",
  "Mobile & Electronics Accessories": "📱",
  "Pet Care": "🐾",
  "Seasonal & Miscellaneous": "🎁",
};
