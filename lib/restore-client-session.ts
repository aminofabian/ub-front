"use client";

import { applyAuthSessionPayload, hasAccessSession } from "@/lib/auth";
import type { AuthSessionClaims } from "@/lib/auth-session-claims";
import { STORAGE_KEYS } from "@/lib/config";
import { withAuthRefreshLock } from "@/lib/cross-tab-lock";
import {
  writeSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
} from "@/lib/session-bootstrap";
import { setSessionRestoreStatus } from "@/lib/session-restore-status";

type RestoreSessionResponse = {
  accessToken?: string;
  refreshToken?: string;
  session?: AuthSessionClaims;
  tenantId?: string;
  tenantHost?: string | null;
  bootstrap?: {
    me?: unknown;
    business?: unknown;
    branches?: unknown;
  };
};

let restorePromise: Promise<boolean> | null = null;
let forceRestorePromise: Promise<boolean> | null = null;

export type RestoreClientSessionOptions = {
  /**
   * Always hit the network (skip claims short-circuit). Use during refresh
   * recovery so stale in-memory claims cannot mask a missing/rotated cookie.
   */
  force?: boolean;
};

/** Restore session from httpOnly cookies into JS claims (Gap G3: no JWT in JS). */
export function restoreClientSessionFromCookie(
  options: RestoreClientSessionOptions = {},
): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  const force = options.force === true;
  if (!force) {
    if (restorePromise) {
      return restorePromise;
    }
    if (hasAccessSession()) {
      // Claims already in memory — the presence hint is confirmed, not just
      // optimistic, so leave any earlier failure signal cleared (D8, §10).
      setSessionRestoreStatus("ok");
      return Promise.resolve(true);
    }
  } else if (forceRestorePromise) {
    return forceRestorePromise;
  }

  const run = (async () => {
    let restored = false;
    try {
      restored = await withAuthRefreshLock(async () => {
        if (!force && hasAccessSession()) {
          return true;
        }

        // Prefer /api/auth/restore-session (reads ub.access + ub.refresh on /api).
        // Fall back to the BFF refresh path if restore 401s.
        let response = await fetch("/api/auth/restore-session", {
          method: "POST",
          credentials: "include",
        });
        if (!response.ok) {
          response = await fetch("/api/v1/auth/refresh", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: "{}",
          });
        }
        if (!response.ok) {
          return false;
        }
        const payload = (await response.json()) as RestoreSessionResponse;
        if (!applyAuthSessionPayload(payload)) {
          return false;
        }

        if (payload.tenantId?.trim()) {
          try {
            window.localStorage.setItem(
              STORAGE_KEYS.tenantId,
              payload.tenantId.trim(),
            );
            window.sessionStorage.setItem(
              STORAGE_KEYS.tenantId,
              payload.tenantId.trim(),
            );
          } catch {
            /* ignore */
          }
        }
        if (payload.tenantHost?.trim()) {
          try {
            window.localStorage.setItem(
              STORAGE_KEYS.tenantHost,
              payload.tenantHost.trim(),
            );
            window.sessionStorage.setItem(
              STORAGE_KEYS.tenantHost,
              payload.tenantHost.trim(),
            );
          } catch {
            /* ignore */
          }
        }

        const bootstrap = payload.bootstrap;
        if (bootstrap?.me) {
          writeSessionBootstrap(SESSION_BOOTSTRAP_KEYS.me, bootstrap.me);
        }
        if (bootstrap?.business) {
          writeSessionBootstrap(SESSION_BOOTSTRAP_KEYS.business, bootstrap.business);
        }
        if (bootstrap?.branches) {
          writeSessionBootstrap(SESSION_BOOTSTRAP_KEYS.branches, bootstrap.branches);
        }

        return true;
      });
      return restored;
    } catch {
      return false;
    } finally {
      // Publish the outcome so presence-hint labels can downgrade to "Sign in"
      // when the hint is stale. "failed" is silent — a label, never an error.
      setSessionRestoreStatus(restored ? "ok" : "failed");
      if (force) {
        forceRestorePromise = null;
      } else {
        restorePromise = null;
      }
    }
  })();

  if (force) {
    forceRestorePromise = run;
  } else {
    restorePromise = run;
  }
  return run;
}
