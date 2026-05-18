"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { KioskLogo } from "./kiosk-logo";
import {
  TenantMonogramLockup,
  TenantMonogramMark,
  type TenantMonogramSize,
  type TenantMonogramTone,
} from "./tenant-monogram";

const SIZES = {
  sm: {
    mark: 42,
    monogram: "sm" as TenantMonogramSize,
    logoMaxH: "max-h-10",
    logoMaxW: "max-w-[min(180px,45vw)]",
  },
  md: {
    mark: 52,
    monogram: "md" as TenantMonogramSize,
    logoMaxH: "max-h-12",
    logoMaxW: "max-w-[min(220px,48vw)]",
  },
  lg: {
    mark: 60,
    monogram: "lg" as TenantMonogramSize,
    logoMaxH: "max-h-14",
    logoMaxW: "max-w-[min(260px,52vw)]",
  },
} as const;

export type TenantLogoVariant =
  | "auth-badge"
  | "auth-watermark"
  | "auth-hero-watermark"
  | "sidebar-mark"
  | "storefront"
  | "storefront-hero"
  | "preview"
  | "upload"
  | "footer";

export type TenantLogoProps = {
  brand: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  variant?: TenantLogoVariant;
  size?: keyof typeof SIZES;
  tagline?: string;
  showTagline?: boolean;
  tone?: TenantMonogramTone;
  className?: string;
  href?: string;
  /** Platform Kiosk lockup when no tenant brand (omit on tenant hosts). */
  kioskFallback?: {
    wordmark?: string;
    tagline?: string;
    size?: keyof typeof SIZES;
  };
};

function normalizeHex(color: string | null | undefined): string | null {
  if (!color?.trim()) return null;
  const s = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toLowerCase();
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

function TenantFavicon({
  src,
  px,
}: {
  src: string;
  px: number;
}) {
  return (
    <span
      className="relative inline-flex shrink-0 overflow-hidden rounded-[0.32em] bg-muted/30"
      style={{ width: px, height: px }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src.trim()} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

function TenantLogoImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tenant CDN URLs
    <img
      src={src}
      alt={alt}
      className={cn("w-auto object-contain object-left", className)}
    />
  );
}

function TenantLockup({
  brand,
  logoUrl,
  faviconUrl,
  size,
  showTagline,
  tagline,
}: {
  brand: string;
  logoUrl: string;
  faviconUrl?: string | null;
  size: keyof typeof SIZES;
  showTagline?: boolean;
  tagline?: string;
}) {
  const s = SIZES[size];
  const favicon = faviconUrl?.trim() || null;

  return (
    <span className="inline-flex items-center gap-3">
      {favicon ? <TenantFavicon src={favicon} px={s.mark} /> : null}
      <span className="flex min-w-0 flex-col justify-center">
        <TenantLogoImage
          src={logoUrl}
          alt={brand}
          className={cn(s.logoMaxH, s.logoMaxW)}
        />
        {showTagline && tagline ? (
          <span className="mt-1.5 truncate font-sans text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function MonogramFallback({
  brand,
  primaryColor,
  size,
  tagline,
  showTagline,
  showWordmark = true,
  tone,
}: {
  brand: string;
  primaryColor?: string | null;
  size: TenantMonogramSize;
  tagline?: string;
  showTagline?: boolean;
  showWordmark?: boolean;
  tone?: TenantMonogramTone;
}) {
  return (
    <TenantMonogramLockup
      brand={brand}
      primaryColor={primaryColor ?? undefined}
      size={size}
      tagline={tagline}
      showTagline={showTagline}
      showWordmark={showWordmark}
      tone={tone}
    />
  );
}

/** Tenant logo — uploaded image or generated monogram until upload. */
export function TenantLogo({
  brand,
  logoUrl,
  faviconUrl,
  primaryColor,
  variant = "auth-badge",
  size = "md",
  tagline,
  showTagline,
  tone = "light",
  className,
  href,
  kioskFallback,
}: TenantLogoProps) {
  const primary = normalizeHex(primaryColor);
  const logo = logoUrl?.trim() || null;
  const favicon = faviconUrl?.trim() || null;

  if (variant === "auth-watermark") {
    if (logo) {
      return (
        <TenantLogoImage
          src={logo}
          alt=""
          className={cn(
            "pointer-events-none absolute -right-16 top-24 w-[min(100%,380px)] max-w-none -rotate-[8deg] select-none opacity-[0.07] blur-[0.5px] dark:opacity-[0.1]",
            className,
          )}
        />
      );
    }
    return (
      <TenantMonogramMark
        brand={brand}
        primaryColor={primary}
        size="xl"
        className={cn(
          "pointer-events-none absolute -right-8 top-16 rotate-[-12deg] select-none opacity-[0.07] blur-[0.5px] dark:opacity-[0.09]",
          className,
        )}
      />
    );
  }

  if (variant === "auth-hero-watermark") {
    if (logo) {
      return (
        <TenantLogoImage
          src={logo}
          alt=""
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 w-[min(90%,320px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.2] mix-blend-overlay",
            className,
          )}
        />
      );
    }
    return (
      <TenantMonogramMark
        brand={brand}
        primaryColor={primary}
        size="xl"
        className={cn(
          "pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 opacity-[0.14]",
          className,
        )}
      />
    );
  }

  if (variant === "sidebar-mark") {
    const inner = logo ? (
      <TenantLogoImage
        src={logo}
        alt={brand}
        className="h-10 w-auto max-w-[9rem] object-contain object-left"
      />
    ) : (
      <TenantMonogramMark
        brand={brand}
        primaryColor={primary}
        size="sm"
      />
    );

    if (href) {
      return (
        <Link href={href} className={cn("inline-flex shrink-0", className)} aria-label={brand}>
          {inner}
        </Link>
      );
    }
    return <span className={cn("inline-flex shrink-0", className)}>{inner}</span>;
  }

  if (variant === "footer") {
    const s = size ?? "md";
    const inner = logo ? (
      <TenantLogoImage
        src={logo}
        alt={`${brand} logo`}
        className={cn(
          "w-auto object-contain brightness-0 invert",
          SIZES[s].logoMaxH,
          SIZES[s].logoMaxW,
        )}
      />
    ) : (
      <MonogramFallback
        brand={brand}
        primaryColor={primaryColor}
        size={SIZES[s].monogram}
        showWordmark
        showTagline={false}
        tone="dark"
      />
    );
    return <span className={cn("inline-flex", className)}>{inner}</span>;
  }

  if (variant === "storefront") {
    const s = size ?? "lg";
    const inner = logo ? (
      <TenantLogoImage
        src={logo}
        alt={`${brand} logo`}
        className={cn(
          "w-auto object-contain",
          SIZES[s].logoMaxH,
          SIZES[s].logoMaxW,
          s === "lg" && "sm:max-h-16 sm:max-w-[16rem]",
        )}
      />
    ) : (
      <MonogramFallback
        brand={brand}
        primaryColor={primaryColor}
        size={SIZES[s].monogram}
        showWordmark
        showTagline={false}
        tone={tone}
      />
    );

    if (href) {
      return (
        <Link href={href} className={cn("inline-flex shrink-0 items-center", className)} aria-label={brand}>
          {inner}
        </Link>
      );
    }
    return <span className={cn("inline-flex", className)}>{inner}</span>;
  }

  if (variant === "storefront-hero") {
    if (logo) {
      return (
        <TenantLogoImage
          src={logo}
          alt={brand}
          className={cn(
            "max-h-14 w-auto max-w-[11rem] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
            className,
          )}
        />
      );
    }
    return (
      <TenantMonogramMark
        brand={brand}
        primaryColor={primary}
        size="lg"
        className={className}
      />
    );
  }

  if (variant === "preview") {
    const display = brand.trim() || "Your shop";
    return (
      <span className={cn("inline-flex items-center gap-3", className)}>
        {logo ? (
          <>
            <TenantLogoImage src={logo} alt={display} className="size-11 object-contain" />
            <span className="min-w-0 flex-1">
              <p
                className="truncate text-base font-semibold"
                style={primary ? { color: primary } : undefined}
              >
                {display}
              </p>
              {showTagline !== false ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tagline ?? "Header as shoppers see it"}
                </p>
              ) : null}
            </span>
          </>
        ) : (
          <MonogramFallback
            brand={display}
            primaryColor={primary}
            size="sm"
            tagline={tagline ?? "Header as shoppers see it"}
            showTagline={showTagline !== false}
          />
        )}
      </span>
    );
  }

  if (variant === "upload") {
    if (logo) {
      return (
        <Image
          src={logo}
          alt="Current logo"
          width={96}
          height={96}
          className={cn("size-20 object-contain", className)}
          unoptimized
        />
      );
    }
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <TenantMonogramMark brand={brand || "Your shop"} primaryColor={primary} size="lg" />
        <p className="text-center text-xs text-muted-foreground">
          Generated from your shop name until you upload a logo
        </p>
      </div>
    );
  }

  // auth-badge (default)
  let content: ReactNode;

  if (logo) {
    content = (
      <TenantLockup
        brand={brand}
        logoUrl={logo}
        faviconUrl={favicon}
        size={size}
        showTagline={showTagline}
        tagline={tagline}
      />
    );
  } else if (kioskFallback) {
    content = (
      <KioskLogo
        size={kioskFallback.size ?? size}
        variant="auth"
        wordmark={kioskFallback.wordmark ?? brand}
        tagline={kioskFallback.tagline ?? tagline}
        showTagline={showTagline}
        className="pointer-events-none"
      />
    );
  } else {
    content = (
      <MonogramFallback
        brand={brand}
        primaryColor={primaryColor}
        size={SIZES[size].monogram}
        tagline={tagline}
        showTagline={showTagline}
        tone={tone}
      />
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--tenant-mono-accent,#28a745)_40%,transparent)]",
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return <span className={cn("inline-flex", className)}>{content}</span>;
}
