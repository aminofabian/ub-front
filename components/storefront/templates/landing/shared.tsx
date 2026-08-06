"use client";

import Link from "next/link";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { StorefrontSetupModal } from "@/components/storefront/storefront-setup-modal";
import { APP_ROUTES } from "@/lib/config";
import type { LandingContent } from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getSessionTokens } from "@/lib/auth";
import { fetchMe } from "@/lib/api";

export function useOwnerSetupGate() {
  const [showSetup, setShowSetup] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tokens = getSessionTokens();
        if (!tokens?.accessToken) {
          if (!cancelled) setChecking(false);
          return;
        }
        const me = await fetchMe();
        if (!cancelled && me) {
          setShowSetup(true);
        }
      } catch {
        /* public visitor */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { showSetup, setShowSetup, checking };
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
  const { showSetup, setShowSetup } = useOwnerSetupGate();
  return (
    <div
      data-landing-template-id={templateId}
      className={cn("min-h-screen", className)}
      style={style}
    >
      {children}
      {showSetup ? (
        <StorefrontSetupModal open={showSetup} onOpenChange={setShowSetup} />
      ) : null}
    </div>
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
      <Link
        href={APP_ROUTES.login}
        className={cn(
          "shrink-0 text-sm font-medium underline-offset-4 hover:underline",
          light ? "text-white/80" : "text-stone-600",
        )}
        style={
          !light && primaryHex ? { color: primaryHex } : undefined
        }
      >
        Owner login
      </Link>
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
  const wa = whatsapp?.replace(/\D/g, "") || phone?.replace(/\D/g, "");
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
