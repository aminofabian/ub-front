"use client";

import { useEffect, useState } from "react";

import {
  APP_ROUTES,
  PLATFORM_DOMAIN,
  platformApexHostname,
} from "@/lib/config";
import { cn } from "@/lib/utils";

type GoogleAuthIntent = "sign_in" | "sign_up";

type GoogleAuthButtonProps = {
  intent: GoogleAuthIntent;
  next?: string;
  businessId?: string | null;
  /**
   * Tenant `authConfig.ssoProviders`. Empty / omitted inherits platform (show when
   * platform Google is ready). A non-empty list must include `"google"`.
   */
  ssoProviders?: string[] | null;
  /** When true, apply {@link ssoProviders} gate (tenant /login /signup). Apex skips. */
  requireTenantSso?: boolean;
  /**
   * Host to return to after Google (custom domain). Defaults to the current
   * hostname when not already on the platform apex.
   */
  returnHost?: string | null;
  className?: string;
  label?: string;
  /** Render the “or use email” divider under the button when shown. */
  withDivider?: boolean;
};

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const BARE_LOCAL = new Set(["localhost", "127.0.0.1", "::1"]);

/** Hosts where Google OAuth start may run same-origin (bind cookie + redirect_uri). */
function canStartGoogleOAuthHere(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (BARE_LOCAL.has(h)) {
    return true;
  }
  return h === platformApexHostname() || h === PLATFORM_DOMAIN;
}

function platformApexOrigin(): string {
  if (typeof window === "undefined") {
    return `https://${PLATFORM_DOMAIN}`;
  }
  const host = window.location.hostname.toLowerCase();
  if (BARE_LOCAL.has(host) || host.endsWith(".localhost")) {
    const port = window.location.port ? `:${window.location.port}` : "";
    return `${window.location.protocol}//localhost${port}`;
  }
  return `https://${PLATFORM_DOMAIN}`;
}

function googleOAuthRelayHref(params: {
  intent: GoogleAuthIntent;
  next: string;
  businessId?: string | null;
  returnHost?: string | null;
}): string {
  const q = new URLSearchParams();
  q.set("intent", params.intent);
  q.set("next", params.next);
  const bid = params.businessId?.trim();
  if (bid) {
    q.set("businessId", bid);
  }
  const host = params.returnHost?.trim();
  if (host) {
    q.set("returnHost", host);
  }
  return `${platformApexOrigin()}${APP_ROUTES.authGoogleOAuth}?${q.toString()}`;
}

function defaultReturnHost(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const host = window.location.hostname.toLowerCase();
  if (canStartGoogleOAuthHere(host)) {
    return null;
  }
  return host;
}

/** Empty list inherits platform; otherwise `"google"` must be present. */
export function tenantAllowsGoogleSso(
  ssoProviders: string[] | null | undefined,
): boolean {
  if (!ssoProviders || ssoProviders.length === 0) {
    return true;
  }
  return ssoProviders.some((p) => p.trim().toLowerCase() === "google");
}

/**
 * Platform Google ready flag for apex nav / non-button call sites.
 * Returns null while loading.
 */
export function usePlatformGoogleOAuthEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/public/auth/oauth/google", {
          credentials: "include",
        });
        const payload = (await res.json().catch(() => null)) as {
          enabled?: boolean;
        } | null;
        if (!cancelled) {
          setEnabled(Boolean(res.ok && payload?.enabled));
        }
      } catch {
        if (!cancelled) {
          setEnabled(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return enabled;
}

export function GoogleAuthButton({
  intent,
  next,
  businessId,
  ssoProviders,
  requireTenantSso = false,
  returnHost,
  className,
  label,
  withDivider = false,
}: GoogleAuthButtonProps) {
  const platformEnabled = usePlatformGoogleOAuthEnabled();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tenantOk =
    !requireTenantSso || tenantAllowsGoogleSso(ssoProviders);
  const show =
    platformEnabled === true && tenantOk;

  const onClick = async () => {
    setError("");
    setBusy(true);
    const nextPath =
      next ||
      (typeof window !== "undefined" ? window.location.pathname : "/") ||
      "/";
    const safeNext =
      nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
    const host =
      returnHost?.trim() || defaultReturnHost() || undefined;

    try {
      if (
        typeof window !== "undefined" &&
        !canStartGoogleOAuthHere(window.location.hostname)
      ) {
        window.location.assign(
          googleOAuthRelayHref({
            intent,
            next: safeNext,
            businessId,
            returnHost: host,
          }),
        );
        return;
      }

      const res = await fetch("/api/v1/auth/oauth/google/start", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(businessId ? { "X-Tenant-Id": businessId } : {}),
        },
        body: JSON.stringify({
          intent,
          next: safeNext,
          ...(businessId ? { businessId } : {}),
          ...(host ? { returnHost: host } : {}),
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { authorizeUrl?: string; detail?: string; title?: string }
        | null;
      if (!res.ok || !payload?.authorizeUrl) {
        throw new Error(
          payload?.detail ||
            payload?.title ||
            "Google Sign-In is not available right now.",
        );
      }
      window.location.assign(payload.authorizeUrl);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Could not open Google.");
    }
  };

  if (!show) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className={cn(
          "inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[rgba(20,20,18,0.14)] bg-white text-[15px] font-semibold text-[#141412] shadow-[0_1px_0_rgba(20,20,18,0.04)] transition hover:border-[rgba(20,20,18,0.28)] hover:bg-[#FAFAF8] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60",
          className,
        )}
      >
        <GoogleMark className="size-5 shrink-0" />
        {busy
          ? "Opening Google…"
          : label ??
            (intent === "sign_up" ? "Continue with Google" : "Sign in with Google")}
      </button>
      {error ? (
        <p className="text-center text-[13px] text-[#9a2e16]">{error}</p>
      ) : null}
      {withDivider ? <GoogleAuthDivider /> : null}
    </div>
  );
}

export function GoogleAuthDivider({ label = "or use email" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1" aria-hidden>
      <span className="h-px flex-1 bg-[rgba(20,20,18,0.12)]" />
      <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#8A8782]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[rgba(20,20,18,0.12)]" />
    </div>
  );
}
