import { describe, expect, it } from "bun:test";

import {
  formatPlanCount,
  isPlanDowngrade,
  planFitCta,
  planFitHeadline,
  planFitsUsage,
  planFitSevere,
  remainingShare,
  remainingUntil,
  planLockDeadline,
  isBillingAccessLocked,
} from "./subscription-plan-fit";

type Fit = Parameters<typeof planFitCta>[0];

function fit(partial: Partial<Fit>): Fit {
  return {
    productCount: 0,
    userCount: 0,
    productLimit: 1000,
    userLimit: 3,
    dailyRevenueKes: 0,
    dailyRevenueLimit: null,
    overProductLimit: false,
    overUserLimit: false,
    overDailyRevenueLimit: false,
    needsUpgrade: true,
    negotiable: false,
    talkToUs: false,
    recommendedTier: "growth",
    recommendedDisplayName: "Growth",
    recommendedPriceKes: 1500,
    reasons: [],
    ...partial,
  };
}

describe("subscription-plan-fit", () => {
  it("formats counts with thousands separators", () => {
    expect(formatPlanCount(3142)).toBe("3,142");
  });

  it("names the switch CTA after the recommended plan", () => {
    expect(planFitCta(fit({}))).toBe("Switch to Growth");
    expect(planFitCta(fit({ talkToUs: true }))).toBe("Talk to us");
  });

  it("treats double the catalog cap as severe", () => {
    expect(
      planFitSevere(
        fit({
          productCount: 3000,
          productLimit: 1000,
          overProductLimit: true,
        }),
      ),
    ).toBe(true);
    expect(
      planFitSevere(
        fit({
          productCount: 1100,
          productLimit: 1000,
          overProductLimit: true,
        }),
      ),
    ).toBe(false);
  });

  it("treats double the daily-sales cap as severe", () => {
    expect(
      planFitSevere(
        fit({
          dailyRevenueKes: 30_000,
          dailyRevenueLimit: 15_000,
          overDailyRevenueLimit: true,
        }),
      ),
    ).toBe(true);
    expect(
      planFitSevere(
        fit({
          dailyRevenueKes: 20_000,
          dailyRevenueLimit: 15_000,
          overDailyRevenueLimit: true,
        }),
      ),
    ).toBe(false);
  });

  it("says the current plan no longer fits", () => {
    expect(planFitHeadline("Starter", fit({}))).toBe(
      "Starter no longer fits this shop",
    );
  });

  it("rejects plans that cannot cover live usage", () => {
    expect(planFitsUsage(1000, 3, 3142, 2)).toBe(false);
    expect(planFitsUsage(5000, 10, 3142, 2)).toBe(true);
    expect(planFitsUsage(null, null, 80_000, 40)).toBe(true);
    expect(planFitsUsage(1000, 3, 500, 2, 15_000, 20_000)).toBe(false);
    expect(planFitsUsage(1000, 3, 500, 2, 30_000, 20_000)).toBe(true);
  });

  it("treats a lower-sorted package as a downgrade", () => {
    expect(isPlanDowngrade(1, 2)).toBe(true);
    expect(isPlanDowngrade(2, 2)).toBe(false);
    expect(isPlanDowngrade(3, 2)).toBe(false);
    expect(isPlanDowngrade(1, null)).toBe(false);
  });

  it("splits remaining time until lock", () => {
    const now = Date.parse("2026-08-30T07:00:00.000Z");
    expect(remainingUntil("2026-09-02T10:00:00.000Z", now)).toEqual({
      totalMs: 3 * 86400000 + 3 * 3600000,
      days: 3,
      hours: 3,
      minutes: 0,
      seconds: 0,
      locked: false,
    });
    expect(remainingUntil("2026-08-30T06:00:00.000Z", now).locked).toBe(true);
  });

  it("prefers grace end as the lock deadline", () => {
    const now = Date.parse("2026-08-30T07:00:00.000Z");
    expect(
      planLockDeadline(
        {
          status: "GRACE",
          graceEndsAt: "2026-09-14T06:00:00.000Z",
          currentPeriodEnd: "2026-08-30T00:00:00.000Z",
        },
        now,
      ),
    ).toEqual({
      at: "2026-09-14T06:00:00.000Z",
      kind: "lock",
    });
    expect(
      planLockDeadline(
        {
          status: "ACTIVE",
          graceEndsAt: null,
          currentPeriodEnd: "2026-09-01T00:00:00.000Z",
        },
        now,
      )?.kind,
    ).toBe("grace");
  });

  it("counts the 15-day grace window when the period has already ended", () => {
    const now = Date.parse("2026-08-30T07:00:00.000Z");
    expect(
      planLockDeadline(
        {
          status: "ACTIVE",
          graceEndsAt: null,
          currentPeriodEnd: "2026-08-30T00:00:00.000Z",
        },
        now,
      ),
    ).toEqual({
      at: "2026-09-14T00:00:00.000Z",
      kind: "lock",
    });
  });

  it("hides the clock when even grace has elapsed", () => {
    const now = Date.parse("2026-10-01T00:00:00.000Z");
    expect(
      planLockDeadline(
        {
          status: "ACTIVE",
          graceEndsAt: null,
          currentPeriodEnd: "2026-08-01T00:00:00.000Z",
        },
        now,
      ),
    ).toBeNull();
  });

  it("locks access once grace has elapsed", () => {
    const now = Date.parse("2026-08-30T07:00:00.000Z");
    expect(
      isBillingAccessLocked(
        {
          status: "ACTIVE",
          billingEnabled: true,
          graceEndsAt: null,
          currentPeriodEnd: "2026-08-30T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
    expect(
      isBillingAccessLocked(
        {
          status: "ACTIVE",
          billingEnabled: true,
          graceEndsAt: null,
          currentPeriodEnd: "2026-08-01T00:00:00.000Z",
        },
        Date.parse("2026-08-16T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isBillingAccessLocked(
        {
          status: "SUSPENDED",
          billingEnabled: true,
          graceEndsAt: "2026-09-14T00:00:00.000Z",
          currentPeriodEnd: "2026-08-30T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
    expect(
      isBillingAccessLocked(
        {
          status: "ACTIVE",
          billingEnabled: false,
          graceEndsAt: null,
          currentPeriodEnd: "2026-01-01T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("measures remaining share of the grace window", () => {
    const now = Date.parse("2026-09-07T00:00:00.000Z");
    expect(
      remainingShare(
        "2026-09-01T00:00:00.000Z",
        "2026-09-16T00:00:00.000Z",
        now,
      ),
    ).toBeCloseTo(9 / 15);
  });
});
