"use client";

import { getSessionTokens } from "@/lib/auth";
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
 * Waits briefly for a sibling tab to finish refreshing and write new tokens
 * into shared storage (BroadcastChannel / storage event).
 */
export async function waitForSiblingTokenUpdate(
  baselineAccessToken: string | undefined,
  timeoutMs = 800,
): Promise<boolean> {
  if (typeof window === "undefined" || !baselineAccessToken) {
    return false;
  }

  const already = getSessionTokens();
  if (already && already.accessToken !== baselineAccessToken) {
    return true;
  }

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      const current = getSessionTokens();
      if (current && current.accessToken !== baselineAccessToken) {
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
  if (await waitForSiblingTokenUpdate(baselineAccessToken)) {
    return Boolean(getSessionTokens()?.accessToken);
  }
  const restored = await restoreClientSessionFromCookie();
  return restored && Boolean(getSessionTokens()?.accessToken);
}
