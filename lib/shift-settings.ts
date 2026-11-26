/** Business feature flags for shift / cash-drawer behaviour. */
export const SHIFT_SETTINGS_FLAGS = {
  prefillOpeningFromLastClose: "shifts.prefill_opening_from_last_close",
  /** Business sells without opening shifts; the server keeps one hidden shift per till. */
  disabled: "shifts.disabled",
  /**
   * Email stock (buying, selling, on-hand) and today's sales when a shift closes.
   * Absent means on.
   */
  emailCloseReports: "shifts.email_close_reports",
} as const;

/** Trusted-till enforcement (opt-in; default off so signed-in cashiers can sell). */
export const TILL_REQUIRE_TRUSTED_FLAG = "till.require_trusted" as const;

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

/** True when only registered tills may sell / PIN-unlock (absent defaults to off). */
export function isTillRequireTrusted(
  featureFlags: Record<string, boolean> | null | undefined,
): boolean {
  return featureFlags?.[TILL_REQUIRE_TRUSTED_FLAG] === true;
}
