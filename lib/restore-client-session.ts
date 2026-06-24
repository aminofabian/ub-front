"use client";

import { setSessionTokens } from "@/lib/auth";
import { STORAGE_KEYS } from "@/lib/config";
import {
  writeSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
} from "@/lib/session-bootstrap";

type RestoreSessionResponse = {
  accessToken?: string;
  refreshToken?: string;
  tenantId?: string;
  tenantHost?: string | null;
  bootstrap?: {
    me?: unknown;
    business?: unknown;
    branches?: unknown;
  };
};

let restorePromise: Promise<boolean> | null = null;

/** Restore access token from httpOnly refresh cookie (iPad localStorage fallback). */
export function restoreClientSessionFromCookie(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (restorePromise) {
    return restorePromise;
  }

  restorePromise = (async () => {
    try {
      const response = await fetch("/api/auth/restore-session", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        return false;
      }
      const payload = (await response.json()) as RestoreSessionResponse;
      const accessToken = payload.accessToken?.trim();
      if (!accessToken) {
        return false;
      }

      setSessionTokens({
        accessToken,
        refreshToken: payload.refreshToken,
      });

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
    } catch {
      return false;
    } finally {
      restorePromise = null;
    }
  })();

  return restorePromise;
}
