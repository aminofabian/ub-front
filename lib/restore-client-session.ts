"use client";

import { applyAuthSessionPayload, hasAccessSession } from "@/lib/auth";
import type { AuthSessionClaims } from "@/lib/auth-session-claims";
import { STORAGE_KEYS } from "@/lib/config";
import { withAuthRefreshLock } from "@/lib/cross-tab-lock";
import {
  writeSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
} from "@/lib/session-bootstrap";

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

/** Restore session from httpOnly cookies into JS claims (Gap G3: no JWT in JS). */
export function restoreClientSessionFromCookie(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (restorePromise) {
    return restorePromise;
  }
  if (hasAccessSession()) {
    return Promise.resolve(true);
  }

  restorePromise = (async () => {
    try {
      return await withAuthRefreshLock(async () => {
        if (hasAccessSession()) {
          return true;
        }

        // Prefer /api/auth/restore-session (reads ub.access). If that 401s —
        // often because Spring's ub.refresh is path-scoped to /api/v1/auth and
        // was not sent to /api/auth/* — fall back to the BFF refresh path.
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
    } catch {
      return false;
    } finally {
      restorePromise = null;
    }
  })();

  return restorePromise;
}
