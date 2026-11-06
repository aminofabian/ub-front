/** Tenant feature flag for the Kiosk "Opening the shop" screen. */
export const OPENING_LOADER_FLAG = "ui.opening_loader";

/** On unless the tenant turned it off — an absent flag keeps the screen. */
export function isOpeningLoaderEnabled(
  featureFlags: Record<string, boolean> | null | undefined,
): boolean {
  return featureFlags?.[OPENING_LOADER_FLAG] !== false;
}
