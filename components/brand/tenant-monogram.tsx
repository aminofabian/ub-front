"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";

import { pickReadableTextColor } from "@/lib/branding-color-presets";
import { resolveShopMark, shopMarkColors } from "@/lib/shop-mark";
import { cn } from "@/lib/utils";

import { ShopTradeMark } from "./shop-trade-mark";

const MONOGRAM_SIZES = {
  xs: { px: 42, word: "text-base", tag: "text-[10px]", tracking: "tracking-[0.06em]" },
  sm: { px: 52, word: "text-lg", tag: "text-[11px]", tracking: "tracking-[0.07em]" },
  md: { px: 60, word: "text-xl", tag: "text-[11px]", tracking: "tracking-[0.08em]" },
  lg: { px: 72, word: "text-2xl", tag: "text-xs", tracking: "tracking-[0.08em]" },
  xl: { px: 96, word: "text-[1.75rem]", tag: "text-xs", tracking: "tracking-[0.09em]" },
} as const;

const DEFAULT_PRIMARY = "#0D9488";

export type TenantMonogramSize = keyof typeof MONOGRAM_SIZES;

export type LuxuryPalette = {
  goldLight: string;
  goldMid: string;
  goldDeep: string;
  goldDark: string;
  darkTop: string;
  darkBottom: string;
  ink: string;
  inkMuted: string;
  rule: string;
  tag: string;
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${c(r).toString(16).padStart(2, "0")}${c(g).toString(16).padStart(2, "0")}${c(b).toString(16).padStart(2, "0")}`;
}

function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(
    A.r + (B.r - A.r) * t,
    A.g + (B.g - A.g) * t,
    A.b + (B.b - A.b) * t,
  );
}

/** First meaningful character for the monogram. */
export function monogramLetter(brand: string): string {
  const trimmed = brand.trim();
  if (!trimmed) return "S";
  const cleaned = trimmed.replace(/^the\s+/i, "").trim();
  const match = cleaned.match(/[A-Za-z0-9\u00C0-\u024F]/);
  return (match?.[0] ?? trimmed[0]).toUpperCase();
}

/** Up to two initials when the shop name has multiple words. */
export function monogramInitials(brand: string): string {
  const cleaned = brand.trim().replace(/^the\s+/i, "").trim();
  if (!cleaned) return "S";

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0].match(/[A-Za-z0-9\u00C0-\u024F]/)?.[0];
    const second = words[1].match(/[A-Za-z0-9\u00C0-\u024F]/)?.[0];
    if (first && second) return `${first}${second}`.toUpperCase();
  }

  return monogramLetter(cleaned);
}

/** Brand-tinted palette for mark + lockup (keeps legacy export shape). */
export function luxuryPalette(
  brand: string,
  primaryColor?: string | null,
): LuxuryPalette {
  void brand;
  const primary = normalizeHex(primaryColor) ?? DEFAULT_PRIMARY;
  const ink = mixHex(primary, "#111827", 0.55);
  const inkMuted = mixHex(primary, "#6B7280", 0.35);
  const goldMid = primary;
  const goldLight = mixHex(primary, "#FFFFFF", 0.35);
  const goldDeep = mixHex(primary, "#111827", 0.25);
  const goldDark = mixHex(primary, "#111827", 0.45);

  return {
    goldLight,
    goldMid,
    goldDeep,
    goldDark,
    darkTop: mixHex(primary, "#FFFFFF", 0.92),
    darkBottom: mixHex(primary, "#FFFFFF", 0.78),
    ink,
    inkMuted,
    rule: mixHex(primary, "#FFFFFF", 0.55),
    tag: inkMuted,
  };
}

/** @deprecated use luxuryPalette */
export function monogramPalette(brand: string, primaryColor?: string | null) {
  const p = luxuryPalette(brand, primaryColor);
  return {
    fillTop: p.darkTop,
    fillBottom: p.darkBottom,
    accent: p.goldMid,
    ink: p.ink,
    rule: p.rule,
  };
}

type MarkPalette = {
  primary: string;
  primaryDeep: string;
  primaryLight: string;
  ring: string;
  letterOnBrand: string;
  letterOnLight: string;
  motif: string;
};

function markPalette(primaryColor?: string | null): MarkPalette {
  const primary = normalizeHex(primaryColor) ?? DEFAULT_PRIMARY;
  const primaryDeep = mixHex(primary, "#000000", 0.22);
  const primaryLight = mixHex(primary, "#FFFFFF", 0.2);
  const ring = mixHex("#FFFFFF", primary, 0.35);
  const letterOnBrand = pickReadableTextColor(primary);
  const letterOnLight = primaryDeep;

  return {
    primary,
    primaryDeep,
    primaryLight,
    ring,
    letterOnBrand,
    letterOnLight,
    motif: mixHex(primary, "#FFFFFF", 0.45),
  };
}

export type TenantMonogramMarkProps = {
  brand: string;
  primaryColor?: string | null;
  /** Shop formats from setup. The first one chooses the emblem. */
  storeTypes?: readonly string[] | null;
  size?: TenantMonogramSize;
  /** `on-brand` = mark sits on a coloured header; `on-light` = white UI surfaces. */
  surface?: "on-light" | "on-brand";
  className?: string;
  style?: CSSProperties;
};

/** Shop emblem from the business type, with the name worked into the mark. */
export function TenantMonogramMark({
  brand,
  primaryColor,
  storeTypes,
  size = "md",
  surface = "on-light",
  className,
  style,
}: TenantMonogramMarkProps) {
  const display = brand.trim() || "Shop";
  const initials = monogramInitials(display);
  const glyph =
    initials.length === 2 && size !== "xs" ? initials : monogramLetter(display);
  const palette = useMemo(() => markPalette(primaryColor), [primaryColor]);
  const mark = resolveShopMark(storeTypes);
  const colors = shopMarkColors(
    palette.primary,
    palette.primaryDeep,
    surface === "on-brand",
  );
  const { px } = MONOGRAM_SIZES[size];

  return (
    <span
      className={cn("tenant-monogram-shell inline-flex shrink-0", className)}
      style={{ width: `${px}px`, height: `${px}px`, ...style }}
      role="img"
      aria-label={`${display} ${mark.label.toLowerCase()} logo`}
    >
      <ShopTradeMark kind={mark.kind} initials={glyph} colors={colors} />
    </span>
  );
}

export type TenantMonogramTone = "light" | "dark";

export type TenantMonogramLockupProps = {
  brand: string;
  primaryColor?: string | null;
  storeTypes?: readonly string[] | null;
  size?: TenantMonogramSize;
  tagline?: string;
  showTagline?: boolean;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
  /** Use `dark` on colored footer bars and hero bands. */
  tone?: TenantMonogramTone;
};

/** Mark + shop name — readable on light headers and dark hero bands. */
export function TenantMonogramLockup({
  brand,
  primaryColor,
  storeTypes,
  size = "md",
  tagline,
  showTagline,
  showWordmark = true,
  wordmarkClassName,
  className,
  tone = "light",
}: TenantMonogramLockupProps) {
  const display = brand.trim() || "Shop";
  const palette = useMemo(
    () => luxuryPalette(display, primaryColor),
    [display, primaryColor],
  );
  const { word, tag, tracking } = MONOGRAM_SIZES[size];
  const onDark = tone === "dark";

  return (
    <span
      className={cn(
        "tenant-monogram-lockup inline-flex min-w-0 items-center gap-3 sm:gap-3.5",
        onDark && "tenant-monogram-lockup--dark",
        className,
      )}
    >
      <TenantMonogramMark
        brand={display}
        primaryColor={primaryColor}
        storeTypes={storeTypes}
        size={size}
        surface={onDark ? "on-brand" : "on-light"}
      />
      {showWordmark ? (
        <span className="flex min-w-0 flex-col justify-center gap-1 leading-tight">
          <span
            className={cn(
              "tenant-monogram-wordmark truncate font-heading font-semibold uppercase antialiased",
              word,
              tracking,
              onDark && "text-white",
              wordmarkClassName,
            )}
            style={onDark ? undefined : { color: palette.ink }}
          >
            {display}
          </span>
          <span
            aria-hidden
            className={cn(
              "tenant-monogram-rule h-0.5 w-8 rounded-full",
              onDark && "bg-white/40",
            )}
            style={onDark ? undefined : { backgroundColor: palette.rule }}
          />
          {showTagline && tagline ? (
            <span
              className={cn(
                "truncate font-sans text-[0.7rem] font-medium leading-snug",
                onDark ? "text-white/70" : undefined,
              )}
              style={onDark ? undefined : { color: palette.inkMuted }}
            >
              {tagline}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
