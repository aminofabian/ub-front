"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { useMemo, type CSSProperties, type ReactNode } from "react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { KioskLogoMark } from "@/components/brand/kiosk-logo-mark";
import { TenantMonogramMark } from "@/components/brand/tenant-monogram";

import {
  BRAND_ACCENT,
  BRAND_PRIMARY,
} from "@/lib/brand-colors";
import type { TenantContext } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

/** Shared input chrome for auth split + simple auth pages. Sharp edges — CTAs alone keep radius. */
export const authInputClassName = cn(
  "w-full rounded-none border px-4 py-3 text-base outline-none transition",
  "border-black/[0.12] bg-white text-foreground placeholder:text-muted-foreground/70",
  "focus-visible:border-[var(--auth-primary)] focus-visible:ring-1 focus-visible:ring-[var(--auth-primary)]",
  "dark:border-white/15 dark:bg-white/[0.06]",
);

function normalizeHex(color: string | null | undefined): string | null {
  if (!color) {
    return null;
  }
  const s = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) {
    return s.toLowerCase();
  }
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    const body = s.slice(1);
    return (
      "#" +
      body
        .split("")
        .map((c) => c + c)
        .join("")
    ).toLowerCase();
  }
  return null;
}

function blendWithHex(base: string, tint: string, tintWeight: number): string {
  const h1 = base.replace("#", "");
  const h2 = tint.replace("#", "");
  const w = Math.min(1, Math.max(0, tintWeight));
  const mix = (i: number) =>
    Math.round(
      parseInt(h1.slice(i, i + 2), 16) * (1 - w) +
        parseInt(h2.slice(i, i + 2), 16) * w,
    );
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(mix(0))}${to2(mix(2))}${to2(mix(4))}`;
}

function mixTowardWhite(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(mix(r))}${to2(mix(g))}${to2(mix(b))}`;
}

function luminanceFromHex(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function inkForAccent(hex: string): string {
  return luminanceFromHex(hex) > 0.62 ? "#141414" : "#fafafa";
}

/**
 * CSS variables for auth chrome. Uses tenant {@link TenantBranding#primaryColor} and
 * {@link TenantBranding#accentColor} when valid hex; derives a softer companion when accent is absent.
 */
export function authThemeStyle(tenant: TenantContext | null): CSSProperties {
  const hasTenantBrand =
    normalizeHex(tenant?.branding?.primaryColor) ??
    normalizeHex(tenant?.branding?.accentColor);

  const primary =
    normalizeHex(tenant?.branding?.primaryColor) ??
    normalizeHex(tenant?.branding?.accentColor) ??
    BRAND_PRIMARY;

  const accentHex = normalizeHex(tenant?.branding?.accentColor);
  const secondary = accentHex && accentHex !== primary
    ? accentHex
    : hasTenantBrand
      ? mixTowardWhite(primary, 0.34)
      : BRAND_ACCENT;

  const primaryHover =
    accentHex && accentHex !== primary
      ? accentHex
      : hasTenantBrand
        ? mixTowardWhite(primary, 0.12)
        : BRAND_ACCENT;

  const glow = mixTowardWhite(primary, 0.55);

  return {
    "--auth-primary": primary,
    "--auth-primary-hover": primaryHover,
    "--auth-secondary": secondary,
    "--auth-accent": primary,
    "--auth-accent-ink": inkForAccent(primary),
    "--auth-secondary-ink": inkForAccent(secondary),
    "--auth-glow": glow,
    backgroundColor: blendWithHex("#e4e6ec", glow, 0.18),
  } as CSSProperties;
}

const HERO_SRC =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80";

type AuthSplitShellProps = {
  tenant: TenantContext | null;
  children: ReactNode;
};

/** Crop-mark frame around the brand mark — one identity, not two logos. */
function AuthMarkFrame({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex size-12 shrink-0 items-center justify-center bg-white dark:bg-zinc-900">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 border border-black/15 dark:border-white/20"
      />
      {/* Registration corners */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-px -top-px h-2.5 w-2.5 border-l-2 border-t-2"
        style={{ borderColor: "var(--auth-primary)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-px -top-px h-2.5 w-2.5 border-r-2 border-t-2"
        style={{ borderColor: "var(--auth-primary)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-px -left-px h-2.5 w-2.5 border-b-2 border-l-2"
        style={{ borderColor: "var(--auth-primary)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-px -right-px h-2.5 w-2.5 border-b-2 border-r-2"
        style={{ borderColor: "var(--auth-primary)" }}
      />
      <span className="relative z-[1] flex size-9 items-center justify-center overflow-hidden">
        {children}
      </span>
    </span>
  );
}

function AuthMasthead({
  brand,
  logoUrl,
  faviconUrl,
  primaryColor,
  tagline,
  kioskFallback,
}: {
  brand: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  tagline: string;
  kioskFallback?: {
    wordmark: string;
    tagline: string;
  };
}) {
  /**
   * One identity. Prefer a framed seal (favicon) + shop name; fall back to the
   * uploaded wordmark alone. Never favicon beside the full logo — that reads
   * as two logos. The wordmark still appears as the page watermark.
   */
  const sealSrc = faviconUrl;
  const showWordmarkAlone = !sealSrc && Boolean(logoUrl);

  return (
    <header className="relative z-[1] mb-9 flex items-start gap-4 border-b border-black/[0.08] pb-6 dark:border-white/10">
      {showWordmarkAlone ? (
        <div className="min-w-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- tenant CDN */}
          <img
            src={logoUrl!}
            alt={brand}
            className="max-h-11 w-auto max-w-[min(260px,68vw)] object-contain object-left"
          />
          <p className="mt-2 truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {tagline}
          </p>
        </div>
      ) : (
        <>
          <AuthMarkFrame>
            {sealSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- tenant CDN
              <img
                src={sealSrc}
                alt=""
                className="size-full object-contain"
              />
            ) : kioskFallback ? (
              <KioskLogoMark size={36} variant="auth" plain className="!rounded-none" />
            ) : (
              <TenantMonogramMark
                brand={brand}
                primaryColor={primaryColor}
                size="sm"
              />
            )}
          </AuthMarkFrame>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate font-heading text-lg font-semibold leading-tight tracking-tight text-foreground">
              {kioskFallback?.wordmark ??
                (brand.split("|")[0]?.trim() || brand)}
            </p>
            <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {tagline}
            </p>
          </div>
        </>
      )}

      <span
        className="mt-1 hidden shrink-0 items-center gap-2 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] sm:inline-flex"
        style={{
          borderColor: "color-mix(in srgb, var(--auth-primary) 45%, transparent)",
          color: "var(--auth-primary)",
          background:
            "color-mix(in srgb, var(--auth-primary) 10%, transparent)",
        }}
      >
        <span className="relative flex size-1.5">
          <span
            className="absolute inset-0 animate-ping opacity-50"
            style={{ background: "var(--auth-primary)" }}
          />
          <span
            className="relative size-1.5"
            style={{ background: "var(--auth-primary)" }}
          />
        </span>
        Live
      </span>
    </header>
  );
}

export function AuthSplitShell({ tenant, children }: AuthSplitShellProps) {
  const style = useMemo(() => authThemeStyle(tenant), [tenant]);
  const brand =
    tenant?.branding?.displayName?.trim() ||
    tenant?.tenantName?.trim() ||
    "Kiosk";
  const logoUrl = tenant?.branding?.logoUrl?.trim() || null;
  const faviconUrl = tenant?.branding?.faviconUrl?.trim() || null;
  const primaryColor = tenant?.branding?.primaryColor ?? null;
  const slug = tenant?.slug?.trim();
  const logoWordmark = tenant ? brand : "Kiosk";
  const logoTagline = tenant
    ? slug
      ? slug.replace(/-/g, " · ")
      : "Point of sale"
    : "Retail platform";

  return (
    <div
      className="relative flex min-h-[100dvh] min-h-screen items-start justify-center overflow-x-hidden overflow-y-auto px-3 py-6 sm:items-center sm:px-6 sm:py-10"
      style={style}
    >
      {/* Ambient brand field */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-[20%] top-[10%] h-[min(90vw,520px)] w-[min(90vw,520px)] rounded-full opacity-[0.18] blur-[100px]"
          style={{ background: "var(--auth-primary)" }}
        />
        <div
          className="absolute -right-[15%] bottom-[5%] h-[min(85vw,480px)] w-[min(85vw,480px)] rounded-full opacity-[0.14] blur-[110px]"
          style={{ background: "var(--auth-secondary)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `
              linear-gradient(color-mix(in srgb, var(--auth-primary) 12%, transparent) 1px, transparent 1px),
              linear-gradient(90deg, color-mix(in srgb, var(--auth-primary) 10%, transparent) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 45%, black 10%, transparent 72%)",
          }}
        />
      </div>

      <div
        className={cn(
          "relative z-10 my-auto grid w-full max-w-[1000px] overflow-hidden border border-black/10",
          "border-[color-mix(in_srgb,var(--auth-primary)_20%,white)]",
          "bg-white dark:border-white/15 dark:bg-zinc-900",
          "min-h-0 sm:min-h-[min(100dvh-2.5rem,760px)] lg:min-h-[640px] lg:grid-cols-2",
          "shadow-[0_28px_56px_-24px_rgba(0,0,0,0.22)]",
        )}
        style={style}
      >
        {/* Left — form rail */}
        <div className="relative flex min-h-0 flex-col justify-start px-6 py-9 sm:justify-center sm:px-11 sm:py-12">
          {/* Wordmark-only watermark — skip when the masthead already uses a seal mark. */}
          {logoUrl ? (
            <TenantLogo
              brand={brand}
              logoUrl={logoUrl}
              variant="auth-watermark"
              primaryColor={primaryColor}
              className="!top-auto !bottom-10 !right-2 !opacity-[0.05]"
            />
          ) : null}

          <AuthMasthead
            brand={brand}
            logoUrl={logoUrl}
            faviconUrl={faviconUrl}
            primaryColor={primaryColor}
            tagline={logoTagline}
            kioskFallback={
              tenant
                ? undefined
                : {
                    wordmark: logoWordmark,
                    tagline: logoTagline,
                  }
            }
          />

          <div className="relative z-[2]">{children}</div>
        </div>

        {/* Right — hero */}
        <div className="relative hidden min-h-[300px] lg:block">
          <Image
            src={HERO_SRC}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 480px"
            priority
          />

          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg,
                color-mix(in srgb, var(--auth-primary) 55%, #0a0a0a) 0%,
                transparent 48%,
                color-mix(in srgb, var(--auth-secondary) 40%, #0a0a0a) 100%)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/20" />

          <TenantLogo
            brand={brand}
            logoUrl={logoUrl}
            variant="auth-hero-watermark"
            primaryColor={primaryColor}
          />

          {/* Secure strip — flush to top edge */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 border-b border-white/15 bg-black/45 px-5 py-3 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-2.5 text-white">
              <ShieldCheck className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="truncate text-xs font-semibold tracking-wide">
                {brand}
              </span>
            </div>
            <span
              className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{
                background: "var(--auth-secondary)",
                color: "var(--auth-secondary-ink)",
              }}
            >
              Secure
            </span>
          </div>

          {/* Ops panel — flush bottom, sharp */}
          <div className="absolute inset-x-0 bottom-0 border-t border-white/20 bg-white/95 px-5 py-4 backdrop-blur-md dark:bg-zinc-950/92">
            <p className="text-sm font-semibold text-foreground">
              Your operations hub
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Branded for{" "}
              <span className="font-medium text-foreground">{brand}</span>
              {slug ? (
                <>
                  {" "}
                  · <span className="font-mono text-[11px]">{slug}</span>
                </>
              ) : null}
            </p>
            <div className="mt-3.5 flex items-center gap-2">
              {[0.95, 0.75, 0.85, 0.65].map((opacity, i) => (
                <div
                  key={i}
                  className="size-8 border border-black/10 dark:border-white/15"
                  style={{
                    opacity,
                    background:
                      i % 2 === 0
                        ? "var(--auth-primary)"
                        : "var(--auth-secondary)",
                  }}
                />
              ))}
              <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">
                Team ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
