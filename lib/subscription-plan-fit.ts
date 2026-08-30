import type { SubscriptionPlanFitRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

export function formatPlanCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function planFitHref(fit: SubscriptionPlanFitRecord): string {
  if (fit.talkToUs || fit.negotiable) {
    return APP_ROUTES.support;
  }
  const tier = fit.recommendedTier?.trim();
  const base = APP_ROUTES.billingRenew;
  return tier ? `${base}?tier=${encodeURIComponent(tier)}` : base;
}

export function planFitHeadline(
  currentName: string,
  fit: SubscriptionPlanFitRecord,
): string {
  if (fit.negotiable) {
    return "This shop is past every published plan";
  }
  const next = fit.recommendedDisplayName?.trim();
  if (next) {
    return `${currentName} no longer fits this shop`;
  }
  return "This shop has outgrown its plan";
}

export function planFitBody(
  currentName: string,
  fit: SubscriptionPlanFitRecord,
): string {
  if (fit.reasons.length > 0) {
    const first = fit.reasons[0];
    if (fit.recommendedDisplayName && !fit.negotiable) {
      return `${first}. ${fit.recommendedDisplayName} is the plan that fits.`;
    }
    return first;
  }
  if (fit.overProductLimit && fit.productLimit != null) {
    return `${formatPlanCount(fit.productCount)} products on a ${formatPlanCount(fit.productLimit)}-product ${currentName} shelf.`;
  }
  if (fit.overUserLimit && fit.userLimit != null) {
    return `${formatPlanCount(fit.userCount)} people on a ${formatPlanCount(fit.userLimit)}-person ${currentName} team.`;
  }
  return "Usage is above this plan. Upgrade to keep adding products and staff.";
}

export function planFitCta(fit: SubscriptionPlanFitRecord): string {
  if (fit.talkToUs || fit.negotiable) {
    return "Talk to us";
  }
  const next = fit.recommendedDisplayName?.trim();
  return next ? `Switch to ${next}` : "Review plans";
}

export function planFitSevere(fit: SubscriptionPlanFitRecord): boolean {
  if (fit.negotiable) return true;
  if (fit.productLimit != null && fit.productLimit > 0) {
    return fit.productCount >= fit.productLimit * 2;
  }
  if (fit.userLimit != null && fit.userLimit > 0) {
    return fit.userCount >= fit.userLimit * 2;
  }
  return fit.overProductLimit || fit.overUserLimit;
}

/** Scope default: 15 days of full access after the paid period ends. */
export const DEFAULT_GRACE_DAYS = 15;

export function parseInstant(value: unknown): number {
  if (value == null || value === "") return Number.NaN;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      return n < 1e12 ? n * 1000 : n;
    }
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return parsed;
    return Date.parse(trimmed.replace(" ", "T"));
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value as number[];
    return Date.UTC(year, month - 1, day, hour, minute, second);
  }
  return Number.NaN;
}

export function remainingUntil(
  iso: string,
  now = Date.now(),
): {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  locked: boolean;
} {
  const end = parseInstant(iso);
  const totalMs = Number.isFinite(end) ? Math.max(0, end - now) : 0;
  const totalSec = Math.floor(totalMs / 1000);
  return {
    totalMs,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    locked: totalMs <= 0,
  };
}

export function formatLockInstant(iso: string): string {
  const at = parseInstant(iso);
  if (!Number.isFinite(at)) return "";
  return new Date(at).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function planLockDeadline(
  status: {
    status: string;
    graceEndsAt: string | null;
    currentPeriodEnd: string | null;
    daysRemainingInGrace?: number;
  },
  now = Date.now(),
): { at: string; kind: "lock" | "grace" } | null {
  const graceEnd = parseInstant(status.graceEndsAt);
  if (Number.isFinite(graceEnd) && graceEnd > now) {
    return { at: new Date(graceEnd).toISOString(), kind: "lock" };
  }

  if (status.status === "GRACE" && (status.daysRemainingInGrace ?? 0) > 0) {
    const at = now + status.daysRemainingInGrace! * 86_400_000;
    return { at: new Date(at).toISOString(), kind: "lock" };
  }

  const periodEnd = parseInstant(status.currentPeriodEnd);
  if (Number.isFinite(periodEnd) && periodEnd > now) {
    return { at: new Date(periodEnd).toISOString(), kind: "grace" };
  }

  if (Number.isFinite(periodEnd)) {
    const lockAt = periodEnd + DEFAULT_GRACE_DAYS * 86_400_000;
    if (lockAt > now) {
      return { at: new Date(lockAt).toISOString(), kind: "lock" };
    }
  }

  return null;
}

export function billingLockInstant(status: {
  graceEndsAt: string | null;
  currentPeriodEnd: string | null;
}): number | null {
  const graceEnd = parseInstant(status.graceEndsAt);
  if (Number.isFinite(graceEnd)) return graceEnd;
  const periodEnd = parseInstant(status.currentPeriodEnd);
  if (Number.isFinite(periodEnd)) {
    return periodEnd + DEFAULT_GRACE_DAYS * 86_400_000;
  }
  return null;
}

export function isBillingAccessLocked(
  status: {
    status: string;
    billingEnabled?: boolean;
    graceEndsAt: string | null;
    currentPeriodEnd: string | null;
  },
  now = Date.now(),
): boolean {
  if (status.billingEnabled === false) return false;
  if (status.status === "SUSPENDED") return true;
  const at = billingLockInstant(status);
  return at != null && now >= at;
}

export function remainingShare(
  startedAt: string | null,
  endsAt: string,
  now = Date.now(),
): number {
  const end = parseInstant(endsAt);
  const start = startedAt ? parseInstant(startedAt) : Number.NaN;
  if (!Number.isFinite(end)) return 0;
  if (!Number.isFinite(start) || end <= start) {
    return remainingUntil(endsAt, now).locked ? 0 : 1;
  }
  return Math.min(1, Math.max(0, (end - now) / (end - start)));
}

export function planFitsUsage(
  productLimit: number | null,
  userLimit: number | null,
  productCount: number,
  userCount: number,
): boolean {
  if (productLimit != null && productCount > productLimit) return false;
  if (userLimit != null && userCount > userLimit) return false;
  return true;
}