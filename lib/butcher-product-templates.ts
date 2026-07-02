export type ButcherProductTemplate = {
  id: string;
  label: string;
  itemTypeKeyword: string;
  isWeighed: true;
  unitType: "kg";
};

/** Quick-start presets for butcher catalog create (department + sell-by-weight). */
export const BUTCHER_PRODUCT_TEMPLATES: ButcherProductTemplate[] = [
  { id: "beef", label: "Beef", itemTypeKeyword: "beef", isWeighed: true, unitType: "kg" },
  { id: "lamb", label: "Lamb", itemTypeKeyword: "lamb", isWeighed: true, unitType: "kg" },
  { id: "pork", label: "Pork", itemTypeKeyword: "pork", isWeighed: true, unitType: "kg" },
  { id: "chicken", label: "Chicken", itemTypeKeyword: "chicken", isWeighed: true, unitType: "kg" },
  { id: "goat", label: "Goat", itemTypeKeyword: "goat", isWeighed: true, unitType: "kg" },
];

export function matchItemTypeIdForTemplate(
  itemTypes: { id: string; label: string }[],
  keyword: string,
): string | null {
  const lower = keyword.trim().toLowerCase();
  if (!lower) return null;
  const exact = itemTypes.find((t) => t.label.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = itemTypes.find((t) =>
    t.label.trim().toLowerCase().includes(lower),
  );
  return partial?.id ?? null;
}
