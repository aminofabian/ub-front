"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { TenantLogo } from "@/components/brand/tenant-logo";
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
    return { backgroundColor: accent, color: "#fff" };
  }
  if (primary) {
    return {
      backgroundColor: `color-mix(in srgb, ${primary} 42%, white)`,
      color: "#fff",
    };
  }
  return undefined;
}

function accentLineColor(primary: string | null, accent: string | null): string {
  if (accent) return accent;
  if (primary) return `color-mix(in srgb, ${primary} 48%, white)`;
  return "#7dd3fc";
}

export function ShopHeroMart({
  title,
  tagline,
  branchHint,
  primaryHex,
  accentHex,
  showcaseImage,
  logoUrl,
  heroBannerUrls,
}: {
  title: string;
  tagline?: string | null;
  branchHint?: string | null;
  primaryHex: string | null;
  accentHex: string | null;
  showcaseImage?: string | null;
  logoUrl?: string | null;
  heroBannerUrls?: string[] | null;
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

  const headline = tagline?.trim() || "Quality essentials, delivered.";
  const subhead = "Right to your door.";
  const accentLine = accentLineColor(primary, accent);

  const banners = heroBannerUrls?.length ? heroBannerUrls : null;
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const goNext = useCallback(() => {
    if (!banners) return;
    setActiveIndex((prev) => (prev + 1) % banners.length);
  }, [banners]);

  const goPrev = useCallback(() => {
    if (!banners) return;
    setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners]);

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
      className="overflow-hidden rounded-lg text-white shadow-[0_2px_16px_-4px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
      style={{ backgroundColor: heroBg }}
    >
      <div className="flex flex-col sm:grid sm:min-h-[248px] sm:grid-cols-[minmax(0,1fr)_1.05fr]">
        {/* Copy */}
        <div className="relative z-10 flex flex-col justify-center gap-3 px-4 py-5 sm:gap-3.5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-white/15 bg-white/[0.07] px-2.5 py-1">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: accent ?? primary ?? "#38bdf8",
              }}
              aria-hidden
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
              {title}
            </span>
          </div>

          <h1 className="font-heading text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[1.85rem] lg:text-[2.15rem]">
            <span className="block text-white">{headline}</span>
            <span className="block" style={{ color: accentLine }}>
              {subhead}
            </span>
          </h1>

          <p className="max-w-md text-[12px] leading-relaxed text-white/60 sm:text-[13px]">
            Fresh products, fair prices, and fast delivery — all from your
            neighborhood store, now online.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Link
              href="#shop-catalog"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-[12px] font-semibold shadow-sm transition-[filter,transform] duration-200 hover:brightness-105 active:scale-[0.98] sm:h-10 sm:px-5 sm:text-[13px]",
                !accent && !primary && "bg-sky-400 text-white",
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
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/[0.06] px-4 text-[12px] font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/10 sm:h-10 sm:px-5 sm:text-[13px]"
              >
                <MessageCircle className="size-3.5" aria-hidden />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        {/* Media */}
        <div
          className="group relative aspect-[16/10] min-h-[168px] w-full overflow-hidden sm:aspect-auto sm:min-h-0"
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
          {banners ? (
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
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}

              {banners.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-md bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/55 sm:left-3 sm:size-9"
                    onClick={goPrev}
                    aria-label="Previous banner"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-md bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/55 sm:right-3 sm:size-9"
                    onClick={goNext}
                    aria-label="Next banner"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                  <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
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
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
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

          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/25 to-transparent sm:hidden"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 hidden w-12 bg-gradient-to-r from-[var(--hero-fade,#0f172a)] to-transparent sm:block"
            style={
              primary
                ? {
                    ["--hero-fade" as string]: `color-mix(in srgb, ${primary} 88%, #020617)`,
                  }
                : undefined
            }
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
    <div className="relative flex h-full min-h-[168px] items-center justify-center bg-black/15">
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
