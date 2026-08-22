"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import type { StorefrontDesign } from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

function whatsAppOrderHref(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_STOREFRONT_WHATSAPP?.replace(/\D/g, "") ?? "";
  if (!raw) return null;
  const text = encodeURIComponent("Hi! I'd like to place an order.");
  return `https://wa.me/${raw}?text=${text}`;
}

function heroCtaStyle(
  primary: string | null,
  accent: string | null,
): CSSProperties | undefined {
  if (accent) {
    return { backgroundColor: accent, color: "#0f172a" };
  }
  if (primary) {
    return {
      backgroundColor: `color-mix(in srgb, ${primary} 42%, white)`,
      color: "#fff",
    };
  }
  return undefined;
}

export function ShopHeroMart({
  title,
  tagline,
  branchHint,
  areaLabel,
  primaryHex,
  accentHex,
  showcaseImage,
  logoUrl,
  heroBannerUrls,
  design,
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
  heroBannerUrls?: string[] | null;
  /** Merchant design overrides — the hero photo slot with focal point wins. */
  design?: StorefrontDesign | null;
}) {
  const wa = whatsAppOrderHref();
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim())
      ? accentHex.trim()
      : null;

  const heroBg = primary
    ? `color-mix(in srgb, ${primary} 82%, #020617)`
    : "#0f172a";
  const fadeEdge = primary
    ? `color-mix(in srgb, ${primary} 88%, #020617)`
    : "#0f172a";

  const headline =
    tagline?.trim() ||
    design?.business?.tagline?.trim() ||
    "Quality essentials, delivered.";
  const subhead = "Right to your door.";
  const area = areaLabel?.trim() || null;
  const description = design?.business?.description?.trim() || null;
  const body = description
    ? description
    : area
      ? `Fresh products, fair prices, and fast delivery — from your neighborhood store in ${area}, now online.`
      : "Fresh products, fair prices, and fast delivery — all from your neighborhood store, now online.";

  const banners = heroBannerUrls?.length ? heroBannerUrls : null;
  const designPhoto = design?.photos?.hero ?? null;
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

  return (
    <section
      className="overflow-hidden rounded-[4px] text-white shadow-[0_8px_28px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/10"
      style={{ backgroundColor: heroBg }}
    >
      <div className="grid min-h-[120px] grid-cols-1 md:min-h-[168px] md:grid-cols-[minmax(0,1fr)_1.15fr] lg:min-h-[188px]">
        {/* Copy */}
        <div className="relative z-10 flex flex-col justify-center gap-1.5 px-4 py-3.5 md:gap-2 md:px-5 md:py-4 lg:gap-2.5 lg:px-6 lg:py-5">
          <h1 className="font-heading text-[1.15rem] font-semibold leading-[1.12] tracking-[-0.025em] md:text-[1.35rem] lg:text-[1.65rem]">
            <span className="block text-white">{headline}</span>
            <span className="mt-0.5 block font-heading text-[0.95rem] font-medium italic tracking-[-0.01em] text-white/70 md:text-[1.05rem] lg:text-[1.15rem]">
              {subhead}
            </span>
          </h1>

          <p className="max-w-md text-[11px] leading-snug text-white/55 line-clamp-2 md:text-[12px]">
            {body}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Link
              href="#shop-catalog"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-[length:var(--sf-button-radius,3px)] px-3.5 text-[12px] font-semibold shadow-sm transition-[filter,transform] duration-200 hover:brightness-105 active:scale-[0.98]",
                !accent && !primary && "bg-sky-500 text-white",
              )}
              style={heroCtaStyle(primary, accent)}
            >
              Shop now
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-[length:var(--sf-button-radius,3px)] border border-white/22 bg-white/[0.06] px-3 text-[12px] font-semibold text-white transition-colors hover:border-white/35 hover:bg-white/10"
              >
                <MessageCircle className="size-3.5" aria-hidden />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        {/* Media — hidden on mobile when there's no banner */}
        <div
          className="group relative hidden min-h-0 w-full overflow-hidden md:block"
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
                    sizes="50vw"
                    className="object-cover scale-[1.02]"
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
              sizes="50vw"
              className="object-cover scale-[1.02]"
              unoptimized
            />
          ) : (
            <ShopWindowIllustration
              primary={primary}
              logoUrl={logoUrl}
              title={title}
              branchHint={branchHint}
            />
          )}

          {/* Soft seam: primary panel bleeds into the photo */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-[32%]"
            style={{
              background: `linear-gradient(90deg, ${fadeEdge} 0%, color-mix(in srgb, ${fadeEdge} 68%, transparent) 48%, transparent 100%)`,
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-[12%] bg-gradient-to-r from-black/25 to-transparent"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

function ShopWindowIllustration({
  primary,
  logoUrl,
  title,
  branchHint,
}: {
  primary: string | null;
  logoUrl: string | null | undefined;
  title: string;
  branchHint: string | null | undefined;
}) {
  return (
    <div className="relative flex h-full min-h-[140px] items-center justify-center bg-black/15">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={
          primary
            ? {
                background: `radial-gradient(circle at 50% 40%, ${primary}, transparent 68%)`,
              }
            : undefined
        }
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-2 px-4 py-6 text-center">
        <TenantLogo
          brand={title}
          logoUrl={logoUrl}
          primaryColor={primary}
          variant="storefront-hero"
        />
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
