"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { clearAllSessionData } from "@/lib/auth";
import { APP_BASE_URL, APP_ROUTES } from "@/lib/config";
import {
  clearImpersonationSession,
  getImpersonationSession,
  type ImpersonationSessionHint,
} from "@/lib/impersonation-session";

function superAdminConsoleUrl(): string {
  try {
    const base = new URL(APP_BASE_URL);
    return `${base.origin}${APP_ROUTES.superAdminBusinesses}`;
  } catch {
    return APP_ROUTES.superAdminBusinesses;
  }
}

/**
 * Sticky strip shown when a platform operator opened this tenant via
 * super-admin impersonation. Cleared on logout / Exit.
 */
export function ImpersonationBanner() {
  const [hint, setHint] = useState<ImpersonationSessionHint | null>(null);

  useEffect(() => {
    setHint(getImpersonationSession());
  }, []);

  if (!hint) return null;

  const label =
    hint.userName.trim() || hint.userEmail.trim()
      ? `Viewing as ${hint.userName.trim() || hint.userEmail}${
          hint.userEmail && hint.userName ? ` (${hint.userEmail})` : ""
        }`
      : "Viewing as platform admin";

  const onExit = () => {
    clearImpersonationSession();
    clearAllSessionData();
    window.location.assign(superAdminConsoleUrl());
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-950 dark:text-amber-100 sm:px-6"
      role="status"
    >
      <div className="flex min-w-0 items-start gap-2">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="min-w-0 leading-snug">
          <span className="font-medium">Platform support session.</span> {label}.
          Actions are audit-logged.
        </p>
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={onExit}>
        Exit to super-admin
      </Button>
    </div>
  );
}
