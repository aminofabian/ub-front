/** Matches {@link FeatureFlagService#FLAG_BUTCHER_POS_ENABLED} on the backend. */
export const BUTCHER_POS_FEATURE_FLAG = "butcher_pos.enabled";

export function isButcherPosEnabled(
  featureFlags: Record<string, boolean> | undefined,
): boolean {
  return featureFlags?.[BUTCHER_POS_FEATURE_FLAG] === true;
}
