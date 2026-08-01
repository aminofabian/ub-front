"use client";

import {
  getSessionClaims,
  getSessionTokens,
  hasAccessSession,
} from "@/lib/auth";
import { ERROR_CODES, PROBLEM_TITLES } from "@/lib/config";
import { parseProblem } from "@/lib/problem";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";

export function isRefreshAlreadyRotatedProblem(payload: unknown): boolean {
  const problem = parseProblem(payload);
  if (!problem) {
    return false;
  }
  return (
    problem.title === PROBLEM_TITLES.refreshAlreadyRotated ||
    problem.detail === PROBLEM_TITLES.refreshAlreadyRotated ||
    problem.code === ERROR_CODES.refreshAlreadyRotated
  );
}

export function isSessionIdleExpiredProblem(payload: unknown): boolean {
  const problem = parseProblem(payload);
  if (!problem) {
    return false;
  }
  return (
    problem.title === PROBLEM_TITLES.sessionIdleExpired ||
    problem.detail === PROBLEM_TITLES.sessionIdleExpired ||
    problem.code === ERROR_CODES.sessionIdleExpired
  );
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Compact fingerprint of whatever the tab currently holds for auth identity.
 * Gap G3 sessions often have claims only (no memory JWT).
 */
export function sessionAdvanceFingerprint(
  accessToken?: string | null,
  claimsExp?: number | null,
): string {
  const access = accessToken?.trim() || "";
  if (access) {
    return `t:${access}`;
  }
  if (typeof claimsExp === "number" && Number.isFinite(claimsExp)) {
    return `c:${claimsExp}`;
  }
  return "";
}

function currentSessionAdvanceFingerprint(): string {
  return sessionAdvanceFingerprint(
    getSessionTokens()?.accessToken,
    getSessionClaims()?.exp,
  );
}

/**
 * Waits briefly for a sibling tab (or in-tab broadcast) to finish refreshing
 * and advance the session (memory JWT or Gap G3 claims `exp`).
 */
export async function waitForSiblingTokenUpdate(
  baselineAccessToken: string | undefined,
  timeoutMs = 800,
  baselineClaimsExp?: number | null,
): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  const baseline = sessionAdvanceFingerprint(
    baselineAccessToken,
    baselineClaimsExp ?? getSessionClaims()?.exp,
  );

  const already = currentSessionAdvanceFingerprint();
  if (baseline && already && already !== baseline) {
    return true;
  }
  // Gap G3: no baseline JWT/claims yet, but a session appeared while we waited.
  if (!baseline && hasAccessSession()) {
    return true;
  }

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      const current = currentSessionAdvanceFingerprint();
      if (baseline && current && current !== baseline) {
        resolve(true);
        return;
      }
      if (!baseline && hasAccessSession()) {
        resolve(true);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }
      window.setTimeout(poll, 50);
    };
    poll();
  });
}

/** Last-resort recovery before clearing the session and redirecting to login. */
export async function tryRecoverSessionBeforeSignOut(
  baselineAccessToken?: string,
): Promise<boolean> {
  const baselineExp = getSessionClaims()?.exp;
  if (await waitForSiblingTokenUpdate(baselineAccessToken, 800, baselineExp)) {
    return hasAccessSession();
  }
  // Force a network restore — claims-only short-circuit would hide a missing
  // httpOnly cookie after refresh rotation races on the business hub.
  const restored = await restoreClientSessionFromCookie({ force: true });
  return restored && hasAccessSession();
}
