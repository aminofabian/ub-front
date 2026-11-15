"use client";

import { useEffect, useState } from "react";

import { fetchMe } from "@/lib/api";
import {
  getSessionTokens,
  hasAccessSession,
  hasSessionPresenceCookie,
} from "@/lib/auth";
import { isOwnerOrAdminRole } from "@/lib/post-auth-destination";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";

export type ComingSoonStaff = "unknown" | "guest" | "manager" | "other";

export function useComingSoonStaff(): ComingSoonStaff {
  const [staff, setStaff] = useState<ComingSoonStaff>("unknown");

  useEffect(() => {
    let cancelled = false;
    void resolveStaff().then((next) => {
      if (!cancelled) setStaff(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return staff;
}

async function resolveStaff(): Promise<ComingSoonStaff> {
  try {
    const signedIn = await ensureSession();
    if (!signedIn) return "guest";
    const me = await fetchMe({ toast: false });
    return isOwnerOrAdminRole(me) ? "manager" : "other";
  } catch {
    return "guest";
  }
}

async function ensureSession(): Promise<boolean> {
  if (hasAccessSession() || getSessionTokens()) return true;
  if (!hasSessionPresenceCookie()) return false;
  return restoreClientSessionFromCookie().catch(() => false);
}
