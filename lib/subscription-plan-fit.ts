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
  const end = Date.parse(iso);
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
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  return new Date(at).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function planLockDeadline(status: {
  status: string;
  graceEndsAt: string | null;
  currentPeriodEnd: string | null;
}): { at: string; kind: "lock" | "grace" } | null {
  if (status.graceEndsAt) {
    return { at: status.graceEndsAt, kind: "lock" };
  }
  if (status.currentPeriodEnd) {
    return { at: status.currentPeriodEnd, kind: "grace" };
  }
  return null;
}

export function remainingShare(
  startedAt: string | null,
  endsAt: string,
  now = Date.now(),
): number {
  const end = Date.parse(endsAt);
  const start = startedAt ? Date.parse(startedAt) : Number.NaN;
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