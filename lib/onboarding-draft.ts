/**
 * Pure helper (no "use client"): shared by the dashboard and the server-side
 * post-login routing.
 *
 * The questionnaire saves every answer as the owner goes, but nothing is
 * created in the shop (branches, shop line, branding) until the phone step is
 * submitted. From then on the saved step is the optional receive-M-Pesa step
 * or later. So while the flow is `active` and the saved step is earlier than
 * that, the saved answers are a draft — they do not prove the shop is set up.
 *
 * Must equal QUESTIONNAIRE_RECEIVE_STEP in lib/onboarding-questionnaire.ts
 * (a test pins the two together).
 */
export const FIRST_STEP_AFTER_SETUP_APPLIED = 8;

export function onboardingAnswersAreDraft(
  status: string | null | undefined,
  step: number | null | undefined,
): boolean {
  if ((status?.trim().toLowerCase() ?? "") !== "active") {
    return false;
  }
  return typeof step === "number" && step < FIRST_STEP_AFTER_SETUP_APPLIED;
}
