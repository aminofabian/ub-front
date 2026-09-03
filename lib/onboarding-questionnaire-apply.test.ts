import { describe, expect, it } from "bun:test";

import {
  formatApplyFailureMessage,
  type OnboardingApplyResult,
} from "@/lib/onboarding-questionnaire-apply";

function result(
  overrides: Partial<OnboardingApplyResult> = {},
): OnboardingApplyResult {
  return {
    firstBranchId: null,
    phases: [],
    failedPhase: null,
    error: null,
    completed: true,
    ...overrides,
  };
}

describe("formatApplyFailureMessage", () => {
  it("reports which phase failed and that earlier steps are kept", () => {
    const message = formatApplyFailureMessage(
      result({
        phases: [
          { phase: "branches", status: "done" },
          { phase: "storefront", status: "done" },
        ],
        failedPhase: "item-types",
        error: "Boom",
        completed: false,
      }),
    );
    expect(message).toContain("Your product sections");
    expect(message).toContain("We saved the first 2 steps");
    expect(message).toContain("Boom");
    expect(message).toContain("won't repeat");
  });

  it("suggests removing the logo when the logo phase fails", () => {
    const message = formatApplyFailureMessage(
      result({
        phases: [{ phase: "branding", status: "done" }],
        failedPhase: "logo",
        error: "413",
        completed: false,
      }),
    );
    expect(message).toContain("Your logo");
    expect(message).toContain("Remove the logo on the previous step");
  });

  it("explains when only the finalize patch failed", () => {
    const message = formatApplyFailureMessage(
      result({
        phases: [
          { phase: "branches", status: "done" },
          { phase: "storefront", status: "done" },
          { phase: "item-types", status: "done" },
          { phase: "branding", status: "done" },
          { phase: "logo", status: "skipped" },
          { phase: "phone", status: "done" },
        ],
        failedPhase: null,
        error: "patch failed",
        completed: false,
      }),
    );
    expect(message).toContain("couldn't mark setup as finished");
    expect(message).toContain("Tap That’s my number to retry");
  });
});
