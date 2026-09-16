import { describe, expect, it, beforeEach, afterEach } from "bun:test";

import {
  looksLikeOwnerPhone,
  normalizeOwnerPhone,
  needsOnboardingQuestionnaireResume,
  shouldStartOnboardingQuestionnaire,
  softSkipOnboardingQuestionnaire,
  resumeOnboardingQuestionnaire,
  markOnboardingQuestionnairePending,
  markOnboardingAwaitingStock,
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
    expect(shouldStartOnboardingQuestionnaire()).toBe(true);
  });

  it("needs resume for dismissed and completed not", () => {
    expect(needsOnboardingQuestionnaireResume("dismissed")).toBe(true);
    expect(needsOnboardingQuestionnaireResume("completed")).toBe(false);
    expect(needsOnboardingQuestionnaireResume("active")).toBe(true);
    expect(
      needsOnboardingQuestionnaireResume("completed", { catalogEmpty: true }),
    ).toBe(true);
  });

  it("markOnboardingAwaitingStock parks on stock step without completing", () => {
    markOnboardingQuestionnairePending();
    markOnboardingAwaitingStock({ displayName: "Demo" });
    const state = getOnboardingQuestionnaireState();
    expect(state.status).toBe("active");
    expect(state.step).toBe(8);
    expect(shouldStartOnboardingQuestionnaire()).toBe(true);
  });
});
