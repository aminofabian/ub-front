"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import {
  bufferAuthHandoffFragment,
  clearAuthHandoffFragment,
  consumeAuthHandoffFragment,
  decodeAuthHandoffPayload,
} from "@/lib/auth-handoff";
import {
  applyAuthSessionPayload,
  ensureSessionPresenceCookie,
  hasAccessSession,
  persistTenantHostAfterAuth,
  setSessionTenantId,
} from "@/lib/auth";
import { refreshAccessToken } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { setImpersonationSession } from "@/lib/impersonation-session";
import { isOfficeConsolePath, loginHrefForDestination } from "@/lib/login-audience";
import { completeAuthAndNavigate } from "@/lib/post-auth-navigation";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";
import { submitStoreSessionNavigate } from "@/lib/submit-store-session";

function AuthHandoffInner() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const nextHint = searchParams.get("next")?.trim() ?? "";
  const fallbackLogin = loginHrefForDestination(nextHint);

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

      const nextFallback = searchParams.get("next");
      const slug = searchParams.get("slug");
      const returnHost = searchParams.get("returnHost");

      const finishToDestination = async (
        nextPath: string,
        opts?: { accessToken?: string; refreshToken?: string; tenantId?: string },
      ) => {
        const next = nextPath.startsWith("/") ? nextPath : APP_ROUTES.overview;
        // Same subdomain / custom-domain hop as password signup.
        if (slug?.trim() || returnHost?.trim()) {
          await completeAuthAndNavigate(next, slug, {
            office: isOfficeConsolePath(next),
            preferAssignedSubdomain: !returnHost?.trim(),
            returnHost,
          });
          return;
        }
        submitStoreSessionNavigate(next, {
          accessToken: opts?.accessToken,
          refreshToken: opts?.refreshToken,
          tenantId: opts?.tenantId,
          office: isOfficeConsolePath(next),
        });
      };

      if (!fromHash) {
        if (hasAccessSession() && nextFallback?.startsWith("/")) {
          clearAuthHandoffFragment();
          persistTenantHostAfterAuth(slug ?? undefined);
          if (cancelled) {
            return;
          }
          await finishToDestination(nextFallback);
          return;
        }
      }

      const raw = fromHash || consumeAuthHandoffFragment() || "";
      const data = raw ? decodeAuthHandoffPayload(raw) : null;

      // Preferred Gap G path: restore from shared refresh cookie (no access in URL).
      if (!data?.accessToken) {
        const restored = await restoreClientSessionFromCookie();
        if (cancelled) {
          return;
        }
        if (!restored && !hasAccessSession()) {
          clearAuthHandoffFragment();
          setError("Could not finish sign-in. Return to sign in and try again.");
          return;
        }
        if (data?.tenantId?.trim()) {
          setSessionTenantId(data.tenantId.trim());
        }
        persistTenantHostAfterAuth(slug ?? undefined);
        clearAuthHandoffFragment();

        const outcome = await refreshAccessToken();
        if (cancelled) {
          return;
        }
        if (outcome.kind === "rejected" && !hasAccessSession()) {
          setError("Could not finish sign-in. Return to sign in and try again.");
          return;
        }
        const cookieOk = await ensureSessionPresenceCookie();
        if (!cookieOk) {
          setError(
            "Could not save your session (Safari may be blocking cookies). Return to sign in and allow cookies for this site.",
          );
          return;
        }

        const nextRaw =
          searchParams.get("next") ?? data?.nextPath ?? APP_ROUTES.overview;
        await finishToDestination(nextRaw);
        return;
      }

      // Legacy / impersonation fragment with access JWT.
      // Do NOT call refresh first — ub.refresh is not on this host yet; refresh
      // would 401 and leave store-session without a cookie → no_session.
      applyAuthSessionPayload({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      if (data.tenantId?.trim()) {
        setSessionTenantId(data.tenantId.trim());
      }

      if (data.impersonating) {
        setImpersonationSession({
          userEmail: data.impersonationUserEmail?.trim() || "",
          userName: data.impersonationUserName?.trim() || "",
          businessId: data.tenantId?.trim() || "",
        });
      }

      persistTenantHostAfterAuth(slug ?? undefined);
      clearAuthHandoffFragment();

      const cookieOk = await ensureSessionPresenceCookie();
      if (!cookieOk) {
        setError(
          "Could not save your session (Safari may be blocking cookies). Return to sign in and allow cookies for this site.",
        );
        return;
      }

      const nextRaw = searchParams.get("next") ?? data.nextPath ?? APP_ROUTES.overview;
      if (cancelled) {
        return;
      }
      await finishToDestination(nextRaw, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tenantId: data.tenantId,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

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
      <a
        href={fallbackLogin}
        className="font-medium text-[var(--auth-accent,#28a745)] underline-offset-4 hover:underline"
      >
        Back to sign in
      </a>
    </div>
  );
}

export default function AuthHandoffPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--auth-accent,#28a745)]" aria-hidden />
          <p>Finishing sign-in…</p>
        </div>
      }
    >
      <AuthHandoffInner />
    </Suspense>
  );
}
