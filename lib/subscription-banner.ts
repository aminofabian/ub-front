import type { SubscriptionBillingStatusRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { parseInstant } from "@/lib/subscription-plan-fit";

export const RENEWAL_NOTICE_DAYS = 14;
/** Free plan shelf size — renewal/grace banners stay hidden at or below this. */
export const FREE_PLAN_BANNER_ITEM_THRESHOLD = 300;
const DAY_MS = 86_400_000;
const RECENT_PAYMENT_FAILURE_MS = 7 * DAY_MS;

function isFreeTier(tier: string | null | undefined): boolean {
  return tier != null && tier.trim().toLowerCase() === "free";
}

/**
 * Don't nag shops that still fit on Free (≤300 catalog items) — including
 * starter/trial tenants that landed in grace with an empty or small shelf.
 * Free tier with an unknown count also stays quiet; other tiers need a known
 * count so a missing plan-fit payload cannot hide a real paid renewal.
 */
function shouldHideBannerUnderFreeShelf(
  status: SubscriptionBillingStatusRecord,
): boolean {
  const items = status.planFit?.productCount;
  if (items == null) {
    return isFreeTier(status.tier);
  }
  return items <= FREE_PLAN_BANNER_ITEM_THRESHOLD;
}

export type SubscriptionBannerTone =
  | "notice"
  | "warning"
  | "critical"
  | "payment";

export type SubscriptionBannerIcon =
  | "calendar"
  | "clock"
  | "lock"
  | "card"
  | "alert";

export type SubscriptionBannerState = {
  tone: SubscriptionBannerTone;
  /** Stable key for "Later" dismissal (only notices are dismissible). */
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: SubscriptionBannerIcon;
  meta: string[];
  dismissible: boolean;
};

function formatDay(iso: string): string {
  const at = parseInstant(iso);
  if (!Number.isFinite(at)) return "";
  return new Date(at).toLocaleDateString("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso: string, now: number): number | null {
  const at = parseInstant(iso);
  if (!Number.isFinite(at)) return null;
  return Math.ceil((at - now) / DAY_MS);
}

function dayLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/**
 * One state at a time, highest urgency first. Kept pure so the banner copy and
 * precedence are testable without mounting React.
 */
export function resolveSubscriptionBanner(
  status: SubscriptionBillingStatusRecord | null,
  now = Date.now(),
): SubscriptionBannerState | null {
  if (!status?.billingEnabled) return null;
  if (shouldHideBannerUnderFreeShelf(status)) return null;

  const billingHref = APP_ROUTES.billingRenew;

  if (status.accessBlocked) {
    return {
      tone: "critical",
      key: "blocked",
      eyebrow: "Subscription blocked",
      title: "Your shop is paused — renew to reopen it",
      description:
        "The grace period has ended. Your data is safe; access returns as soon as payment lands.",
      cta: "Renew subscription",
      href: billingHref,
      icon: "lock",
      meta: status.graceEndsAt ? [`Locked ${formatDay(status.graceEndsAt)}`] : [],
      dismissible: false,
    };
  }

  if (status.status === "SUSPENDED") {
    return {
      tone: "warning",
      key: "expired-no-block",
      eyebrow: "Subscription expired",
      title: "Access continues — renewal is still needed",
      description:
        "Automatic subscription blocking is off, so your shop keeps working. Renew to keep it that way and avoid a future interruption.",
      cta: "Renew subscription",
      href: billingHref,
      icon: "alert",
      meta: status.graceEndsAt ? [`Expired ${formatDay(status.graceEndsAt)}`] : [],
      dismissible: false,
    };
  }

  if (status.status === "GRACE") {
    const daysLeft = status.graceEndsAt
      ? daysUntil(status.graceEndsAt, now)
      : null;
    const graceEnded = daysLeft != null && daysLeft <= 0;
    const urgent = daysLeft != null && daysLeft <= 3;
    const risky = status.autoBlockEnabled;
    return {
      tone: risky && (urgent || graceEnded) ? "critical" : "warning",
      key: `grace:${status.graceEndsAt ?? ""}`,
      eyebrow: graceEnded ? "Grace ended" : "Grace period",
      title: graceEnded
        ? risky
          ? "Grace has ended — renew before the next check"
          : "Grace ended — access continues while you renew"
        : daysLeft != null
          ? risky
            ? `${dayLabel(daysLeft)} left before suspension`
            : `${dayLabel(daysLeft)} left in grace`
          : "Your subscription has expired",
      description: status.autoBlockEnabled
        ? "Renew now to keep the shop running. Automatic blocking is on, so access pauses when grace runs out."
        : "Automatic blocking is off, so the shop keeps working while you renew. Renew to avoid a future interruption.",
      cta: "Renew subscription",
      href: billingHref,
      icon: "clock",
      meta: status.graceEndsAt
        ? [graceEnded ? `Ended ${formatDay(status.graceEndsAt)}` : `Ends ${formatDay(status.graceEndsAt)}`]
        : [],
      dismissible: false,
    };
  }

  if (status.status !== "ACTIVE") return null;

  const paymentFailed =
    status.lastRenewalStatus === "FAILED" || status.lastRenewalStatus === "EXPIRED";
  const lastAttempt = parseInstant(status.lastRenewalAt ?? "");
  const recentlyFailed =
    paymentFailed &&
    Number.isFinite(lastAttempt) &&
    now - lastAttempt <= RECENT_PAYMENT_FAILURE_MS;

  if (recentlyFailed) {
    const end = status.currentPeriodEnd
      ? `Your current plan is still active through ${formatDay(status.currentPeriodEnd)}.`
      : "Your current plan is still active.";
    return {
      tone: "payment",
      key: `payment:${status.lastRenewalAt ?? ""}`,
      eyebrow: "Payment not completed",
      title: "The last M-Pesa attempt didn’t go through",
      description: `${end} Try again with another number, or start a fresh prompt.`,
      cta: "Try payment again",
      href: billingHref,
      icon: "card",
      meta: [],
      dismissible: false,
    };
  }

  const periodEnd = parseInstant(status.currentPeriodEnd ?? "");
  if (!Number.isFinite(periodEnd)) return null;

  if (periodEnd <= now) {
    return {
      tone: "warning",
      key: `due:${status.currentPeriodEnd ?? ""}`,
      eyebrow: "Renewal due",
      title: "Your paid period has ended",
      description: status.autoBlockEnabled
        ? "Renew now to avoid an interruption at the next subscription check."
        : "Automatic blocking is off, so access continues. Renew when you can.",
      cta: "Renew subscription",
      href: billingHref,
      icon: "clock",
      meta: [`Ended ${formatDay(status.currentPeriodEnd ?? "")}`],
      dismissible: false,
    };
  }

  const days = Math.ceil((periodEnd - now) / DAY_MS);
  if (days > RENEWAL_NOTICE_DAYS) return null;

  return {
    tone: "notice",
    key: `upcoming:${status.currentPeriodEnd ?? ""}`,
    eyebrow: "Renewal coming up",
    title:
      days <= 1
        ? "Your subscription renews tomorrow"
        : `Your subscription renews in ${dayLabel(days)}`,
    description: "Top up early and keep the shop running without a pause.",
    cta: "View plans",
    href: billingHref,
    icon: "calendar",
    meta: [`Renews ${formatDay(status.currentPeriodEnd ?? "")}`],
    dismissible: true,
  };
}
