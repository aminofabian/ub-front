import { describe, expect, it } from "bun:test";

import type {
  SubscriptionBillingStatusRecord,
  SubscriptionPlanFitRecord,
} from "./api";
import { resolveSubscriptionBanner } from "./subscription-banner";

const NOW = Date.parse("2026-10-20T12:00:00.000Z");

function planFit(
  partial: Partial<SubscriptionPlanFitRecord> = {},
): SubscriptionPlanFitRecord {
  return {
    productCount: 0,
    userCount: 1,
    productLimit: 300,
    userLimit: 1,
    dailyRevenueKes: 0,
    dailyRevenueLimit: 5000,
    overProductLimit: false,
    overUserLimit: false,
    overDailyRevenueLimit: false,
    needsUpgrade: false,
    negotiable: false,
    talkToUs: false,
    recommendedTier: null,
    recommendedDisplayName: null,
    recommendedPriceKes: null,
    reasons: [],
    ...partial,
  };
}

function status(
  partial: Partial<SubscriptionBillingStatusRecord> = {},
): SubscriptionBillingStatusRecord {
  return {
    status: "ACTIVE",
    tier: "starter",
    tierDisplayName: "Starter",
    amountDueKes: 300,
    currency: "KES",
    currentPeriodEnd: "2026-11-30T12:00:00.000Z",
    graceStartedAt: null,
    graceEndsAt: null,
    daysSinceExpiry: 0,
    daysRemainingInGrace: 0,
    renewalUrl: "/business/billing/renew",
    billingEnabled: true,
    autoBlockEnabled: true,
    accessBlocked: false,
    lastRenewalStatus: null,
    lastRenewalAt: null,
    planFit: null,
    ...partial,
  };
}

function freeGrace(
  productCount: number,
): SubscriptionBillingStatusRecord {
  return status({
    tier: "free",
    tierDisplayName: "Free",
    amountDueKes: 0,
    status: "GRACE",
    currentPeriodEnd: "2026-10-15T12:00:00.000Z",
    graceStartedAt: "2026-10-15T12:00:00.000Z",
    graceEndsAt: "2026-11-04T12:00:00.000Z",
    daysRemainingInGrace: 14,
    planFit: planFit({
      productCount,
      productLimit: 300,
      overProductLimit: productCount > 300,
      needsUpgrade: productCount > 300,
    }),
  });
}

describe("subscription banner state", () => {
  it("prioritises a blocked shop", () => {
    const banner = resolveSubscriptionBanner(
      status({ status: "SUSPENDED", accessBlocked: true }),
      NOW,
    );
    expect(banner?.tone).toBe("critical");
    expect(banner?.icon).toBe("lock");
    expect(banner?.dismissible).toBe(false);
  });

  it("warns but does not lock when auto-block is off", () => {
    const banner = resolveSubscriptionBanner(
      status({
        status: "SUSPENDED",
        accessBlocked: false,
        autoBlockEnabled: false,
      }),
      NOW,
    );
    expect(banner?.tone).toBe("warning");
    expect(banner?.title.toLowerCase()).toContain("access continues");
    expect(banner?.dismissible).toBe(false);
  });

  it("counts down the grace window", () => {
    const banner = resolveSubscriptionBanner(
      status({
        status: "GRACE",
        currentPeriodEnd: "2026-10-15T12:00:00.000Z",
        graceStartedAt: "2026-10-15T12:00:00.000Z",
        graceEndsAt: "2026-10-25T12:00:00.000Z",
        daysRemainingInGrace: 5,
      }),
      NOW,
    );
    expect(banner?.tone).toBe("warning");
    expect(banner?.title).toContain("5 days");
  });

  it("escalates grace to critical in the last three days", () => {
    const banner = resolveSubscriptionBanner(
      status({
        status: "GRACE",
        currentPeriodEnd: "2026-10-15T12:00:00.000Z",
        graceStartedAt: "2026-10-15T12:00:00.000Z",
        graceEndsAt: "2026-10-22T12:00:00.000Z",
        daysRemainingInGrace: 2,
      }),
      NOW,
    );
    expect(banner?.tone).toBe("critical");
  });

  it("keeps grace calm when auto-block is off", () => {
    const banner = resolveSubscriptionBanner(
      status({
        status: "GRACE",
        autoBlockEnabled: false,
        currentPeriodEnd: "2026-10-15T12:00:00.000Z",
        graceStartedAt: "2026-10-15T12:00:00.000Z",
        graceEndsAt: "2026-10-19T12:00:00.000Z",
        daysRemainingInGrace: 0,
      }),
      NOW,
    );
    expect(banner?.tone).toBe("warning");
    expect(banner?.title).toContain("access continues");
  });

  it("surfaces a recent failed payment while still active", () => {
    const banner = resolveSubscriptionBanner(
      status({
        lastRenewalStatus: "FAILED",
        lastRenewalAt: "2026-10-19T09:00:00.000Z",
      }),
      NOW,
    );
    expect(banner?.tone).toBe("payment");
    expect(banner?.cta).toContain("Try payment");
  });

  it("shows a dismissible notice inside the renewal window", () => {
    const banner = resolveSubscriptionBanner(
      status({ currentPeriodEnd: "2026-10-30T12:00:00.000Z" }),
      NOW,
    );
    expect(banner?.tone).toBe("notice");
    expect(banner?.dismissible).toBe(true);
  });

  it("stays quiet far from renewal", () => {
    expect(
      resolveSubscriptionBanner(
        status({ currentPeriodEnd: "2027-03-01T12:00:00.000Z" }),
        NOW,
      ),
    ).toBeNull();
  });

  it("hides when billing is disabled", () => {
    expect(
      resolveSubscriptionBanner(status({ billingEnabled: false }), NOW),
    ).toBeNull();
  });

  it("hides grace on free plans at or under 300 items", () => {
    expect(resolveSubscriptionBanner(freeGrace(0), NOW)).toBeNull();
    expect(resolveSubscriptionBanner(freeGrace(300), NOW)).toBeNull();
    expect(
      resolveSubscriptionBanner(
        status({
          tier: "free",
          tierDisplayName: "Free",
          status: "GRACE",
          graceEndsAt: "2026-11-04T12:00:00.000Z",
          planFit: null,
        }),
        NOW,
      ),
    ).toBeNull();
  });

  it("hides grace on paid tiers that still fit the free shelf", () => {
    expect(
      resolveSubscriptionBanner(
        status({
          tier: "starter",
          status: "GRACE",
          currentPeriodEnd: "2026-10-15T12:00:00.000Z",
          graceStartedAt: "2026-10-15T12:00:00.000Z",
          graceEndsAt: "2026-11-04T12:00:00.000Z",
          daysRemainingInGrace: 14,
          planFit: planFit({ productCount: 0, productLimit: 1000 }),
        }),
        NOW,
      ),
    ).toBeNull();
  });

  it("still shows grace on paid tiers when plan-fit is missing", () => {
    const banner = resolveSubscriptionBanner(
      status({
        tier: "starter",
        status: "GRACE",
        currentPeriodEnd: "2026-10-15T12:00:00.000Z",
        graceStartedAt: "2026-10-15T12:00:00.000Z",
        graceEndsAt: "2026-11-04T12:00:00.000Z",
        daysRemainingInGrace: 14,
        planFit: null,
      }),
      NOW,
    );
    expect(banner?.tone).toBe("warning");
    expect(banner?.title).toContain("days");
  });

  it("shows grace once items exceed 300", () => {
    const banner = resolveSubscriptionBanner(freeGrace(301), NOW);
    expect(banner?.tone).toBe("warning");
    expect(banner?.eyebrow.toLowerCase()).toContain("grace");
    expect(banner?.title).toContain("days");
  });
});
