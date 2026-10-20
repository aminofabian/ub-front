import { describe, expect, it } from "bun:test";

import type { SubscriptionBillingStatusRecord } from "./api";
import { resolveSubscriptionBanner } from "./subscription-banner";

const NOW = Date.parse("2026-10-20T12:00:00.000Z");

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
});
