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
        "--hero-bg": `color-mix(in srgb, ${primary} 78%, #020617)`,
        "--hero-panel-from": `color-mix(in srgb, ${primary} 52%, #020617)`,
        "--hero-panel-to": `color-mix(in srgb, ${primary} 16%, #020617)`,
        "--hero-fade-edge": `color-mix(in srgb, ${primary} 82%, #020617)`,
        "--hero-glow": `${primary}30`,
      } as Record<string, string>)
    : undefined;

  const headline = tagline?.trim() || "Quality essentials, delivered.";
  const subhead = "Right to your door.";

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
      className={cn(
        "relative overflow-hidden rounded-2xl text-white shadow-lg shadow-black/10",
        !primary && "bg-[#0a1020]",
      )}
      style={
        primary
          ? { ...heroSurfaces, backgroundColor: "var(--hero-bg)" }
          : undefined
      }
    >
      {/* ── Atmosphere glow ── */}
      <div
        className="pointer-events-none absolute -right-[15%] -top-[20%] h-[280px] w-[280px] rounded-full blur-3xl opacity-30"
        style={{
          background: primary
            ? `radial-gradient(circle, var(--hero-glow), transparent 70%)`
            : "radial-gradient(circle, rgba(245,158,11,0.18), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="grid min-h-[220px] gap-0 sm:min-h-[260px] sm:grid-cols-[1fr_1.15fr]">
        {/* ── Left — copy ── */}
        <div className="relative z-10 flex flex-col justify-center gap-4 px-6 py-7 sm:px-8 sm:py-9">
          {/* Brand badge */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 backdrop-blur-sm">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={
                accent
                  ? { backgroundColor: accent }
                  : primary
                    ? {
                        backgroundColor: `color-mix(in srgb, ${primary} 60%, white)`,
                      }
                    : { backgroundColor: "#f59e0b" }
              }
              aria-hidden
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
              {title}
            </span>
          </div>

          <h1 className="text-2xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-3xl lg:text-[2.2rem]">
            <span className="block">{headline}</span>
            <span
              className="block"
              style={
                accent
                  ? { color: accent }
                  : primary
                    ? { color: `color-mix(in srgb, ${primary} 50%, white)` }
                    : { color: "#f59e0b" }
              }
            >
              {subhead}
            </span>
          </h1>

          <p className="max-w-sm text-[13px] leading-relaxed text-white/55 sm:text-sm">
            Fresh products, fair prices, and fast delivery — all from your
            neighborhood store, now online.
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="#shop-catalog"
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl px-5 text-[13px] font-semibold shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                !accent && !primary && "bg-amber-500 text-white",
              )}
              style={
                accent
                  ? { backgroundColor: accent, color: "#fff" }
                  : primary
                    ? {
                        backgroundColor: `color-mix(in srgb, ${primary} 75%, white)`,
                        color: `color-mix(in srgb, ${primary} 5%, #020617)`,
                      }
                    : undefined
              }
            >
              Shop now
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/18 bg-white/5 px-5 text-[13px] font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/25 hover:-translate-y-0.5"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        {/* ── Right — showcase / carousel ── */}
        <div
          className={cn(
            "group relative min-h-[180px] overflow-hidden sm:min-h-0",
            !primary && "bg-gradient-to-br from-[#142238] to-[#0a1020]",
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
                    className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 hover:bg-black/50 hover:scale-105"
                    onClick={goPrev}
                    aria-label="Previous banner"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 hover:bg-black/50 hover:scale-105"
                    onClick={goNext}
                    aria-label="Next banner"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {banners.length > 1 && (
                <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        i === activeIndex
                          ? "w-5 bg-white"
                          : "w-2 bg-white/40 hover:bg-white/60",
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

          {/* Edge fade */}
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r to-transparent",
              !primary && "from-[#0a1020]",
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
        className="absolute inset-0 opacity-25"
        style={
          primary
            ? {
                background: `radial-gradient(circle at 70% 50%, ${primary} 0%, transparent 65%)`,
              }
            : undefined
        }
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-3 px-4 text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="max-h-14 w-auto max-w-[11rem] rounded-xl bg-white/95 p-2 object-contain shadow-lg"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8 ring-1 ring-white/15 backdrop-blur-sm">
            <Store className="h-7 w-7" />
          </span>
        )}
        <p className="text-base font-bold tracking-tight text-white">{title}</p>
        {branchHint ? (
          <p className="text-[12px] text-white/50">From {branchHint}</p>
        ) : (
          <p className="text-[12px] text-white/50">
            Local prices · Same-day pickup
          </p>
        )}
      </div>
    </div>
  );
}
