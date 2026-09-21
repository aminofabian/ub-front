"use client";

import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { ExternalLink, MapPin, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";
import { parseStorefrontHex } from "@/lib/storefront-theme";
import { cn } from "@/lib/utils";

export type SaTenantShopBrand = {
  displayName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  heroBannerUrls?: string[] | null;
};

const PAPER = "#f7f8fa";
const RULE = "#e6e8ec";
const FALLBACK_PRIMARY = "#2555a5";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SH";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/**
 * Storefront-shaped chrome for the SA tenant manage page — utility strip,
 * brand header, and hero — so operators feel which shop they are inside.
 */
export function SaTenantShopFrame({
  name,
  slug,
  shopUrl,
  locationHint,
  active,
  tier,
  onboardingStatus,
  brand,
  catalogHint,
  headerActions,
  heroActions,
  children,
}: {
  name: string;
  slug: string;
  shopUrl: string | null;
  locationHint?: string | null;
  active: boolean;
  tier?: string | null;
  onboardingStatus?: string | null;
  brand?: SaTenantShopBrand | null;
  catalogHint?: string | null;
  headerActions: ReactNode;
  heroActions: ReactNode;
  children: ReactNode;
}) {
  const title = (brand?.displayName?.trim() || name || "Tenant").trim();
  const primary =
    parseStorefrontHex(brand?.primaryColor) ?? FALLBACK_PRIMARY;
  const accent = parseStorefrontHex(brand?.accentColor);
  const logoUrl = brand?.logoUrl?.trim() || null;
  const heroUrl =
    brand?.heroBannerUrls?.find((u) => Boolean(u?.trim()))?.trim() || null;
  const hostLabel = slug
    ? `${slug}.${PLATFORM_DOMAIN}`
    : shopUrl?.replace(/^https?:\/\//, "") || "shop";

  return (
    <div
      className="-mx-4 overflow-hidden border border-[color-mix(in_srgb,var(--sa-shop-primary)_18%,transparent)] bg-[var(--sa-shop-paper)] sm:-mx-6 lg:rounded-[12px]"
      style={
        {
          "--sa-shop-primary": primary,
          "--sa-shop-accent": accent ?? primary,
          "--sa-shop-paper": PAPER,
          "--sa-shop-rule": RULE,
        } as CSSProperties
      }
    >
      {/* Utility strip — mirrors live storefront */}
      <div
        className="text-[11px] font-medium text-white/90"
        style={{ backgroundColor: primary }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">
              Managing{" "}
              <span className="font-semibold opacity-100">{title}</span>
              {locationHint?.trim() ? (
                <>
                  {" "}
                  · {locationHint.trim()}
                </>
              ) : null}
            </span>
          </div>
          <nav className="flex shrink-0 items-center gap-3">
            <Link
              href={APP_ROUTES.superAdminBusinesses}
              className="opacity-85 transition-opacity hover:opacity-100"
            >
              All tenants
            </Link>
            {shopUrl ? (
              <a
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold opacity-95 transition-opacity hover:opacity-100"
              >
                Open shop
                <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : null}
          </nav>
        </div>
      </div>

      {/* Brand header */}
      <div
        className="border-b bg-white"
        style={{ borderColor: "var(--sa-shop-rule)" }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-3.5 lg:flex-row lg:items-center lg:gap-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {logoUrl ? (
              <span
                className="relative size-11 shrink-0 overflow-hidden rounded-[10px] border bg-white sm:size-12"
                style={{ borderColor: "var(--sa-shop-rule)" }}
              >
                <Image
                  src={logoUrl}
                  alt=""
                  fill
                  className="object-contain p-1"
                  sizes="48px"
                  unoptimized
                />
              </span>
            ) : (
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold tracking-tight text-white sm:size-12"
                style={{ backgroundColor: primary }}
                aria-hidden
              >
                {initials(title)}
              </span>
            )}
            <div className="min-w-0">
              <p
                className="truncate text-[1.35rem] font-bold uppercase leading-none tracking-[-0.03em] sm:text-[1.55rem]"
                style={{ color: primary }}
              >
                {title}
              </p>
              <span
                className="mt-1.5 block h-[3px] w-10 rounded-full"
                style={{ backgroundColor: primary }}
                aria-hidden
              />
              <p className="mt-1.5 truncate font-mono text-[11px] text-[#5b6470]">
                {hostLabel}
                {tier ? ` · ${tier}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge
              variant={active ? "success" : "secondary"}
              className="rounded-[6px]"
            >
              {active ? "Active" : "Inactive"}
            </Badge>
            {onboardingStatus ? (
              <Badge variant="outline" className="rounded-[6px] capitalize">
                Onboarding · {onboardingStatus}
              </Badge>
            ) : null}
            {headerActions}
          </div>
        </div>

        {/* Search-shaped browse cue (non-functional — links to live shop) */}
        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
          {shopUrl ? (
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center gap-2 rounded-[10px] border bg-[#f0f2f5] pl-3.5 pr-1.5 text-sm text-[#6b7280] transition-colors hover:bg-[#e8ebf0]"
              style={{ borderColor: "var(--sa-shop-rule)" }}
            >
              <span className="min-w-0 flex-1 truncate text-left">
                Browse {title} as a shopper…
              </span>
              <span
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-white"
                style={{ backgroundColor: primary }}
              >
                <Search className="size-4" aria-hidden />
              </span>
            </a>
          ) : (
            <div
              className="flex h-11 items-center rounded-[10px] border bg-[#f0f2f5] px-3.5 text-sm text-[#6b7280]"
              style={{ borderColor: "var(--sa-shop-rule)" }}
            >
              No shop URL yet — add a primary domain below.
            </div>
          )}
        </div>
      </div>

      {/* Hero — storefront banner language */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: primary }}
      >
        <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="relative z-10 flex flex-col justify-center gap-4 px-4 py-8 text-white sm:px-6 sm:py-10">
            <div className="space-y-2">
              <h1 className="max-w-xl text-[1.65rem] font-bold leading-[1.15] tracking-[-0.03em] sm:text-[2rem]">
                Quality essentials, managed.
              </h1>
              <p className="text-[1.05rem] font-medium italic text-white/90">
                Right from this console.
              </p>
              <p className="max-w-lg text-sm leading-relaxed text-white/80">
                Pulse, people, domains, and plan for this shop — same brand the
                customer sees on the storefront
                {catalogHint ? ` · ${catalogHint}` : ""}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">{heroActions}</div>
          </div>

          <div className="relative min-h-[160px] lg:min-h-full">
            {heroUrl ? (
              <Image
                src={heroUrl}
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 40vw"
                unoptimized
              />
            ) : (
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage: `linear-gradient(135deg, color-mix(in srgb, white 22%, transparent), transparent 55%), radial-gradient(circle at 70% 40%, color-mix(in srgb, white 28%, transparent), transparent 50%)`,
                }}
                aria-hidden
              />
            )}
            <div
              className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--sa-shop-primary)] to-transparent lg:w-32"
              aria-hidden
            />
          </div>
        </div>
      </section>

      {/* Body — catalog paper ground */}
      <div
        className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-6"
        style={{ backgroundColor: "var(--sa-shop-paper)" }}
      >
        {children}
      </div>
    </div>
  );
}

export function SaShopPanel({
  title,
  description,
  children,
  className,
  headerRight,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[10px] border bg-white shadow-[0_1px_2px_rgba(21,35,31,0.04)]",
        className,
      )}
      style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
    >
      <div
        className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3.5 sm:px-5"
        style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
      >
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[#15231f]">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#5b6470]">
              {description}
            </p>
          ) : null}
        </div>
        {headerRight}
      </div>
      {children}
    </section>
  );
}

export function SaShopHeroButton({
  children,
  tone = "solid",
  ...props
}: Omit<ComponentProps<typeof Button>, "variant"> & {
  tone?: "solid" | "ghost";
}) {
  if (tone === "ghost") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 rounded-[8px] border-white/55 bg-transparent text-white hover:bg-white/10 hover:text-white"
        {...props}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button
      type="button"
      size="sm"
      className="h-9 rounded-[8px] border-0 bg-[#dbe7ff] font-semibold text-[#143a7a] shadow-none hover:bg-white"
      {...props}
    >
      {children}
    </Button>
  );
}
