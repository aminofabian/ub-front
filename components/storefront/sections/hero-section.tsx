"use client";

import {
  ArrowRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { StorefrontEditableLogo } from "@/components/storefront/storefront-editable-logo";
import { useStorefrontBrandMarks } from "@/components/storefront/storefront-brand-marks";
import { StorefrontInlineText } from "@/components/storefront/storefront-inline-text";
import { whatsappHref } from "@/components/storefront/sections/shared";
import {
  StorefrontQuickEditTarget,
  useStorefrontLiveDesign,
  useStorefrontStaffEditOptional,
} from "@/components/storefront/storefront-staff-edit";
import { resolveHeroLogo } from "@/lib/branding-themed-logo";
import { readableInkOn } from "@/lib/color-contrast";
import type {
  StorefrontDesign,
  StorefrontDesignButtons,
  StorefrontHeroSectionHeight,
  StorefrontHeroSectionOverlay,
} from "@/lib/storefront-design";
import { normalizeWhatsApp } from "@/lib/whatsapp-order";
import { cn } from "@/lib/utils";

function whatsAppOrderHref(): string | null {
  const digits = normalizeWhatsApp(process.env.NEXT_PUBLIC_STOREFRONT_WHATSAPP);
  if (!digits) return null;
  const text = encodeURIComponent("Hi! I'd like to place an order.");
  return `https://wa.me/${digits}?text=${text}`;
}

const HERO_HEIGHT_CLASSES: Record<
  StorefrontHeroSectionHeight,
  string
> = {
  small: "min-h-[92px] md:min-h-[128px] lg:min-h-[140px]",
  medium: "min-h-[120px] md:min-h-[168px] lg:min-h-[188px]",
  large: "min-h-[168px] md:min-h-[220px] lg:min-h-[252px]",
};

/** Taller first-viewport presence for fashion / editorial store themes. */
const EDITORIAL_HERO_HEIGHT_CLASSES: Record<
  StorefrontHeroSectionHeight,
  string
> = {
  small: "min-h-[260px] md:min-h-[380px] lg:min-h-[440px]",
  medium: "min-h-[320px] md:min-h-[480px] lg:min-h-[560px]",
  large: "min-h-[380px] md:min-h-[560px] lg:min-h-[640px]",
};

const HERO_OVERLAY_CLASSES: Record<StorefrontHeroSectionOverlay, string> = {
  none: "",
  light: "bg-white/15",
  dark: "bg-black/30",
};

function hexLuminance(hex: string): number | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const ch = (shift: number) => {
    const v = ((n >> shift) & 255) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0);
}

/** WCAG contrast between two solid colours; null when either is unparseable. */
function contrastRatio(a: string, b: string): number | null {
  const la = hexLuminance(a);
  const lb = hexLuminance(b);
  if (la == null || lb == null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function heroCtaStyle(
  primary: string | null,
  accent: string | null,
  outline = false,
  panelBg?: string,
): CSSProperties | undefined {
  if (outline) {
    return { backgroundColor: "transparent", color: "#fff" };
  }
  // A merchant accent can land within a hair of the panel colour (dark olive on
  // ink). The fill then stops reading as a button, so fall back to paper.
  const accentOnPanel =
    accent && panelBg ? contrastRatio(accent, panelBg) : null;
  if (accent && (accentOnPanel == null || accentOnPanel >= 2.4)) {
    return {
      backgroundColor: accent,
      color: readableInkOn(accent),
    };
  }
  if (accentOnPanel != null) {
    return { backgroundColor: "#ffffff", color: "#0e0e0e" };
  }
  if (primary) {
    const fill = `color-mix(in srgb, ${primary} 42%, white)`;
    return {
      backgroundColor: fill,
      color: readableInkOn(primary),
    };
  }
  return undefined;
}

/**
 * The merchant's hero — theme-agnostic. Rendered in place of a theme's own
 * hero when the merchant enables the `hero` section, so their headline, photo,
 * focal point and buttons look the same whichever theme surrounds them.
 */
export function StorefrontHeroSection({
  title,
  tagline,
  branchHint,
  areaLabel,
  primaryHex,
  accentHex,
  showcaseImage,
  logoUrl,
  logoDarkUrl,
  heroBannerUrls,
  design,
  subheadline,
  height = "medium",
  overlay = "none",
  showCta = true,
  showWhatsapp = true,
  buttons = "solid",
  whatsappNumber,
  ctaAnchor = "#shop-catalog",
  chrome = "default",
}: {
  title: string;
  tagline?: string | null;
  branchHint?: string | null;
  /** Shopper-facing locality for body copy (e.g. "Mirema Drive"). */
  areaLabel?: string | null;
  primaryHex: string | null;
  accentHex: string | null;
  showcaseImage?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  heroBannerUrls?: string[] | null;
  /** Merchant design overrides — the hero photo slot with focal point wins. */
  design?: StorefrontDesign | null;
  /** Hero-section copy override; empty = business tagline, then a default. */
  subheadline?: string | null;
  height?: StorefrontHeroSectionHeight;
  overlay?: StorefrontHeroSectionOverlay;
  showCta?: boolean;
  showWhatsapp?: boolean;
  buttons?: StorefrontDesignButtons;
  /** Business WhatsApp (from the profile) — env var used only as a fallback. */
  whatsappNumber?: string | null;
  /** Anchor the “Shop now” CTA scrolls to (theme catalog section). */
  ctaAnchor?: string;
  /** `editorial` = full-bleed fashion masthead (no grocery card chrome). */
  chrome?: "default" | "editorial";
}) {
  const editorial = chrome === "editorial";
  const heightClasses = editorial
    ? EDITORIAL_HERO_HEIGHT_CLASSES
    : HERO_HEIGHT_CLASSES;
  const wa =
    whatsappHref(whatsappNumber, "Hi! I'd like to place an order.") ??
    whatsAppOrderHref();
  const liveDesign = useStorefrontLiveDesign(design ?? null);

  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim())
      ? accentHex.trim()
      : null;

  // Light merchant yellows/creams turn muddy when mixed into the grocery hero
  // panel — editorial chrome falls back to ink so the photo stays the star.
  const lightBrand = primary ? readableInkOn(primary) !== "#ffffff" : false;
  const heroBg =
    editorial && lightBrand
      ? "#0e0e0e"
      : primary
        ? `color-mix(in srgb, ${primary} 82%, #020617)`
        : "#0f172a";
  const fadeEdge =
    editorial && lightBrand
      ? "#0e0e0e"
      : primary
        ? `color-mix(in srgb, ${primary} 88%, #020617)`
        : "#0f172a";

  const headline = tagline?.trim() || "Quality essentials, delivered.";
  const subhead =
    subheadline?.trim() ||
    liveDesign?.business?.tagline?.trim() ||
    "Right to your door.";
  const area = areaLabel?.trim() || null;
  const description = liveDesign?.business?.description?.trim() || null;
  const body = description
    ? description
    : area
      ? `Fresh products, fair prices, and fast delivery — from your neighborhood store in ${area}, now online.`
      : "Fresh products, fair prices, and fast delivery — all from your neighborhood store, now online.";

  const banners = heroBannerUrls?.length ? heroBannerUrls : null;
  const designPhoto = liveDesign?.photos?.hero ?? null;
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const goNext = () => {
    if (!banners) return;
    setActiveIndex((prev) => (prev + 1) % banners.length);
  };

  const goPrev = () => {
    if (!banners) return;
    setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const timer = setInterval(goNext, 5000);
    return () => clearInterval(timer);
  }, [banners, goNext]);

  useEffect(() => {
    setActiveIndex(0);
  }, [banners]);

  const staff = useStorefrontStaffEditOptional();
  const marks = useStorefrontBrandMarks({ logoUrl, logoDarkUrl });
  const heroLogo = resolveHeroLogo(marks);

  return (
    <StorefrontQuickEditTarget field="hero" label="hero headline">
    <section
      className={cn(
        "relative overflow-hidden text-white",
        editorial
          ? "rounded-none shadow-none ring-0"
          : "rounded-[4px] shadow-[0_8px_28px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/10",
      )}
      style={{ backgroundColor: heroBg }}
    >
      {staff?.editMode ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            staff.openHeroPhoto();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-3 left-3 z-30 inline-flex items-center gap-1.5 rounded-md border border-white/40 bg-black/55 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-black/70"
          aria-label="Edit hero photo"
        >
          <Camera className="size-3.5" aria-hidden />
          Photo
        </button>
      ) : null}
      <div
        className={cn(
          editorial
            ? "grid grid-cols-1 md:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]"
            : "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_1.15fr]",
          heightClasses[height],
        )}
      >
        {/* Copy */}
        <div
          className={cn(
            "relative z-10 flex flex-col justify-center",
            editorial
              ? "gap-3.5 px-6 py-10 md:gap-4 md:px-10 md:py-14 lg:px-[clamp(2.5rem,4.2vw,4.5rem)] lg:py-16"
              : "gap-1.5 px-4 py-3.5 md:gap-2 md:px-5 md:py-4 lg:gap-2.5 lg:px-6 lg:py-5",
          )}
        >
          <h1
            className={cn(
              "font-heading",
              editorial
                ? "max-w-[24ch] text-[2.1rem] font-normal italic leading-[1.04] tracking-[-0.03em] md:text-[2.8rem] lg:text-[3.25rem]"
                : "text-[1.15rem] font-semibold leading-[1.12] tracking-[-0.025em] md:text-[1.35rem] lg:text-[1.65rem]",
            )}
          >
            <StorefrontInlineText
              as="span"
              className="block text-white"
              value={headline}
              placeholder="Add a headline"
              onCommit={(next) => {
                void staff?.commitInlineField("hero", { headline: next });
              }}
            >
              <span className="block text-white">{headline}</span>
            </StorefrontInlineText>
            <StorefrontInlineText
              as="span"
              className={cn(
                "block font-heading tracking-[-0.01em] text-white/70",
                editorial
                  ? "mt-4 max-w-[24rem] border-t border-white/20 pt-3.5 text-[0.7rem] font-medium not-italic uppercase leading-[1.7] tracking-[0.18em] md:mt-5 md:pt-4 md:text-[0.74rem]"
                  : "mt-0.5 text-[0.95rem] font-medium italic md:text-[1.05rem] lg:text-[1.15rem]",
              )}
              value={subhead}
              placeholder="Add a subheadline"
              onCommit={(next) => {
                void staff?.commitInlineField("hero", { subheadline: next });
              }}
            >
              <span
                className={cn(
                  "block font-heading tracking-[-0.01em] text-white/70",
                  editorial
                    ? "mt-4 max-w-[24rem] border-t border-white/20 pt-3.5 text-[0.7rem] font-medium not-italic uppercase leading-[1.7] tracking-[0.18em] md:mt-5 md:pt-4 md:text-[0.74rem]"
                    : "mt-0.5 text-[0.95rem] font-medium italic md:text-[1.05rem] lg:text-[1.15rem]",
                )}
              >
                {subhead}
              </span>
            </StorefrontInlineText>
          </h1>

          <StorefrontInlineText
            as="p"
            multiline
            className={cn(
              editorial
                ? "max-w-[40ch] text-[13px] leading-[1.75] text-white/60 line-clamp-3 md:text-[13.5px]"
                : "max-w-md text-[11px] leading-snug text-white/55 md:text-[12px]",
            )}
            value={body}
            placeholder="Add a short intro"
            onCommit={(next) => {
              void staff?.commitInlineField("about", { text: next });
            }}
          >
            <p
              className={cn(
                editorial
                  ? "max-w-[40ch] text-[13px] leading-[1.75] text-white/60 line-clamp-3 md:text-[13.5px]"
                  : "max-w-md text-[11px] leading-snug text-white/55 line-clamp-2 md:text-[12px]",
              )}
            >
              {body}
            </p>
          </StorefrontInlineText>

          <div
            className={cn(
              "flex flex-wrap items-center",
              editorial ? "gap-2.5 pt-3" : "gap-2 pt-0.5",
            )}
          >
            {showCta ? (
              <Link
                href={ctaAnchor}
                className={cn(
                  "inline-flex items-center gap-1.5 font-semibold transition-[filter,transform,background-color,border-color] duration-200 active:scale-[0.98]",
                  editorial
                    ? "h-11 rounded-none px-5 text-[11px] font-medium uppercase tracking-[0.14em]"
                    : "h-8 rounded-[length:var(--sf-button-radius,3px)] px-3.5 text-[12px]",
                  buttons === "outline"
                    ? "border-2 border-white/70 bg-transparent text-white hover:bg-white/10"
                    : "shadow-sm hover:brightness-105",
                  !accent && !primary && !(buttons === "outline") && "bg-sky-500 text-white",
                )}
                style={heroCtaStyle(primary, accent, buttons === "outline", heroBg)}
              >
                Shop now
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            ) : null}
            {showWhatsapp && wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 border border-white/22 bg-white/[0.06] font-semibold text-white transition-colors hover:border-white/35 hover:bg-white/10",
                  editorial
                    ? "h-11 rounded-none px-4 text-[11px] font-medium uppercase tracking-[0.14em]"
                    : "h-8 rounded-[length:var(--sf-button-radius,3px)] px-3 text-[12px]",
                )}
              >
                <MessageCircle className="size-3.5" aria-hidden />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        {/* Media — the editorial masthead keeps its photo on phones too */}
        <div
          className={cn(
            "group relative min-h-0 w-full overflow-hidden",
            editorial
              ? "block aspect-[4/5] md:aspect-auto md:h-full"
              : "hidden md:block",
          )}
          onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStart === null || !banners) return;
            const diff = e.changedTouches[0].clientX - touchStart;
            if (Math.abs(diff) > 40) {
              if (diff < 0) goNext();
              else goPrev();
            }
            setTouchStart(null);
          }}
        >
          {designPhoto ? (
            <Image
              src={designPhoto.url}
              alt=""
              fill
              priority
              sizes="50vw"
              unoptimized
              className="scale-[1.02]"
              style={{
                objectFit: designPhoto.fit,
                objectPosition: `${designPhoto.focalX}% ${designPhoto.focalY}%`,
              }}
            />
          ) : banners ? (
            <>
              {banners.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className={cn(
                    "absolute inset-0 transition-opacity duration-500 ease-out",
                    i === activeIndex
                      ? "opacity-100"
                      : "pointer-events-none opacity-0",
                  )}
                  aria-hidden={i !== activeIndex}
                >
                  <Image
                    src={url}
                    alt={`Banner ${i + 1}`}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 768px) 55vw, 100vw"
                    className={cn(
                      "scale-[1.02] object-cover",
                      editorial && "object-[50%_32%]",
                    )}
                    unoptimized
                  />
                </div>
              ))}

              {banners.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-[3px] bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/55"
                    onClick={goPrev}
                    aria-label="Previous banner"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-[3px] bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/55"
                    onClick={goNext}
                    aria-label="Next banner"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                  <div className="absolute bottom-3.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
                    {banners.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={cn(
                          "rounded-full transition-all duration-300",
                          i === activeIndex
                            ? "h-1.5 w-4 bg-white"
                            : "size-1.5 bg-white/45 hover:bg-white/65",
                        )}
                        onClick={() => setActiveIndex(i)}
                        aria-label={`Go to banner ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : showcaseImage ? (
            <Image
              src={showcaseImage}
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 55vw, 100vw"
              className={cn(
                "scale-[1.02] object-cover",
                editorial && "object-[50%_32%]",
              )}
              unoptimized
            />
          ) : (
            <ShopWindowIllustration
              primary={primary}
              logoUrl={heroLogo.url}
              knockout={heroLogo.knockout}
              title={title}
              branchHint={branchHint}
            />
          )}

          {/* Soft seam: primary panel bleeds into the photo (desktop only) */}
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-[32%]",
              editorial && "hidden md:block",
            )}
            style={{
              background: `linear-gradient(90deg, ${fadeEdge} 0%, color-mix(in srgb, ${fadeEdge} 68%, transparent) 48%, transparent 100%)`,
            }}
            aria-hidden
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-[12%] bg-gradient-to-r from-black/25 to-transparent",
              editorial && "hidden md:block",
            )}
            aria-hidden
          />
          {overlay !== "none" ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-0",
                HERO_OVERLAY_CLASSES[overlay],
              )}
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </section>
    </StorefrontQuickEditTarget>
  );
}

function ShopWindowIllustration({
  primary,
  logoUrl,
  knockout,
  title,
  branchHint,
}: {
  primary: string | null;
  logoUrl: string | null | undefined;
  knockout: boolean;
  title: string;
  branchHint: string | null | undefined;
}) {
  return (
    <div className="relative flex h-full min-h-[140px] items-center justify-center bg-black/20">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={
          primary
            ? {
                background: `radial-gradient(circle at 50% 38%, color-mix(in srgb, ${primary} 55%, transparent), transparent 62%)`,
              }
            : undefined
        }
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-2.5 px-4 py-6 text-center">
        <div className="flex size-[6.75rem] items-center justify-center rounded-full bg-white/8 ring-1 ring-white/16 backdrop-blur-[2px]">
          <StorefrontEditableLogo
            brand={title}
            logoUrl={logoUrl}
            primaryColor={primary}
            variant="storefront-hero"
            className={knockout ? "brightness-0 invert" : undefined}
          />
        </div>
        <p className="font-heading text-lg font-semibold tracking-tight text-white">
          {title}
        </p>
        <p className="text-[11px] text-white/55">
          {branchHint ? `From ${branchHint}` : "Local prices · Same-day pickup"}
        </p>
      </div>
    </div>
  );
}
