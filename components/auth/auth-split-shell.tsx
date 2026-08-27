"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { useMemo, type CSSProperties, type ReactNode } from "react";

import { KioskLogoMark } from "@/components/brand/kiosk-logo-mark";
import { TenantMonogramMark } from "@/components/brand/tenant-monogram";

import {
  BRAND_ACCENT,
  BRAND_PRIMARY,
} from "@/lib/brand-colors";
import type { TenantContext } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

/** Shared input chrome for auth split + simple auth pages. */
export const authInputClassName = cn(
  "w-full rounded-lg border px-4 py-3 text-[15px] outline-none",
  "transition-[border-color,box-shadow] duration-200 ease-out",
  "border-black/[0.1] bg-white text-foreground placeholder:text-muted-foreground/60",
  "focus-visible:border-[var(--auth-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--auth-primary)_18%,transparent)]",
  "dark:border-white/12 dark:bg-white/[0.05]",
);

/** Primary CTA — shared across staff/customer auth forms. */
export const authPrimaryCtaClass = cn(
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg",
  "bg-[var(--auth-accent)] text-[var(--auth-accent-ink)] text-[15px] font-semibold",
  "shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_color-mix(in_srgb,var(--auth-primary)_22%,transparent)]",
  "transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
  "hover:bg-[var(--auth-primary-hover)] active:scale-[0.98]",
  "disabled:pointer-events-none disabled:opacity-55",
);

export function shortBrandName(brand: string): string {
  return brand.split("|")[0]?.trim() || brand;
}

function brandSubtitle(brand: string, slug: string | undefined): string {
  const descriptor = brand
    .split("|")
    .slice(1)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
  if (descriptor) {
    return descriptor;
  }
  if (slug) {
    return slug.replace(/-/g, " · ");
  }
  return "Staff portal";
}

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
    "--auth-ease-out": "cubic-bezier(0.23, 1, 0.32, 1)",
    backgroundColor: blendWithHex("#eceef2", glow, 0.12),
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
  subtitle,
  kioskFallback,
}: {
  brand: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  subtitle: string;
  kioskFallback?: {
    wordmark: string;
    tagline: string;
  };
}) {
  const displayName = shortBrandName(brand);
  /**
   * One identity. Prefer a framed seal (favicon) + shop name; fall back to the
   * uploaded wordmark alone. Never favicon beside the full logo — that reads
   * as two logos. The wordmark still appears as the page watermark.
   */
  const sealSrc = faviconUrl;
  const showWordmarkAlone = !sealSrc && Boolean(logoUrl);

  return (
    <header className="relative z-[1] mb-8 flex items-start gap-3.5 border-b border-black/[0.06] pb-7 dark:border-white/10">
      {showWordmarkAlone ? (
        <div className="min-w-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- tenant CDN */}
          <img
            src={logoUrl!}
            alt={brand}
            className="max-h-11 w-auto max-w-[min(260px,68vw)] object-contain object-left"
          />
          <p className="mt-2 line-clamp-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {subtitle}
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
            <p className="truncate font-heading text-[1.125rem] font-semibold leading-tight tracking-[-0.02em] text-foreground">
              {kioskFallback?.wordmark ?? displayName}
            </p>
            <p className="mt-1 line-clamp-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {kioskFallback?.tagline ?? subtitle}
            </p>
          </div>
        </>
      )}

      <span
        className="mt-0.5 hidden shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:inline-flex"
        style={{
          borderColor: "color-mix(in srgb, var(--auth-primary) 32%, transparent)",
          color: "var(--auth-primary)",
          background:
            "color-mix(in srgb, var(--auth-primary) 8%, transparent)",
        }}
      >
        <span
          className="size-1.5 rounded-full"
          style={{ background: "var(--auth-primary)" }}
          aria-hidden
        />
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
  const displayName = shortBrandName(brand);
  const subtitle = brandSubtitle(brand, slug);
  const logoWordmark = tenant ? displayName : "Kiosk";
  const logoTagline = tenant ? subtitle : "Retail platform";

  return (
    <div
      className="relative flex min-h-[100dvh] min-h-screen items-start justify-center overflow-x-hidden overflow-y-auto px-4 py-8 sm:items-center sm:px-6 sm:py-12"
      style={style}
    >
      {/* Ambient brand field — soft, not decorative grid noise */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-[18%] top-[8%] h-[min(85vw,480px)] w-[min(85vw,480px)] rounded-full opacity-[0.12] blur-[120px]"
          style={{ background: "var(--auth-primary)" }}
        />
        <div
          className="absolute -right-[12%] bottom-[8%] h-[min(80vw,440px)] w-[min(80vw,440px)] rounded-full opacity-[0.09] blur-[120px]"
          style={{ background: "var(--auth-secondary)" }}
        />
      </div>

      <div
        className={cn(
          "relative z-10 my-auto grid w-full max-w-[980px] overflow-hidden rounded-2xl border",
          "border-black/[0.08] bg-white dark:border-white/12 dark:bg-zinc-900",
          "min-h-0 sm:min-h-[min(100dvh-3rem,720px)] lg:min-h-[620px] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]",
          "shadow-[0_24px_48px_-20px_rgba(15,23,42,0.18)]",
        )}
        style={style}
      >
        {/* Left — form rail */}
        <div className="relative flex min-h-0 flex-col justify-start px-7 py-10 sm:justify-center sm:px-10 sm:py-12 lg:px-11">
          <AuthMasthead
            brand={brand}
            logoUrl={logoUrl}
            faviconUrl={faviconUrl}
            primaryColor={primaryColor}
            subtitle={logoTagline}
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
        <div className="relative hidden min-h-[320px] lg:block">
          <Image
            src={HERO_SRC}
            alt=""
            fill
            className="object-cover object-[center_20%]"
            sizes="(max-width: 1024px) 100vw, 460px"
            priority
          />

          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(165deg,
                color-mix(in srgb, var(--auth-primary) 42%, #0c0c0c) 0%,
                transparent 52%,
                color-mix(in srgb, var(--auth-secondary) 28%, #0c0c0c) 100%)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />

          {/* Secure strip */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 border-b border-white/12 bg-black/40 px-5 py-2.5 backdrop-blur-[6px]">
            <div className="flex min-w-0 items-center gap-2 text-white/95">
              <ShieldCheck className="size-3.5 shrink-0 opacity-90" aria-hidden />
              <span className="truncate text-[11px] font-medium tracking-wide">
                Staff portal
              </span>
            </div>
            <span
              className="shrink-0 rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
              style={{
                background: "color-mix(in srgb, var(--auth-secondary) 88%, white)",
                color: "var(--auth-secondary-ink)",
              }}
            >
              Secure
            </span>
          </div>

          {/* Ops panel */}
          <div className="absolute inset-x-0 bottom-0 border-t border-white/15 bg-white/[0.97] px-5 py-4 dark:bg-zinc-950/95">
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
              Your operations hub
            </p>
            <p className="mt-1 max-w-[34ch] text-xs leading-relaxed text-muted-foreground">
              Counter, inventory, and online shop — one place for{" "}
              <span className="font-medium text-foreground">{displayName}</span>.
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              {[0.92, 0.72, 0.82, 0.62].map((opacity, i) => (
                <div
                  key={i}
                  className="size-6 rounded-sm"
                  style={{
                    opacity,
                    background:
                      i % 2 === 0
                        ? "var(--auth-primary)"
                        : "var(--auth-secondary)",
                  }}
                />
              ))}
              <span className="ml-2 text-[11px] font-medium text-muted-foreground">
                Branded &amp; ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
