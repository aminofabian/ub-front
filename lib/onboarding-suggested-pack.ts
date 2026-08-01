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
 * Catalogue packs only apply to mini mart and mixed shop.
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

  const preferred = new Set<string>(
    storeTypes.filter((value) => value === "mini-mart" || value === "mixed-shop"),
  );
  const matched = ready.find(
    (pack) => pack.storeKitId != null && preferred.has(pack.storeKitId),
  );
  if (matched) {
    return matched;
  }

  // Prefer packs tagged for mini-mart / mixed-shop over unrelated kits.
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
