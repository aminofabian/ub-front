/**
 * Starter departments for the item-types UI — shop departments, not products and
 * not categories (categories are a separate catalog tree).
 * Short codes align with backend {@code TaxonomySlug.normalizeItemTypeKey}.
 */

/** Matches backend TaxonomySlug.normalizeItemTypeKey */
export function labelToItemTypeKey(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const SUGGESTED_STORE_SECTIONS = [
  "Grocery",
  "Retail shop",
  "Beef",
  "Goat (Chevon)",
  "Mutton",
  "Chicken",
  "Pork",
  "Fish",
  "Smoked Meat",
  "Sausages",
  "Smokies",
  "Eggs",
  "Offals",
  "Bones",
  "Minced Meat",
  "Value-added Meat",
  "Fruits",
  "Vegetables",
  "Electronics",
  "Mali mali",
  "Beverages",
  "Snacks",
  "Dairy",
  "Bakery",
  "Spices",
  "Grains",
  "Meat & fish",
  "Liquor",
  "Frozen",
  "Personal care",
  "Household",
] as const;

export type StoreSectionStarterKit = {
  id: string;
  label: string;
  sections: readonly string[];
};

export const STORE_SECTION_STARTER_KITS: readonly StoreSectionStarterKit[] = [
  {
    id: "butchery",
    label: "Butchery",
    sections: [
      "Beef",
      "Goat (Chevon)",
      "Mutton",
      "Chicken",
      "Pork",
      "Fish",
      "Smoked Meat",
      "Sausages",
      "Smokies",
      "Eggs",
      "Offals",
      "Bones",
      "Minced Meat",
      "Value-added Meat",
    ],
  },
  {
    id: "mini-mart",
    label: "Mini mart",
    sections: [
      "General Shop",
      "Grocery",
      "Grains & Cereals",
      "Spices & Seasoning",
      "Fruits & Vegetables",
      "Beverages",
      "Snacks & Confectionery",
      "Dairy & Refrigerated",
      "Bakery",
      "Household Goods",
      "Cosmetics & Beauty",
      "Baby Products",
      "Electronics & Accessories",
      "Liquor & Wines",
    ],
  },
  {
    id: "full-grocery",
    label: "Full grocery",
    sections: [
      "Grocery",
      "Snacks",
      "Beverages",
      "Dairy",
      "Bakery",
      "Spices",
      "Grains",
      "Meat & fish",
      "Frozen",
      "Fruits",
      "Vegetables",
      "Personal care",
      "Household",
      "Liquor",
    ],
  },
  {
    id: "produce-shop",
    label: "Produce shop",
    sections: [
      "Fruits",
      "Vegetables",
      "Grocery",
      "Dairy",
      "Bakery",
      "Meat & fish",
    ],
  },
  {
    id: "mixed-shop",
    label: "Mixed shop",
    sections: [
      "Grocery",
      "Fruits",
      "Vegetables",
      "Electronics",
      "Mali mali",
      "Beverages",
      "Snacks",
    ],
  },
];

export type PendingSectionCreate = {
  label: string;
  key: string;
};

/** Merges quick picks and typed extra names into deduped create rows. */
export function buildPendingSectionCreates(opts: {
  pickedLabels: readonly string[];
  extraNames: readonly string[];
  existingKeys: Set<string>;
  existingLabels: Set<string>;
}): PendingSectionCreate[] {
  const seenLabels = new Set<string>();
  const seenKeys = new Set<string>();
  const out: PendingSectionCreate[] = [];

  const add = (rawLabel: string) => {
    const label = rawLabel.trim();
    if (!label) return;
    const labelLower = label.toLowerCase();
    const key = labelToItemTypeKey(label).trim();
    if (!key) return;
    const keyLower = key.toLowerCase();
    if (
      seenLabels.has(labelLower) ||
      seenKeys.has(keyLower) ||
      opts.existingLabels.has(labelLower) ||
      opts.existingKeys.has(keyLower)
    ) {
      return;
    }
    seenLabels.add(labelLower);
    seenKeys.add(keyLower);
    out.push({ label, key });
  };

  for (const label of opts.pickedLabels) add(label);
  for (const name of opts.extraNames) add(name);

  return out;
}
