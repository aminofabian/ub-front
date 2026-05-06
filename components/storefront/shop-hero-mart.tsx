import { ArrowRight, MessageCircle, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

function whatsAppOrderHref(): string | null {
  const raw = process.env.NEXT_PUBLIC_STOREFRONT_WHATSAPP?.replace(/\D/g, "") ?? "";
  if (!raw) {
    return null;
  }
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
}: {
  title: string;
  tagline?: string | null;
  branchHint?: string | null;
  primaryHex: string | null;
  accentHex: string | null;
  /** Optional photo for the right panel (uses tenant featured product if present). */
  showcaseImage?: string | null;
  logoUrl?: string | null;
}) {
  const wa = whatsAppOrderHref();
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim()) ? primaryHex.trim() : null;
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;

  /** Dark hero surfaces derived from tenant primary (falls back to fixed greens in className). */
  const heroSurfaces = primary
    ? ({
        "--hero-bg": `color-mix(in srgb, ${primary} 72%, rgb(2 6 23))`,
        "--hero-panel-from": `color-mix(in srgb, ${primary} 48%, rgb(2 6 23))`,
        "--hero-panel-to": `color-mix(in srgb, ${primary} 14%, rgb(2 6 23))`,
        "--hero-fade-edge": `color-mix(in srgb, ${primary} 78%, rgb(2 6 23))`,
      } as Record<string, string>)
    : undefined;

  const headline = tagline?.trim() || `Everyday Essentials.`;
  const subhead = "Close to You.";
  const body =
    "Quality products, low prices,\ndelivered fast to your doorstep.";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl text-white shadow-xl",
        !primary && "bg-[#0b1d12]",
      )}
      style={
        primary
          ? { ...heroSurfaces, backgroundColor: "var(--hero-bg)" }
          : undefined
      }
    >
      <div className="grid min-h-[260px] gap-0 sm:min-h-[300px] sm:grid-cols-[1.05fr_1.4fr]">
        <div className="relative z-10 flex flex-col justify-center gap-5 px-6 py-8 sm:px-10 sm:py-10">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            <span className="block">{headline}</span>
            <span
              className="block"
              style={
                accent
                  ? { color: accent }
                  : primary
                    ? { color: `color-mix(in srgb, ${primary} 55%, white)` }
                    : { color: "#fb923c" }
              }
            >
              {subhead}
            </span>
          </h1>
          <p className="max-w-md whitespace-pre-line text-sm leading-relaxed text-white/80 sm:text-base">
            {body}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="#shop-catalog"
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold shadow-md transition hover:brightness-110",
                !accent && !primary && "bg-orange-500 text-white",
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
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Order on WhatsApp
              </a>
            ) : null}
          </div>
          <div className="mt-4 flex items-center gap-1.5 sm:mt-6">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn("h-1.5 rounded-full transition-all", i === 0 ? "w-6" : "w-1.5")}
                style={
                  i === 0
                    ? {
                        backgroundColor: accent
                          ? accent
                          : primary
                            ? `color-mix(in srgb, white 88%, ${primary})`
                            : "rgb(255 255 255)",
                      }
                    : { backgroundColor: "rgb(255 255 255 / 0.35)" }
                }
                aria-hidden
              />
            ))}
            <span className="sr-only">Slide 1 of 4</span>
          </div>
        </div>
        <div
          className={cn(
            "relative min-h-[200px] overflow-hidden",
            !primary && "bg-gradient-to-br from-[#1f3a26] to-[#0b1d12]",
          )}
          style={
            primary
              ? {
                  background: `linear-gradient(to bottom right, var(--hero-panel-from), var(--hero-panel-to))`,
                }
              : undefined
          }
        >
          {showcaseImage ? (
            <Image
              src={showcaseImage}
              alt=""
              fill
              priority
              sizes="(max-width: 640px) 100vw, 60vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <ShopWindowIllustration primary={primary} logoUrl={logoUrl} title={title} branchHint={branchHint} />
          )}
          {/* Soft inset edge to blend dark panel into image */}
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r to-transparent sm:w-24",
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
        className="absolute inset-0 opacity-40"
        style={
          primary
            ? {
                background: `radial-gradient(circle at 70% 50%, ${primary} 0%, transparent 65%)`,
              }
            : undefined
        }
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="max-h-16 w-auto max-w-[12rem] rounded-lg bg-white/95 p-2 object-contain shadow-md"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <Store className="h-8 w-8" aria-hidden />
          </span>
        )}
        <p className="text-lg font-semibold tracking-tight text-white">{title}</p>
        {branchHint ? (
          <p className="text-xs text-white/70">From {branchHint}</p>
        ) : (
          <p className="text-xs text-white/70">Local prices · Same-day pickup</p>
        )}
      </div>
    </div>
  );
}
