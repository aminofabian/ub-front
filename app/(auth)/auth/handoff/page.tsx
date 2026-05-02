"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { decodeAuthHandoffPayload } from "@/lib/auth-handoff";
import { getSessionTokens, persistTenantHostFromSlug, setSessionTenantId, setSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";

const HANDOFF_BUFFER_KEY = "ub.authHandoffFragment";

function AuthHandoffInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const pathOnly = window.location.pathname;
    const qs = window.location.search;

    const fromHash = window.location.hash.replace(/^#/, "");
    if (fromHash) {
      sessionStorage.setItem(HANDOFF_BUFFER_KEY, fromHash);
      window.history.replaceState(null, "", pathOnly + qs);
    }

    const raw = fromHash || sessionStorage.getItem(HANDOFF_BUFFER_KEY) || "";

    if (!raw) {
      const existing = getSessionTokens();
      const nextFallback = searchParams.get("next");
      if (existing && nextFallback?.startsWith("/")) {
        const slug = searchParams.get("slug");
        persistTenantHostFromSlug(slug ?? undefined);
        router.replace(nextFallback);
        return;
      }
      setError("Missing session. Return to sign in and try again.");
      return;
    }

    const data = decodeAuthHandoffPayload(raw);
    if (!data) {
      sessionStorage.removeItem(HANDOFF_BUFFER_KEY);
      setError("Invalid or expired session transfer.");
      return;
    }

    sessionStorage.removeItem(HANDOFF_BUFFER_KEY);

    setSessionTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });

    if (data.tenantId?.trim()) {
      setSessionTenantId(data.tenantId.trim());
    }

    const slug = searchParams.get("slug");
    persistTenantHostFromSlug(slug ?? undefined);

    const nextRaw = searchParams.get("next") ?? data.nextPath ?? APP_ROUTES.business;
    const next = nextRaw.startsWith("/") ? nextRaw : APP_ROUTES.business;
    router.replace(next);
  }, [router, searchParams]);

  if (!error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
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
