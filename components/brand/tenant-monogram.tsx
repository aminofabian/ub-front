"use client";

import { useId, useMemo } from "react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

const MONOGRAM_SIZES = {
  xs: { px: 42, word: "text-base", tag: "text-[10px]", tracking: "tracking-[0.06em]" },
  sm: { px: 52, word: "text-lg", tag: "text-[11px]", tracking: "tracking-[0.07em]" },
  md: { px: 60, word: "text-xl", tag: "text-[11px]", tracking: "tracking-[0.08em]" },
  lg: { px: 72, word: "text-2xl", tag: "text-xs", tracking: "tracking-[0.08em]" },
  xl: { px: 96, word: "text-[1.75rem]", tag: "text-xs", tracking: "tracking-[0.09em]" },
} as const;

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

/** Heritage gold palette — readable on light UI surfaces. */
export function luxuryPalette(
  brand: string,
  primaryColor?: string | null,
): LuxuryPalette {
  const primary = normalizeHex(primaryColor);
  const goldBase = primary ? mixHex("#C9952A", primary, 0.28) : "#C9952A";
  const goldLight = mixHex("#F0D078", goldBase, 0.2);
  const goldMid = goldBase;
  const goldDeep = mixHex("#9A6A18", goldBase, 0.45);
  const goldDark = mixHex("#6B4810", goldDeep, 0.35);

  return {
    goldLight,
    goldMid,
    goldDeep,
    goldDark,
    darkTop: "#1C1610",
    darkBottom: "#0E0B07",
    ink: "#1A1510",
    inkMuted: "#6B5E4E",
    rule: goldMid,
    tag: goldDeep,
  };
}

/** @deprecated use luxuryPalette */
export function monogramPalette(brand: string, primaryColor?: string | null) {
  const p = luxuryPalette(brand, primaryColor);
  return {
    fillTop: p.goldLight,
    fillBottom: p.goldDeep,
    accent: p.goldMid,
    ink: p.goldLight,
    rule: p.rule,
  };
}

function GeometricLetter({
  letter,
  goldId,
}: {
  letter: string;
  goldId: string;
}) {
  const fill = `url(#${goldId})`;

  if (letter === "S") {
    return (
      <g>
        <rect x="14" y="16" width="36" height="8" rx="4" fill={fill} />
        <rect x="14" y="28" width="36" height="8" rx="4" fill={fill} />
        <rect x="14" y="40" width="36" height="8" rx="4" fill={fill} />
        <rect x="14" y="16" width="8" height="22" rx="2" fill={fill} />
        <rect x="42" y="28" width="8" height="22" rx="2" fill={fill} />
      </g>
    );
  }

  if (letter === "O") {
    return (
      <rect
        x="17"
        y="17"
        width="30"
        height="30"
        rx="9"
        fill="none"
        stroke={fill}
        strokeWidth="8"
      />
    );
  }

  if (letter === "I" || letter === "1") {
    return <rect x="27" y="15" width="10" height="34" rx="5" fill={fill} />;
  }

  if (letter === "T") {
    return (
      <g>
        <rect x="14" y="16" width="36" height="8" rx="4" fill={fill} />
        <rect x="27" y="16" width="10" height="33" rx="5" fill={fill} />
      </g>
    );
  }

  if (letter === "E") {
    return (
      <g>
        <rect x="14" y="16" width="8" height="32" rx="2" fill={fill} />
        <rect x="14" y="16" width="32" height="8" rx="4" fill={fill} />
        <rect x="14" y="28" width="26" height="7" rx="3.5" fill={fill} />
        <rect x="14" y="40" width="32" height="8" rx="4" fill={fill} />
      </g>
    );
  }

  return (
    <text
      x="32"
      y="35"
      textAnchor="middle"
      dominantBaseline="middle"
      fill={fill}
      fontSize="28"
      fontWeight="700"
      fontFamily="Georgia, 'Times New Roman', var(--font-cormorant), serif"
    >
      {letter}
    </text>
  );
}

export type TenantMonogramMarkProps = {
  brand: string;
  primaryColor?: string | null;
  size?: TenantMonogramSize;
  className?: string;
  style?: CSSProperties;
};

/** Clear luxury lettermark — dark tile + gold geometry. */
export function TenantMonogramMark({
  brand,
  primaryColor,
  size = "md",
  className,
  style,
}: TenantMonogramMarkProps) {
  const uid = useId().replace(/:/g, "");
  const letter = monogramLetter(brand);
  const palette = useMemo(
    () => luxuryPalette(brand, primaryColor),
    [brand, primaryColor],
  );
  const { px } = MONOGRAM_SIZES[size];
  const showCorners = size !== "xs";

  const goldId = `lux-gold-${uid}`;
  const iconBgId = `lux-bg-${uid}`;
  const sheenId = `lux-sheen-${uid}`;

  return (
    <span
      className={cn("tenant-monogram-shell inline-flex shrink-0", className)}
      style={{ width: `${px}px`, height: `${px}px`, ...style }}
      role="img"
      aria-label={`${brand.trim() || "Shop"} logo`}
    >
      <svg
        viewBox="0 0 64 64"
        width={px}
        height={px}
        className="tenant-monogram-svg block h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.goldLight} />
            <stop offset="45%" stopColor={palette.goldMid} />
            <stop offset="100%" stopColor={palette.goldDeep} />
          </linearGradient>
          <linearGradient id={iconBgId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.darkTop} />
            <stop offset="100%" stopColor={palette.darkBottom} />
          </linearGradient>
          <linearGradient id={sheenId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="64" height="64" rx="15" fill={`url(#${iconBgId})`} />
        <rect width="64" height="64" rx="15" fill={`url(#${sheenId})`} />
        <rect
          width="64"
          height="64"
          rx="15"
          fill="none"
          stroke={palette.goldMid}
          strokeWidth="1.25"
          opacity="0.9"
        />

        {showCorners ? (
          <g stroke={palette.goldLight} strokeWidth="1" fill="none" opacity="0.45">
            <polyline points="8,8 8,5 12,5" />
            <polyline points="56,8 56,5 52,5" />
            <polyline points="8,56 8,59 12,59" />
            <polyline points="56,56 56,59 52,59" />
          </g>
        ) : null}

        <GeometricLetter letter={letter} goldId={goldId} />
      </svg>
    </span>
  );
}

export type TenantMonogramTone = "light" | "dark";

export type TenantMonogramLockupProps = {
  brand: string;
  primaryColor?: string | null;
  size?: TenantMonogramSize;
  tagline?: string;
  showTagline?: boolean;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
  /** Use `dark` on colored footer bars and hero bands. */
  tone?: TenantMonogramTone;
};

/** Mark + shop name — optimized for light headers (high contrast, readable). */
export function TenantMonogramLockup({
  brand,
  primaryColor,
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
        "tenant-monogram-lockup inline-flex min-w-0 items-center gap-3.5 sm:gap-4",
        onDark && "tenant-monogram-lockup--dark",
        className,
      )}
    >
      <TenantMonogramMark
        brand={display}
        primaryColor={primaryColor}
        size={size}
      />
      {showWordmark ? (
        <span className="flex min-w-0 flex-col justify-center gap-1.5 leading-none">
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
              "tenant-monogram-rule h-[2px] w-12 rounded-full sm:w-14",
              onDark && "bg-white/45",
            )}
            style={onDark ? undefined : { backgroundColor: palette.rule }}
          />
          {showTagline && tagline ? (
            <span
              className={cn(
                "truncate font-sans font-medium uppercase leading-snug",
                tag,
                "tracking-[0.14em]",
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
