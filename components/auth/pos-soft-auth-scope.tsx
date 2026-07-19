"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { signOutClientAndRedirectToLogin } from "@/lib/auth";
import {
  enterPosSoftAuth,
  leavePosSoftAuth,
  POS_SESSION_EXPIRED_EVENT,
  type PosSessionExpiredDetail,
} from "@/lib/pos-soft-auth";

type PosSoftAuthScopeProps = {
  children: ReactNode;
};

/**
 * Enables POS soft-auth for the mounted tree: API / refresh / realtime session
 * failures stay on the till and surface {@link PosSessionExpiredModal}.
 */
export function PosSoftAuthScope({ children }: PosSoftAuthScopeProps) {
  useEffect(() => {
    enterPosSoftAuth();
    return () => leavePosSoftAuth();
  }, []);

  return (
    <>
      {children}
      <PosSessionExpiredModal />
    </>
  );
}

function PosSessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onExpired = (event: Event) => {
      const detail = (event as CustomEvent<PosSessionExpiredDetail>).detail;
      setMessage(
        detail?.message?.trim() ||
          "Your session expired. Sign in again to keep selling — your cart stays on this screen.",
      );
      setOpen(true);
    };
    window.addEventListener(POS_SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      window.removeEventListener(POS_SESSION_EXPIRED_EVENT, onExpired);
    };
  }, []);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40" aria-hidden />
      <div
        className="fixed inset-x-4 top-1/2 z-[90] mx-auto max-w-md -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-xl sm:inset-x-auto"
        role="dialog"
        aria-labelledby="pos-session-expired-title"
        aria-modal="true"
      >
        <h2
          id="pos-session-expired-title"
          className="text-lg font-semibold text-foreground"
        >
          Session expired
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
          >
            Stay on till
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              signOutClientAndRedirectToLogin("pos session expired modal");
            }}
          >
            Sign in again
          </Button>
        </div>
      </div>
    </>
  );
}
