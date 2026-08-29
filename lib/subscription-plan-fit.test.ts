import { describe, expect, it } from "bun:test";

import {
  formatPlanCount,
  planFitCta,
  planFitHeadline,
  planFitsUsage,
  planFitSevere,
} from "./subscription-plan-fit";

type Fit = Parameters<typeof planFitCta>[0];

function fit(partial: Partial<Fit>): Fit {
  return {
    productCount: 0,
    userCount: 0,
    productLimit: 1000,
    userLimit: 3,
    overProductLimit: false,
    overUserLimit: false,
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

  it("says the current plan no longer fits", () => {
    expect(planFitHeadline("Starter", fit({}))).toBe(
      "Starter no longer fits this shop",
    );
  });

  it("rejects plans that cannot cover live usage", () => {
    expect(planFitsUsage(1000, 3, 3142, 2)).toBe(false);
    expect(planFitsUsage(5000, 10, 3142, 2)).toBe(true);
    expect(planFitsUsage(null, null, 80_000, 40)).toBe(true);
  });
});
