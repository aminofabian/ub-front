"use client";

import Image from "next/image";
import { KioskLogo } from "@/components/brand/kiosk-logo";
import { KioskLogoMark } from "@/components/brand/kiosk-logo-mark";
import { useMemo, type CSSProperties, type ReactNode } from "react";

import {
  BRAND_ACCENT,
  BRAND_PRIMARY,
} from "@/lib/brand-colors";
import type { TenantContext } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

/** Shared input chrome for auth split + simple auth pages. */
export const authInputClassName = cn(
  "w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none transition",
  "border-black/[0.06] bg-white/85 text-foreground backdrop-blur-md placeholder:text-muted-foreground/70",
  "focus-visible:border-[var(--auth-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--auth-primary)_30%,transparent)]",
  "dark:border-white/10 dark:bg-white/[0.07]",
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

  return {
    "--auth-primary": primary,
    "--auth-primary-hover": primaryHover,
    "--auth-secondary": secondary,
    "--auth-accent": primary,
    "--auth-accent-ink": inkForAccent(primary),
    "--auth-secondary-ink": inkForAccent(secondary),
    "--auth-glow": mixTowardWhite(primary, 0.55),
  } as CSSProperties;
}

const HERO_SRC =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80";

type AuthSplitShellProps = {
  tenant: TenantContext | null;
  children: ReactNode;
};

export function AuthSplitShell({ tenant, children }: AuthSplitShellProps) {
  const style = useMemo(() => authThemeStyle(tenant), [tenant]);
  const brand =
    tenant?.branding?.displayName?.trim() ||
    tenant?.tenantName?.trim() ||
    "Kiosk";
  const logoUrl = tenant?.branding?.logoUrl?.trim() || null;
  const faviconUrl = tenant?.branding?.faviconUrl?.trim() || null;
  const slug = tenant?.slug?.trim();
  const logoWordmark = tenant ? brand : "Kiosk";
  const logoTagline = tenant
    ? slug
      ? slug.replace(/-/g, " · ")
      : "Point of sale"
    : "Retail platform";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-3 py-6 sm:px-6 sm:py-10"
      style={{
        ...style,
        backgroundColor: "color-mix(in srgb, var(--auth-glow) 18%, #e4e6ec)",
      }}
    >
      {/* Ambient brand field */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-[20%] top-[10%] h-[min(90vw,520px)] w-[min(90vw,520px)] rounded-full opacity-[0.22] blur-[100px]"
          style={{ background: "var(--auth-primary)" }}
        />
        <div
          className="absolute -right-[15%] bottom-[5%] h-[min(85vw,480px)] w-[min(85vw,480px)] rounded-full opacity-[0.18] blur-[110px]"
          style={{ background: "var(--auth-secondary)" }}
        />
        <div
          className="absolute left-1/2 top-1/3 h-[40vh] w-[40vh] -translate-x-1/2 rounded-full opacity-[0.08] blur-[80px]"
          style={{ background: "var(--auth-primary)" }}
        />
        {/* Subtle mesh */}
        <div
          className="absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, color-mix(in srgb, var(--auth-primary) 12%, transparent) 0%, transparent 42%),
              radial-gradient(circle at 80% 70%, color-mix(in srgb, var(--auth-secondary) 14%, transparent) 0%, transparent 38%)`,
          }}
        />
        {/* Fine grid */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `
              linear-gradient(color-mix(in srgb, var(--auth-primary) 16%, transparent) 1px, transparent 1px),
              linear-gradient(90deg, color-mix(in srgb, var(--auth-primary) 14%, transparent) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, black 15%, transparent 70%)",
          }}
        />
      </div>

      <div
        className={cn(
          "relative z-10 grid w-full max-w-[1000px] overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-xl",
          "border-[color-mix(in_srgb,var(--auth-primary)_22%,white)]",
          "bg-[linear-gradient(165deg,#ffffffef_0%,#ffffffd9_40%,color-mix(in_srgb,var(--auth-primary)_6%,white)_100%)]",
          "dark:border-[color-mix(in_srgb,var(--auth-primary)_35%,transparent)]",
          "dark:bg-[linear-gradient(165deg,#18181bee_0%,#18181bcc_45%,color-mix(in_srgb,var(--auth-primary)_12%,#18181b)_100%)]",
          "min-h-[min(100dvh-2.5rem,760px)] lg:min-h-[640px] lg:grid-cols-2",
          "shadow-[0_0_0_1px_color-mix(in_srgb,var(--auth-primary)_12%,transparent),0_32px_64px_-20px_color-mix(in_srgb,var(--auth-primary)_35%,#00000055)]",
        )}
        style={style}
      >
        {/* Left — form rail */}
        <div
          className={cn(
            "relative flex flex-col justify-center overflow-hidden px-6 py-10 sm:px-11 sm:py-12",
            "before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(135deg,transparent_40%,color-mix(in_srgb,var(--auth-primary)_8%,transparent)_100%)]",
          )}
        >
          {/* Watermark logo */}
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- tenant asset URLs
            <img
              src={logoUrl}
              alt=""
              aria-hidden
              className="pointer-events-none absolute -right-16 top-24 w-[min(100%,380px)] max-w-none rotate-[-8deg] select-none opacity-[0.06] blur-[0.5px] dark:opacity-[0.09]"
            />
          ) : null}

          <div className="relative z-[1] mb-8 flex flex-wrap items-center gap-3">
            <div
              className="flex items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--auth-primary)_20%,transparent)] bg-white/70 px-3 py-2 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]"
            >
              {logoUrl ? (
                <>
                  {faviconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={faviconUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-inner ring-2 ring-[color-mix(in_srgb,var(--auth-primary)_25%,transparent)]"
                    />
                  ) : (
                    <KioskLogoMark size={40} variant="auth" />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt={brand}
                    className="h-9 max-w-[min(200px,45vw)] object-contain object-left"
                  />
                </>
              ) : (
                <KioskLogo
                  size="sm"
                  variant="auth"
                  wordmark={logoWordmark}
                  tagline={logoTagline}
                  showTagline
                  className="pointer-events-none"
                />
              )}
            </div>

            <span
              className="ml-auto hidden items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--auth-primary)] sm:inline-flex"
              style={{
                background: "color-mix(in srgb, var(--auth-primary) 14%, transparent)",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ background: "var(--auth-primary)" }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ background: "var(--auth-primary)" }}
                />
              </span>
              Live
            </span>
          </div>

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

          {/* Brand wash */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg,
                color-mix(in srgb, var(--auth-primary) 42%, transparent) 0%,
                transparent 45%,
                color-mix(in srgb, var(--auth-secondary) 38%, transparent) 100%)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Hero watermark logo */}
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 w-[min(90%,320px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.18] mix-blend-overlay"
            />
          ) : (
            <p className="pointer-events-none absolute left-1/2 top-[42%] w-full -translate-x-1/2 -translate-y-1/2 px-6 text-center font-black uppercase leading-none tracking-tighter text-white/25 sm:text-5xl">
              {brand}
            </p>
          )}

          <div className="absolute left-5 right-5 top-6 flex justify-center">
            <div className="flex max-w-[90%] flex-col items-center gap-2">
              <div
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md"
                style={{
                  background:
                    "linear-gradient(120deg, color-mix(in srgb, var(--auth-primary) 88%, #00000033), color-mix(in srgb, var(--auth-secondary) 55%, #00000055))",
                  boxShadow:
                    "0 8px 32px color-mix(in srgb, var(--auth-primary) 45%, transparent), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="max-w-[240px] truncate">{brand}</span>
                <span className="rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide dark:bg-white/20">
                  Secure
                </span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-5 right-5 flex justify-center">
            <div
              className="w-full max-w-[300px] rounded-2xl border border-white/30 bg-white/92 p-4 text-sm shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/92"
              style={{
                boxShadow:
                  "0 12px 40px color-mix(in srgb, var(--auth-primary) 18%, #00000044), 0 0 0 1px color-mix(in srgb, var(--auth-primary) 12%, transparent)",
              }}
            >
              <p className="font-bold text-foreground">Your operations hub</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Branded for <span className="font-semibold text-foreground">{brand}</span>
                {slug ? (
                  <>
                    {" "}
                    · <span className="font-mono text-[11px]">{slug}</span>
                  </>
                ) : null}
              </p>
              <div className="mt-4 flex items-center gap-2">
                {[0.95, 0.75, 0.85, 0.65].map((opacity, i) => (
                  <div
                    key={i}
                    className="h-9 w-9 rounded-full border-2 border-white shadow-md dark:border-zinc-800"
                    style={{
                      opacity,
                      background: i % 2 === 0 ? "var(--auth-primary)" : "var(--auth-secondary)",
                    }}
                  />
                ))}
                <span className="ml-1 text-[11px] font-medium text-muted-foreground">Team ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
