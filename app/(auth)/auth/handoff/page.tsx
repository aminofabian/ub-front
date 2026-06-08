"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import {
  bufferAuthHandoffFragment,
  clearAuthHandoffFragment,
  consumeAuthHandoffFragment,
  decodeAuthHandoffPayload,
} from "@/lib/auth-handoff";
import {
  getSessionTokens,
  ensureSessionPresenceCookie,
  persistTenantHostAfterAuth,
  setSessionTenantId,
  setSessionTokens,
} from "@/lib/auth";
import { refreshAccessToken } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

function AuthHandoffInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const pathOnly = window.location.pathname;
      const qs = window.location.search;

      const fromHash = window.location.hash.replace(/^#/, "").trim();
      if (fromHash) {
        bufferAuthHandoffFragment(fromHash);
        window.history.replaceState(null, "", pathOnly + qs);
      }

      if (!fromHash) {
        const existing = getSessionTokens();
        const nextFallback = searchParams.get("next");
        if (existing && nextFallback?.startsWith("/")) {
          clearAuthHandoffFragment();
          const slug = searchParams.get("slug");
          persistTenantHostAfterAuth(slug ?? undefined);
          router.replace(nextFallback);
          return;
        }
      }

      const raw = fromHash || consumeAuthHandoffFragment() || "";

      if (!raw) {
        clearAuthHandoffFragment();
        if (!cancelled) {
          setError("Missing session. Return to sign in and try again.");
        }
        return;
      }

      const data = decodeAuthHandoffPayload(raw);
      if (!data) {
        clearAuthHandoffFragment();
        if (!cancelled) {
          setError("Invalid or expired session transfer.");
        }
        return;
      }

      setSessionTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      if (data.tenantId?.trim()) {
        setSessionTenantId(data.tenantId.trim());
      }

      const slug = searchParams.get("slug");
      persistTenantHostAfterAuth(slug ?? undefined);
      clearAuthHandoffFragment();

      const outcome = await refreshAccessToken();
      if (cancelled) {
        return;
      }
      if (outcome.kind === "rejected" && !getSessionTokens()?.accessToken) {
        setError("Session transfer failed. Sign in again.");
        return;
      }
      const cookieOk = await ensureSessionPresenceCookie();
      if (!cookieOk) {
        setError(
          "Could not save your session (Safari may be blocking cookies). Return to sign in and allow cookies for this site.",
        );
        return;
      }

      const nextRaw = searchParams.get("next") ?? data.nextPath ?? APP_ROUTES.business;
      const next = nextRaw.startsWith("/") ? nextRaw : APP_ROUTES.business;
      window.location.assign(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (!error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--auth-accent,#28a745)]" aria-hidden />
        <p>Finishing sign-in…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center text-sm">
      <p className="text-destructive">{error}</p>
      <button
        type="button"
        className="text-primary underline underline-offset-2"
        onClick={() => router.replace(APP_ROUTES.login)}
      >
        Back to sign in
      </button>
    </div>
  );
}

export default function AuthHandoffPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <AuthHandoffInner />
    </Suspense>
  );
}
