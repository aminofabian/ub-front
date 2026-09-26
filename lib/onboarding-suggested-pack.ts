import { isCatalogEligibleStoreTypes } from "@/lib/business-store-type";
import type { GlobalProductPackRecord } from "@/lib/api";

export type OnboardingSuggestedPackPreview = {
  id: string;
  name: string;
  description?: string | null;
  productCount: number;
  currency: string;
  sampleNames: string[];
  samplePriceLabel: string | null;
};

/**
 * Picks the best starter pack for onboarding / stock-shelves.
 * Prefers a pack whose storeKitId matches the shop type; mini-mart / mixed-shop
 * may fall back to any tagged grocery pack.
 */
export function pickSuggestedOnboardingPack(
  packs: readonly GlobalProductPackRecord[],
  storeTypes: readonly string[],
): GlobalProductPackRecord | null {
  if (!isCatalogEligibleStoreTypes(storeTypes)) {
    return null;
  }

  const ready = packs.filter((pack) => pack.productCount > 0);
  if (ready.length === 0) {
    return null;
  }

  const preferred = new Set(storeTypes);
  const matched = ready
    .filter((pack) => pack.storeKitId != null && preferred.has(pack.storeKitId))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (matched[0]) {
    return matched[0];
  }

  // Grocery formats may fall back to mini-mart / mixed-shop packs.
  const groceryFallback = storeTypes.some(
    (type) => type === "mini-mart" || type === "mixed-shop",
  );
  if (groceryFallback) {
    const eligibleTagged = ready
      .filter(
        (pack) =>
          pack.storeKitId === "mini-mart" || pack.storeKitId === "mixed-shop",
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (eligibleTagged[0]) {
      return eligibleTagged[0];
    }
    // Do NOT fall back to an unrelated vertical's starter (that is how a mini-mart was offered
    // the Pharmacy pack). No compatible pack ready → no suggestion.
    return null;
  }

  // Pharmacy (and future verticals): never fall back to mini-mart.
  return null;
}

const GROCERY_FALLBACK_TYPES = new Set(["mini-mart", "mixed-shop"]);
const GROCERY_FALLBACK_KITS = new Set(["mini-mart", "mixed-shop"]);
/** Verticals whose content must never leak to other shop formats. */
const SPECIALIZED_STORE_KITS = new Set(["pharmacy", "cosmetics", "wines-spirits"]);

/** Whether a starter pack belongs to one of the shop's verticals. */
export function isPackRelevantToStoreTypes(
  pack: Pick<GlobalProductPackRecord, "storeKitId">,
  storeTypes: readonly string[],
): boolean {
  const kit = pack.storeKitId?.trim();
  if (!kit) {
    return false;
  }
  if (storeTypes.includes(kit)) {
    return true;
  }
  const groceryFallback = storeTypes.some((type) => GROCERY_FALLBACK_TYPES.has(type));
  return groceryFallback && GROCERY_FALLBACK_KITS.has(kit);
}

/**
 * Narrows a pack list to the shop's verticals so a pharmacy never sees the mini-mart starter (and
 * vice versa). Uses the same matching as {@link pickSuggestedOnboardingPack}.
 *
 * <p>Returns the list unchanged when the shop's formats are unknown (nothing to scope by), and the
 * matching subset otherwise — which may be empty for a format with no pack of its own (e.g.
 * butchery).
 */
export function scopePacksForStoreTypes<
  T extends Pick<GlobalProductPackRecord, "storeKitId">,
>(packs: readonly T[], storeTypes: readonly string[]): T[] {
  if (packs.length === 0) {
    return [...packs];
  }
  if (storeTypes.length === 0) {
    // Unknown formats: never surface another vertical's starter — hide the specialized verticals.
    return packs.filter(
      (pack) => !SPECIALIZED_STORE_KITS.has(pack.storeKitId?.trim() ?? ""),
    );
  }
  return packs.filter((pack) => isPackRelevantToStoreTypes(pack, storeTypes));
}
