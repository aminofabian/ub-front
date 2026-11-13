/** Business feature flags for shift / cash-drawer behaviour. */
export const SHIFT_SETTINGS_FLAGS = {
  prefillOpeningFromLastClose: "shifts.prefill_opening_from_last_close",
  /** Business sells without opening shifts; the server keeps one hidden shift per till. */
  disabled: "shifts.disabled",
} as const;

export function isPrefillOpeningFromLastCloseEnabled(
  featureFlags: Record<string, boolean> | null | undefined,
): boolean {
  return featureFlags?.[SHIFT_SETTINGS_FLAGS.prefillOpeningFromLastClose] === true;
}

/** True when this business has turned shifts off, so tills sell without opening one. */
export function isShiftsDisabled(
  featureFlags: Record<string, boolean> | null | undefined,
): boolean {
  return featureFlags?.[SHIFT_SETTINGS_FLAGS.disabled] === true;
}
