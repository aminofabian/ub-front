/**
 * Till-opening shift gate: prompt to open when none is open, or to close a
 * shift that has been sitting for 24h — unless the cashier continues it.
 */

export const STALE_OPEN_SHIFT_MS = 24 * 60 * 60 * 1000;
export const STALE_SHIFT_CONTINUED_PREFIX = "palmart:staleShiftContinued:v1:";

export type TillOpeningPrompt = "open-shift" | "close-stale-shift" | null;

export type TillOpeningOpenShift = {
  id: string;
  openedAt: string;
};

export function shiftOpenAgeMs(
  openedAt: string | null | undefined,
  nowMs: number,
): number | null {
  if (!openedAt?.trim()) {
    return null;
  }
  const opened = Date.parse(openedAt);
  if (!Number.isFinite(opened)) {
    return null;
  }
  return Math.max(0, nowMs - opened);
}

export function isStaleOpenShift(
  openedAt: string | null | undefined,
  nowMs: number,
  thresholdMs: number = STALE_OPEN_SHIFT_MS,
): boolean {
  const age = shiftOpenAgeMs(openedAt, nowMs);
  return age != null && age >= thresholdMs;
}

export function formatShiftOpenDuration(
  openedAt: string,
  nowMs: number,
): string {
  const age = shiftOpenAgeMs(openedAt, nowMs);
  if (age == null) {
    return "more than 24 hours";
  }
  const hours = Math.floor(age / (60 * 60 * 1000));
  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(age / 60_000));
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  if (hours < 48) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}

export function resolveTillOpeningPrompt(input: {
  ready: boolean;
  canOpenShift: boolean;
  canCloseShift: boolean;
  openShift: TillOpeningOpenShift | null;
  continuedShiftIds: ReadonlySet<string>;
  nowMs: number;
}): TillOpeningPrompt {
  if (!input.ready) {
    return null;
  }
  if (!input.openShift) {
    return input.canOpenShift ? "open-shift" : null;
  }
  if (
    input.canCloseShift &&
    isStaleOpenShift(input.openShift.openedAt, input.nowMs) &&
    !input.continuedShiftIds.has(input.openShift.id)
  ) {
    return "close-stale-shift";
  }
  return null;
}

function continuedKey(
  businessId: string,
  userId: string,
  shiftId: string,
): string | null {
  const bid = businessId.trim();
  const uid = userId.trim();
  const sid = shiftId.trim();
  if (!bid || !uid || !sid) {
    return null;
  }
  return `${STALE_SHIFT_CONTINUED_PREFIX}${bid}:${uid}:${sid}`;
}

export function isStaleShiftContinued(
  businessId: string,
  userId: string,
  shiftId: string,
): boolean {
  const key = continuedKey(businessId, userId, shiftId);
  if (!key || typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markStaleShiftContinued(
  businessId: string,
  userId: string,
  shiftId: string,
): void {
  const key = continuedKey(businessId, userId, shiftId);
  if (!key || typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* quota / private mode */
  }
}

export function clearStaleShiftContinued(
  businessId: string,
  userId: string,
  shiftId: string,
): void {
  const key = continuedKey(businessId, userId, shiftId);
  if (!key || typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
