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