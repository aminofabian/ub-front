/**
 * Words and sums for the pantry page (ADR 0026), kept pure so they are tested without a browser.
 */
import type { PantryDishRecord, PantryIngredientRecord, PantryLossReason } from "./restaurant-api";

export const LOSS_REASONS: { value: PantryLossReason; label: string }[] = [
  { value: "SPOILAGE", label: "Spoiled" },
  { value: "BREAKAGE", label: "Broken or damaged" },
  { value: "EXPIRED", label: "Expired" },
  { value: "OTHER", label: "Something else" },
];

export function lossReasonLabel(reason: string): string {
  return LOSS_REASONS.find((r) => r.value === reason)?.label ?? "Something else";
}

/** A quantity without trailing zeros: 3, 2.5, 0.125. */
export function quantityText(value: number, unit?: string | null): string {
  const text = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
  return unit && unit !== "each" ? `${text} ${unit}` : text;
}

/** "about 3 days", "under a day", or null when the dish has not sold. */
export function coverText(dish: Pick<PantryDishRecord, "daysOfCover" | "canMake">): string | null {
  if (dish.daysOfCover == null) return null;
  if (dish.canMake <= 0) return null;
  if (dish.daysOfCover < 1) return "under a day at the usual rate";
  const days = Math.floor(dish.daysOfCover);
  return `about ${days} ${days === 1 ? "day" : "days"} at the usual rate`;
}

/** A loss in the kitchen's terms: "3 kg of Tomatoes — about 20 Salads". */
export function lossSentence(loss: {
  name: string;
  quantity: number;
  unit?: string | null;
  servingsDish: string | null;
  servingsLost: number;
}): string {
  const what = `${quantityText(loss.quantity, loss.unit)} of ${loss.name}`;
  if (!loss.servingsDish || loss.servingsLost <= 0) return what;
  return `${what} — about ${loss.servingsLost} × ${loss.servingsDish}`;
}

/** Portions to plan for a number of days at the usual rate, rounded up; dishes that have not sold get none. */
export function portionsForDays(dishes: readonly PantryDishRecord[], days: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const dish of dishes) {
    const portions = Math.ceil(dish.soldPerDay * days);
    if (portions > 0) out[dish.menuItemId] = String(portions);
  }
  return out;
}

/** Ingredients with stock past its date or expiring within three days: expired first, then soonest. */
export function expiringFirst(ingredients: readonly PantryIngredientRecord[]): PantryIngredientRecord[] {
  return ingredients
    .filter((i) => i.expired > 0 || (i.expiringSoon > 0 && i.firstExpiry))
    .sort(
      (a, b) =>
        Number(b.expired > 0) - Number(a.expired > 0) || (a.firstExpiry ?? "").localeCompare(b.firstExpiry ?? ""),
    );
}

/** Portions of the stated dish a quantity makes. */
export function servingsOf(ingredient: Pick<PantryIngredientRecord, "perServing">, quantity: number): number {
  if (!ingredient.perServing || ingredient.perServing <= 0 || quantity <= 0) return 0;
  return Math.floor(quantity / ingredient.perServing + 1e-9);
}
