/**
 * The servings forecast as words (ADR 0026): how many of a dish the branch's usable stock can still
 * make, if only that dish were made. Pure, so the wording is tested without a browser. The count
 * is advice — it never stops an order being rung.
 */

/** At or under this many, the count is called out. */
export const CAN_MAKE_LOW = 5;

type Forecast = { canMake?: number | null; limitingIngredient?: string | null; mustUseToday?: number | null };

export type CanMakeNote = {
  tone: "ok" | "low" | "out";
  /** The short line: "~18 to make", "Out". */
  label: string;
  /** What to do about it, when there is something: which ingredient, what must be used today. */
  detail: string | null;
};

/** The note under a dish on the menu page; null when the dish has no recipe of counted ingredients. */
export function canMakeNote(item: Forecast): CanMakeNote | null {
  if (item.canMake == null) return null;
  const ingredient = item.limitingIngredient?.trim() || null;
  if (item.canMake <= 0) {
    return { tone: "out", label: "Out", detail: ingredient ? `needs ${ingredient}` : null };
  }
  const useToday =
    item.mustUseToday != null && item.mustUseToday > 0 ? `${Math.min(item.mustUseToday, item.canMake)} only today` : null;
  if (item.canMake <= CAN_MAKE_LOW) {
    const first = ingredient ? `${ingredient} runs out first` : null;
    return { tone: "low", label: `~${item.canMake} to make`, detail: [first, useToday].filter(Boolean).join(" · ") || null };
  }
  return { tone: "ok", label: `~${item.canMake} to make`, detail: useToday };
}

/** The few words on an order tile, shown only when the count is low: "3 left". */
export function canMakeOnTile(item: Forecast): string | null {
  if (item.canMake == null || item.canMake > CAN_MAKE_LOW) return null;
  return item.canMake <= 0 ? "None left by the count" : `${item.canMake} left`;
}

/**
 * The menu without its stock counts, for keeping on the device: a count is true when it is read
 * and wrong hours later, so a menu restored offline says nothing about what is left.
 */
export function withoutCanMake<M extends { items: Forecast[] }>(menu: M): M {
  return {
    ...menu,
    items: menu.items.map((item) => ({ ...item, canMake: null, limitingIngredient: null, mustUseToday: null })),
  };
}
