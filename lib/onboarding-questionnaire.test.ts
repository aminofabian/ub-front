import { describe, expect, it, beforeEach, afterEach } from "bun:test";

import { FIRST_STEP_AFTER_SETUP_APPLIED } from "@/lib/onboarding-draft";
import {
  looksLikeOwnerPhone,
  normalizeOwnerPhone,
  needsOnboardingQuestionnaireResume,
  shouldStartOnboardingQuestionnaire,
  softSkipOnboardingQuestionnaire,
  resumeOnboardingQuestionnaire,
  activateOnboardingQuestionnaire,
  markOnboardingQuestionnairePending,
  markOnboardingAwaitingStock,
  markEmailJustVerified,
  shopAwaitsFirstWalkthrough,
  shopLooksAlreadyConfigured,
  QUESTIONNAIRE_RECEIVE_STEP,
  continueSignupAfterVerification,
  clearOnboardingQuestionnaireSessionSkip,
  getOnboardingQuestionnaireState,
  wasOnboardingQuestionnaireSkippedThisSession,
} from "@/lib/onboarding-questionnaire";

function installMemoryStorage() {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: memory,
      sessionStorage: memory,
    },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memory,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: memory,
  });
}

describe("shopLooksAlreadyConfigured", () => {
  const draftAnswers = { storeTypes: ["barbershop"], displayName: "Demo" };

  it("does not treat a half-answered questionnaire as a set-up shop", () => {
    expect(
      shopLooksAlreadyConfigured({
        onboardingStatus: "active",
        onboardingStep: 3,
        onboardingAnswers: draftAnswers,
      }),
    ).toBe(false);
    expect(
      shopLooksAlreadyConfigured({
        onboardingStatus: "active",
        onboardingStep: 7,
        onboardingAnswers: draftAnswers,
      }),
    ).toBe(false);
  });

  it("treats answers as proof once setup has been applied", () => {
    expect(
      shopLooksAlreadyConfigured({
        onboardingStatus: "active",
        onboardingStep: QUESTIONNAIRE_RECEIVE_STEP,
        onboardingAnswers: draftAnswers,
      }),
    ).toBe(true);
  });

  it("still heals a shop wrongly reset to pending that kept its answers", () => {
    expect(
      shopLooksAlreadyConfigured({
        onboardingStatus: "pending",
        onboardingStep: 1,
        onboardingAnswers: draftAnswers,
      }),
    ).toBe(true);
  });

  it("does not trust the profile shop type mid-questionnaire (the API copies it from the draft)", () => {
    expect(
      shopLooksAlreadyConfigured({
        onboardingStatus: "active",
        onboardingStep: 3,
        storeTypes: ["mini-mart"],
        onboardingAnswers: { storeTypes: ["mini-mart"] },
      }),
    ).toBe(false);
    expect(
      shopLooksAlreadyConfigured({
        onboardingStatus: "pending",
        onboardingStep: 1,
        storeTypes: ["mini-mart"],
      }),
    ).toBe(true);
  });

  it("trusts real stock and a finished status over the questionnaire step", () => {
    expect(
      shopLooksAlreadyConfigured({
        onboardingStatus: "active",
        onboardingStep: 3,
        catalogueCount: 4,
      }),
    ).toBe(true);
    expect(shopLooksAlreadyConfigured({ onboardingStatus: "completed" })).toBe(true);
  });

  it("pins the applied-setup step to the receive step", () => {
    expect(FIRST_STEP_AFTER_SETUP_APPLIED).toBe(QUESTIONNAIRE_RECEIVE_STEP);
  });
});

describe("looksLikeOwnerPhone", () => {
  it("accepts Kenyan 07 and 254 mobiles", () => {
    expect(looksLikeOwnerPhone("0714282874", "KE")).toBe(true);
    expect(looksLikeOwnerPhone("+254 714 282 874", "KE")).toBe(true);
  });

  it("rejects a short Kenyan stub", () => {
    expect(looksLikeOwnerPhone("0714", "KE")).toBe(false);
    expect(looksLikeOwnerPhone("", "KE")).toBe(false);
  });

  it("accepts a long international number outside Kenya", () => {
    expect(looksLikeOwnerPhone("+256 772 123456", "UG")).toBe(true);
  });
});

describe("normalizeOwnerPhone", () => {
  it("stores Kenyan numbers as 254 MSISDN", () => {
    expect(normalizeOwnerPhone("0714282874", "KE")).toBe("254714282874");
  });
});

describe("soft skip + resume", () => {
  beforeEach(() => {
    installMemoryStorage();
    clearOnboardingQuestionnaireSessionSkip();
  });

  afterEach(() => {
    clearOnboardingQuestionnaireSessionSkip();
  });

  it("soft skip keeps pending and blocks auto-start for the session", () => {
    markOnboardingQuestionnairePending();
    expect(shouldStartOnboardingQuestionnaire()).toBe(true);
    softSkipOnboardingQuestionnaire();
    expect(wasOnboardingQuestionnaireSkippedThisSession()).toBe(true);
    expect(shouldStartOnboardingQuestionnaire()).toBe(false);
    expect(getOnboardingQuestionnaireState().status).toBe("pending");
    expect(needsOnboardingQuestionnaireResume("pending")).toBe(true);
  });

  it("resume clears session skip and marks active", () => {
    markOnboardingQuestionnairePending();
    softSkipOnboardingQuestionnaire();
    resumeOnboardingQuestionnaire();
    expect(wasOnboardingQuestionnaireSkippedThisSession()).toBe(false);
    expect(getOnboardingQuestionnaireState().status).toBe("active");
    // Engaged (active) no longer auto-opens — the resume banner drives it.
    expect(shouldStartOnboardingQuestionnaire()).toBe(false);
  });

  it("auto-opens a brand-new shop but not once engaged", () => {
    markOnboardingQuestionnairePending();
    expect(shouldStartOnboardingQuestionnaire()).toBe(true);
    activateOnboardingQuestionnaire();
    expect(getOnboardingQuestionnaireState().status).toBe("active");
    expect(shouldStartOnboardingQuestionnaire()).toBe(false);
  });

  it("does not auto-open pending from a prior visit without a fresh signup", () => {
    markOnboardingQuestionnairePending();
    expect(shouldStartOnboardingQuestionnaire()).toBe(true);
    // Simulate a later login: clear the fresh-signup session flag only.
    window.sessionStorage.removeItem(
      "palmart.onboardingQuestionnaire.freshSignup.v1",
    );
    expect(getOnboardingQuestionnaireState().status).toBe("pending");
    expect(shouldStartOnboardingQuestionnaire()).toBe(false);
  });

  it("picks the signup back up after email verification on another host or tab", () => {
    markOnboardingQuestionnairePending();
    // The shop host / new tab never saw the signup tab's fresh-signup flag.
    window.sessionStorage.removeItem(
      "palmart.onboardingQuestionnaire.freshSignup.v1",
    );
    expect(shouldStartOnboardingQuestionnaire()).toBe(false);
    markEmailJustVerified();
    continueSignupAfterVerification(true);
    expect(shouldStartOnboardingQuestionnaire()).toBe(true);
  });

  it("never opens shop setup for staff or shoppers who verify an email", () => {
    markOnboardingQuestionnairePending();
    window.sessionStorage.removeItem(
      "palmart.onboardingQuestionnaire.freshSignup.v1",
    );
    markEmailJustVerified();
    continueSignupAfterVerification(false);
    expect(shouldStartOnboardingQuestionnaire()).toBe(false);
    // The marker is spent: a later owner check in the same tab does not reuse it.
    continueSignupAfterVerification(true);
    expect(shouldStartOnboardingQuestionnaire()).toBe(false);
  });

  it("does not open setup for an owner who did not just verify", () => {
    markOnboardingQuestionnairePending();
    window.sessionStorage.removeItem(
      "palmart.onboardingQuestionnaire.freshSignup.v1",
    );
    continueSignupAfterVerification(true);
    expect(shouldStartOnboardingQuestionnaire()).toBe(false);
  });

  it("opens the first walkthrough from the shop's own pending status", () => {
    // No signup or verification marker in this browser at all (another device).
    expect(shopAwaitsFirstWalkthrough("pending", true)).toBe(true);
    expect(shopAwaitsFirstWalkthrough(" Pending ", true)).toBe(true);
  });

  it("does not open the walkthrough once the shop has moved past pending", () => {
    expect(shopAwaitsFirstWalkthrough("active", true)).toBe(false);
    expect(shopAwaitsFirstWalkthrough("completed", true)).toBe(false);
    expect(shopAwaitsFirstWalkthrough("dismissed", true)).toBe(false);
    expect(shopAwaitsFirstWalkthrough("idle", true)).toBe(false);
    expect(shopAwaitsFirstWalkthrough(undefined, true)).toBe(false);
  });

  it("keeps staff out of a pending shop's walkthrough, and respects Skip", () => {
    expect(shopAwaitsFirstWalkthrough("pending", false)).toBe(false);
    softSkipOnboardingQuestionnaire();
    expect(shopAwaitsFirstWalkthrough("pending", true)).toBe(false);
  });

  it("needs resume for dismissed and completed not", () => {
    expect(needsOnboardingQuestionnaireResume("dismissed")).toBe(true);
    expect(needsOnboardingQuestionnaireResume("completed")).toBe(false);
    expect(needsOnboardingQuestionnaireResume("active")).toBe(true);
    expect(
      needsOnboardingQuestionnaireResume("completed", { catalogEmpty: true }),
    ).toBe(true);
  });

  it("markOnboardingAwaitingStock parks on receive step without completing", () => {
    markOnboardingQuestionnairePending();
    markOnboardingAwaitingStock({ displayName: "Demo" });
    const state = getOnboardingQuestionnaireState();
    expect(state.status).toBe("active");
    expect(state.step).toBe(8);
    // Parked on the stock step is `active` — banner, not auto-open.
    expect(shouldStartOnboardingQuestionnaire()).toBe(false);
  });
});
