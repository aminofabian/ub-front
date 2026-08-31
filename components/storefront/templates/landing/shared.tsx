"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { useClientHasSession, useClientSessionReady } from "@/hooks/use-client-session";
import {
  buildStorefrontSignInHref,
  useStorefrontSignIn,
} from "@/components/storefront/storefront-sign-in-sheet";
import { APP_ROUTES } from "@/lib/config";
import type { LandingContent } from "@/lib/storefront-templates";
import { normalizeWhatsApp } from "@/lib/whatsapp-order";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { getSessionTokens } from "@/lib/auth";
import { fetchMe } from "@/lib/api";
import { useSessionRestoreFailed } from "@/lib/session-restore-status";

const STOREFRONT_PREVIEW_LANDING_PARAM = "previewLanding";

/**
 * A merchant landing template only renders while the storefront is not live
 * (or during a merchant “Open live” preview). Send the shop owner/admin to the
 * business hub to finish setup instead of showing them the setup modal here;
 * staff and shoppers must never see the setup modal. Previews are exempt so
 * the merchant can still inspect a landing theme.
 */
export function useLandingOwnerRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const tokens = getSessionTokens();
        if (!tokens?.accessToken) {
          return;
        }
        const me = await fetchMe();
        if (cancelled || !me) {
          return;
        }
        const roleKey = (me.role?.key ?? "").trim().toLowerCase();
        if (roleKey !== "owner" && roleKey !== "admin") {
          return;
        }
        if (
          new URLSearchParams(window.location.search).has(
            STOREFRONT_PREVIEW_LANDING_PARAM,
          )
        ) {
          return;
        }
        if (!cancelled) {
          router.replace(APP_ROUTES.business);
        }
      } catch {
        /* public visitor */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
}

export function LandingShell({
  templateId,
  className,
  style,
  children,
}: {
  templateId: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  /** Kept for call-site consistency with branded landings. */
  storeName?: string;
}) {
  useLandingOwnerRedirect();
  return (
    <div
      data-landing-template-id={templateId}
      className={cn("min-h-screen", className)}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Where a signed-out shopper lands after signing in from a landing template:
 * the account page — a coming-soon shop has no catalog page to return to (§7).
 * Opens the in-page sheet via `?signin=1` (no `/login` page).
 */
const LANDING_ACCOUNT_LOGIN_HREF = buildStorefrontSignInHref({
  next: APP_ROUTES.shopAccount,
});

/** Demoted owner/staff door — opens the sign-in sheet on the shop host. */
export const LANDING_STAFF_LOGIN_HREF = buildStorefrontSignInHref({
  door: "staff",
  next: APP_ROUTES.business,
});

/**
 * Shopper door for landing templates (D4). Falls back to `?signin=1` when
 * the sheet is unavailable; the Phase 2 sheet intercepts the click when ready.
 */
export function LandingAccountAction({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  /** Theme glyph rendered instead of the text label. */
  children?: ReactNode;
}) {
  const ready = useClientSessionReady();
  const hasSession = useClientHasSession();
  const restoreFailed = useSessionRestoreFailed();
  const { available, open, hasPresence } = useStorefrontSignIn();

  // D8 (§10): the server-rendered presence hint shows "My orders" before
  // hydration; a failed cookie-only restore downgrades back to "Sign in".
  const clientSignedIn = ready && hasSession;
  const isSignedIn = clientSignedIn || (hasPresence && !restoreFailed);
  const label = isSignedIn ? "My orders" : "Sign in";

  const onActivate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (clientSignedIn || !available) {
      return;
    }
    event.preventDefault();
    // Landing surfaces have no catalog to return to — the sheet resolves to
    // the account page after sign-in (see §7).
    open({ reason: "landing", next: APP_ROUTES.shopAccount });
  };

  return (
    <Link
      href={isSignedIn ? APP_ROUTES.shopAccount : LANDING_ACCOUNT_LOGIN_HREF}
      className={className}
      style={style}
      aria-label={label}
      onClick={onActivate}
    >
      {children ?? label}
    </Link>
  );
}

export function LandingBrandHeader({
  storeName,
  logoUrl,
  primaryHex,
  light,
}: {
  storeName: string;
  logoUrl?: string | null;
  primaryHex?: string | null;
  light?: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <TenantLogo
          brand={storeName}
          logoUrl={logoUrl}
          primaryColor={primaryHex}
          size="md"
          className="shrink-0"
        />
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-lg font-semibold tracking-tight",
              light ? "text-white" : "text-stone-900",
            )}
          >
            {storeName}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <LandingAccountAction
          className={cn(
            "text-sm font-medium underline-offset-4 hover:underline",
            light ? "text-white/80" : "text-stone-600",
          )}
          style={
            !light && primaryHex ? { color: primaryHex } : undefined
          }
        />
        <Link
          href={LANDING_STAFF_LOGIN_HREF}
          className={cn(
            "text-xs font-medium underline-offset-4 hover:underline",
            light ? "text-white/55" : "text-stone-400",
          )}
        >
          Staff
        </Link>
      </div>
    </header>
  );
}

export function resolveLandingCopy(
  storeName: string,
  content: LandingContent | null | undefined,
  defaults: {
    headline: string;
    subheadline: string;
    ctaLabel: string;
    hours: string;
    address: string;
  },
) {
  return {
    headline: content?.headline?.trim() || defaults.headline,
    subheadline: content?.subheadline?.trim() || defaults.subheadline,
    ctaLabel: content?.ctaLabel?.trim() || defaults.ctaLabel,
    hours: content?.hours?.trim() || defaults.hours,
    address: content?.address?.trim() || defaults.address,
    phone: content?.phone?.trim() || null,
    whatsapp: content?.whatsapp?.trim() || null,
    storeName,
  };
}

export function ContactActions({
  phone,
  whatsapp,
  ctaLabel,
  brand,
}: {
  phone: string | null;
  whatsapp: string | null;
  ctaLabel: string;
  brand: string;
}) {
  // wa.me needs international digits (0… → 254…); phone is only a fallback.
  const wa = normalizeWhatsApp(whatsapp) ?? normalizeWhatsApp(phone);
  return (
    <div className="flex flex-wrap gap-3">
      {wa ? (
        <a
          href={`https://wa.me/${wa}`}
          className="inline-flex h-11 items-center justify-center px-5 text-sm font-semibold text-white"
          style={{ backgroundColor: brand }}
        >
          {ctaLabel}
        </a>
      ) : null}
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="inline-flex h-11 items-center justify-center border border-current/20 bg-white/10 px-5 text-sm font-semibold"
        >
          Call {phone}
        </a>
      ) : null}
    </div>
  );
}
