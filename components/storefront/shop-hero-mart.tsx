"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Store,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

function whatsAppOrderHref(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_STOREFRONT_WHATSAPP?.replace(/\D/g, "") ?? "";
  if (!raw) return null;
  const text = encodeURIComponent("Hi! I'd like to place an order.");
  return `https://wa.me/${raw}?text=${text}`;
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

  const heroSurfaces = primary
    ? ({
        "--hero-bg": `color-mix(in srgb, ${primary} 72%, rgb(2 6 23))`,
        "--hero-panel-from": `color-mix(in srgb, ${primary} 48%, rgb(2 6 23))`,
        "--hero-panel-to": `color-mix(in srgb, ${primary} 14%, rgb(2 6 23))`,
        "--hero-fade-edge": `color-mix(in srgb, ${primary} 78%, rgb(2 6 23))`,
      } as Record<string, string>)
    : undefined;

  const headline = tagline?.trim() || "Everyday Essentials.";
  const subhead = "Close to You.";

  // --- Carousel state ---
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

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const timer = setInterval(goNext, 5000);
    return () => clearInterval(timer);
  }, [banners, goNext]);

  // Reset active index when banners change
  useEffect(() => {
    setActiveIndex(0);
  }, [banners]);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-xl text-white shadow-sm",
        !primary && "bg-[#0b1d12]",
      )}
      style={
        primary
          ? { ...heroSurfaces, backgroundColor: "var(--hero-bg)" }
          : undefined
      }
    >
      <div className="grid min-h-[200px] gap-0 sm:min-h-[240px] sm:grid-cols-[1fr_1.2fr]">
        {/* Left — copy */}
        <div className="relative z-10 flex flex-col justify-center gap-3 px-5 py-6 sm:px-8 sm:py-8">
          <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            <span className="block">{headline}</span>
            <span
              className="block"
              style={
                accent
                  ? { color: accent }
                  : primary
                    ? { color: `color-mix(in srgb, ${primary} 55%, white)` }
                    : { color: "#f59e0b" }
              }
            >
              {subhead}
            </span>
          </h1>
          <p className="max-w-xs text-xs leading-relaxed text-white/70 sm:text-sm">
            Quality products, low prices, delivered fast.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href="#shop-catalog"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-5 text-xs font-semibold shadow-sm transition hover:brightness-110",
                !accent && !primary && "bg-amber-500 text-white",
              )}
              style={
                accent
                  ? { backgroundColor: accent, color: "#fff" }
                  : primary
                    ? {
                        backgroundColor: `color-mix(in srgb, ${primary} 82%, white)`,
                        color: `color-mix(in srgb, ${primary} 8%, rgb(2 6 23))`,
                      }
                    : undefined
              }
            >
              Shop Now
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/25 bg-white/5 px-4 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        {/* Right — showcase / carousel */}
        <div
          className={cn(
            "group relative min-h-[160px] overflow-hidden sm:min-h-0",
            !primary && "bg-gradient-to-br from-[#1f3a26] to-[#0b1d12]",
          )}
          style={
            primary
              ? {
                  background: `linear-gradient(to bottom right, var(--hero-panel-from), var(--hero-panel-to))`,
                }
              : undefined
          }
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
              {/* Banner slides */}
              {banners.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className={cn(
                    "absolute inset-0 transition-opacity duration-700",
                    i === activeIndex
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none",
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

              {/* Navigation arrows */}
              {banners.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-opacity"
                    onClick={goPrev}
                    aria-label="Previous banner"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-opacity"
                    onClick={goNext}
                    aria-label="Next banner"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {banners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={cn(
                        "size-2 rounded-full transition-all",
                        i === activeIndex
                          ? "bg-white scale-110"
                          : "bg-white/50 hover:bg-white/70",
                      )}
                      onClick={() => setActiveIndex(i)}
                      aria-label={`Go to banner ${i + 1}`}
                    />
                  ))}
                </div>
              )}
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
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r to-transparent sm:w-16",
              !primary && "from-[#0b1d12]",
            )}
            style={
              primary
                ? {
                    background: `linear-gradient(to right, var(--hero-fade-edge), transparent)`,
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
    <div className="relative flex h-full items-center justify-center">
      <div
        className="absolute inset-0 opacity-30"
        style={
          primary
            ? {
                background: `radial-gradient(circle at 70% 50%, ${primary} 0%, transparent 65%)`,
              }
            : undefined
        }
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-2 px-4 text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="max-h-12 w-auto max-w-[10rem] rounded-lg bg-white/95 p-1.5 object-contain shadow-md"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Store className="h-6 w-6" />
          </span>
        )}
        <p className="text-sm font-semibold tracking-tight text-white">
          {title}
        </p>
        {branchHint ? (
          <p className="text-[11px] text-white/60">From {branchHint}</p>
        ) : (
          <p className="text-[11px] text-white/60">
            Local prices · Same-day pickup
          </p>
        )}
      </div>
    </div>
  );
}
