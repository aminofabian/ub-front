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
 * Picks the best starter pack for onboarding / stock-shelves:
 * prefer a ready pack matching store types, else first ready pack.
 */
export function pickSuggestedOnboardingPack(
  packs: readonly GlobalProductPackRecord[],
  storeTypes: readonly string[],
): GlobalProductPackRecord | null {
  const ready = packs.filter((pack) => pack.productCount > 0);
  if (ready.length === 0) {
    return null;
  }
  const preferred = new Set(storeTypes.filter(Boolean));
  if (preferred.size > 0) {
    const matched = ready.find(
      (pack) => pack.storeKitId && preferred.has(pack.storeKitId),
    );
    if (matched) {
      return matched;
    }
  }
  return [...ready].sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null;
}
