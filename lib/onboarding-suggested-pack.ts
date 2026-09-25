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
    return [...ready].sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null;
  }

  // Pharmacy (and future verticals): never fall back to mini-mart.
  return null;
}
