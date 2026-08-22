"use client";

import Image from "next/image";

import type {
  StorefrontDesignButtons,
  StorefrontDesignDensity,
  StorefrontDesignRadius,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

export type MiniPreviewData = {
  storeName: string;
  primaryHex: string | null;
  surface: string;
  radius: StorefrontDesignRadius;
  buttons: StorefrontDesignButtons;
  density: StorefrontDesignDensity;
  heroUrl: string;
  heroFocalX: number;
  heroFocalY: number;
  heroHeadline: string;
  heroSubheadline: string;
  heroEnabled: boolean;
  announcementEnabled: boolean;
  announcement: string;
  promoEnabled: boolean;
  promoTitle: string;
  promoSubtitle: string;
  promoCoupon: string;
  productsEnabled: boolean;
  aboutEnabled: boolean;
  socialEnabled: boolean;
  contactEnabled: boolean;
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function isDarkHex(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.45;
}

const RADIUS_MAP: Record<StorefrontDesignRadius, { card: string; pill: string }> = {
  sharp: { card: "rounded-[5px]", pill: "rounded-[4px]" },
  soft: { card: "rounded-[9px]", pill: "rounded-[7px]" },
  round: { card: "rounded-[13px]", pill: "rounded-full" },
};

const DENSITY_GAP: Record<StorefrontDesignDensity, string> = {
  compact: "gap-[2px]",
  cozy: "gap-[3.5px]",
  airy: "gap-[6px]",
};

/**
 * Live miniature of the shop front, driven by the editor form — every token,
 * photo and section choice renders here the moment it changes. The merchant
 * never edits blind: the preview is the shop, the controls are beside it.
 */
export function StorefrontMiniPreview({ data }: { data: MiniPreviewData }) {
  const surface = HEX_RE.test(data.surface) ? data.surface : "#FAFAF8";
  const dark = isDarkHex(surface);
  const ink = dark ? "#F8FAFC" : "#0F172A";
  const muted = dark ? "#CBD5E1" : "#64748B";
  const primary =
    data.primaryHex && HEX_RE.test(data.primaryHex) ? data.primaryHex : "#15803D";
  const card = RADIUS_MAP[data.radius];

  return (
    <div
      className="mx-auto w-full max-w-[236px] rounded-[1.9rem] border border-black/70 bg-[#15161a] p-[6px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]"
      aria-label="Live preview of your shop front"
    >
      <div
        className="flex aspect-[9/19.2] w-full flex-col overflow-hidden rounded-[1.55rem]"
        style={{ backgroundColor: surface, color: ink }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[9px] pb-[3px] pt-[9px]">
          <span className="max-w-[70%] truncate text-[7px] font-bold leading-none">
            {data.storeName || "Your shop"}
          </span>
          <span
            className={cn(
              "inline-flex h-[11px] items-center px-[4px] text-[5px] font-semibold",
              card.pill,
            )}
            style={{ backgroundColor: dark ? "rgba(127,127,127,0.25)" : "rgba(15,23,42,0.08)", color: muted }}
          >
            Cart
          </span>
        </div>

        <div className={cn("flex min-h-0 flex-1 flex-col px-[8px]", DENSITY_GAP[data.density])}>
          {/* Hero */}
          {data.heroUrl || data.heroEnabled ? (
            <div
              className={cn(
                "relative flex min-h-[88px] flex-1 basis-[40%] flex-col justify-end overflow-hidden",
                card.card,
              )}
              style={{
                backgroundColor: primary,
                backgroundImage: data.heroUrl
                  ? undefined
                  : `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 62%, black))`,
              }}
            >
              {data.heroUrl ? (
                <Image
                  src={data.heroUrl}
                  alt=""
                  fill
                  sizes="236px"
                  unoptimized
                  className="object-cover"
                  style={{ objectPosition: `${data.heroFocalX}% ${data.heroFocalY}%` }}
                />
              ) : null}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(2,6,23,0.72) 0%, rgba(2,6,23,0.18) 55%, transparent 100%)",
                }}
                aria-hidden
              />
              <div className="relative z-10 px-[8px] pb-[7px]">
                <p className="truncate text-[8px] font-bold leading-tight text-white">
                  {data.heroHeadline || data.storeName || "Your shop"}
                </p>
                {data.heroSubheadline ? (
                  <p className="mt-[1px] truncate text-[5.5px] font-medium text-white/75">
                    {data.heroSubheadline}
                  </p>
                ) : null}
                <span
                  className={cn(
                    "mt-[4px] inline-flex h-[13px] items-center px-[6px] text-[5.5px] font-bold leading-none",
                    card.pill,
                  )}
                  style={
                    data.buttons === "outline"
                      ? { border: "1px solid rgba(255,255,255,0.8)", color: "#fff" }
                      : { backgroundColor: "#fff", color: "#0f172a" }
                  }
                >
                  Shop now
                </span>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "flex min-h-[70px] flex-1 basis-[34%] flex-col items-center justify-center gap-[3px] px-[10px]",
                card.card,
              )}
              style={{ backgroundColor: dark ? "rgba(127,127,127,0.22)" : "rgba(15,23,42,0.05)" }}
            >
              <span className="max-w-full truncate text-[8px] font-bold leading-tight" style={{ color: ink }}>
                {data.storeName || "Your shop"}
              </span>
              <span className="text-[5px] font-medium" style={{ color: muted }}>
                Welcome to your shop front
              </span>
            </div>
          )}

          {/* Notice bar */}
          {data.announcementEnabled && data.announcement ? (
            <div
              className={cn("flex items-center justify-center px-[6px] py-[3px]", card.card)}
              style={{ backgroundColor: `color-mix(in srgb, ${primary} 14%, transparent)` }}
            >
              <span className="truncate text-[5.5px] font-semibold" style={{ color: dark ? "#F1F5F9" : ink }}>
                {data.announcement}
              </span>
            </div>
          ) : null}

          {/* Offer banner */}
          {data.promoEnabled && data.promoTitle ? (
            <div
              className={cn("px-[8px] py-[5px]", card.card)}
              style={{
                background: `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 70%, black))`,
              }}
            >
              <p className="truncate text-[6.5px] font-bold leading-tight text-white">
                {data.promoTitle}
              </p>
              {data.promoSubtitle ? (
                <p className="mt-[1px] truncate text-[5px] font-medium text-white/80">
                  {data.promoSubtitle}
                </p>
              ) : null}
              {data.promoCoupon ? (
                <span className="mt-[3px] inline-flex items-center rounded-[3px] border border-dashed border-white/60 px-[4px] py-[1px] font-mono text-[5px] font-bold text-white">
                  {data.promoCoupon}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Shelves / products */}
          {data.productsEnabled ? (
            <div className={cn("grid grid-cols-3 gap-[4px]", card.card)}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn("flex flex-col gap-[2px] p-[4px]", card.card)}
                  style={{ backgroundColor: dark ? "rgba(127,127,127,0.18)" : "#FFFFFF" }}
                >
                  <span
                    className={cn("aspect-square w-full", card.card)}
                    style={{ backgroundColor: dark ? "rgba(127,127,127,0.25)" : "rgba(15,23,42,0.08)" }}
                  />
                  <span className="h-[3px] w-[80%] rounded-full" style={{ backgroundColor: dark ? "rgba(148,163,184,0.5)" : "rgba(15,23,42,0.16)" }} />
                  <span className="h-[3px] w-[55%] rounded-full" style={{ backgroundColor: dark ? "rgba(148,163,184,0.35)" : "rgba(15,23,42,0.12)" }} />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={cn("flex flex-1 basis-[22%] items-center justify-center rounded-[7px] border border-dashed px-[6px]", card.card)}
              style={{ borderColor: dark ? "rgba(148,163,184,0.4)" : "rgba(15,23,42,0.2)" }}
            >
              <span className="text-center text-[5.5px] font-medium leading-tight" style={{ color: muted }}>
                Shelves hidden — story &amp; contact only
              </span>
            </div>
          )}

          {/* Post sections */}
          {data.aboutEnabled ? (
            <div className={cn("px-[7px] py-[5px]", card.card)} style={{ backgroundColor: dark ? "rgba(127,127,127,0.18)" : "#FFFFFF" }}>
              <span className="block h-[3px] w-[45%] rounded-full" style={{ backgroundColor: dark ? "rgba(148,163,184,0.5)" : "rgba(15,23,42,0.18)" }} />
              <span className="mt-[3px] block h-[3px] w-[85%] rounded-full" style={{ backgroundColor: dark ? "rgba(148,163,184,0.3)" : "rgba(15,23,42,0.1)" }} />
              <span className="mt-[2px] block h-[3px] w-[70%] rounded-full" style={{ backgroundColor: dark ? "rgba(148,163,184,0.3)" : "rgba(15,23,42,0.1)" }} />
            </div>
          ) : null}

          {data.socialEnabled ? (
            <div className="flex items-center gap-[4px] px-[7px] py-[4px]">
              <span className="truncate text-[5.5px] font-semibold" style={{ color: ink }}>
                Follow us
              </span>
              <span className="ml-auto flex items-center gap-[3px]">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={cn("size-[7px]", data.radius === "round" ? "rounded-full" : "rounded-[2px]")} style={{ backgroundColor: primary }} />
                ))}
              </span>
            </div>
          ) : null}

          {data.contactEnabled ? (
            <div className={cn("flex items-center gap-[5px] px-[7px] py-[5px]", card.card)} style={{ backgroundColor: dark ? "rgba(127,127,127,0.18)" : "#FFFFFF" }}>
              <span className="size-[9px] shrink-0 rounded-full" style={{ backgroundColor: primary }} />
              <span className="flex-1">
                <span className="block h-[3px] w-[60%] rounded-full" style={{ backgroundColor: dark ? "rgba(148,163,184,0.45)" : "rgba(15,23,42,0.16)" }} />
                <span className="mt-[2px] block h-[3px] w-[40%] rounded-full" style={{ backgroundColor: dark ? "rgba(148,163,184,0.3)" : "rgba(15,23,42,0.1)" }} />
              </span>
              <span
                className={cn("inline-flex h-[11px] items-center px-[5px] text-[5px] font-bold leading-none", card.pill)}
                style={
                  data.buttons === "outline"
                    ? { border: "1px solid currentColor", color: ink }
                    : { backgroundColor: primary, color: "#FFFFFF" }
                }
              >
                Message
              </span>
            </div>
          ) : null}

          <div className="flex-1" />
        </div>
      </div>
    </div>
  );
}
