/** Business feature flags for shift / cash-drawer behaviour. */
export const SHIFT_SETTINGS_FLAGS = {
  prefillOpeningFromLastClose: "shifts.prefill_opening_from_last_close",
} as const;

export function isPrefillOpeningFromLastCloseEnabled(
  featureFlags: Record<string, boolean> | null | undefined,
): boolean {
  return featureFlags?.[SHIFT_SETTINGS_FLAGS.prefillOpeningFromLastClose] === true;
}
