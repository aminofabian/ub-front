"use client";

import {
  BadgePercent,
  Beer,
  Cookie,
  PenTool,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Wine,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { PublicCategory } from "@/lib/public-storefront";
import { shopListPath, storefrontCategoryPathSlug } from "@/lib/shop-url";
import { categoryIconImageUrl, cn } from "@/lib/utils";

const ICON_BY_KEYWORD: Array<{ test: RegExp; icon: LucideIcon }> = [
  { test: /drink|beverage|water|juice|soda/i, icon: Beer },
  { test: /house|clean|essent|hygiene|home/i, icon: Sparkles },
  { test: /station|office|paper|pen/i, icon: PenTool },
  { test: /snack|bite|cookie|candy|bakery|cereal/i, icon: Cookie },
  { test: /liquor|wine|spirit|alcohol/i, icon: Wine },
  { test: /cloth|fashion|wear|appar/i, icon: Shirt },
  { test: /offer|deal|sale|promo/i, icon: BadgePercent },
];

function pickIcon(name: string): LucideIcon {
  for (const m of ICON_BY_KEYWORD) {
    if (m.test.test(name)) return m.icon;
  }
  return ShoppingBasket;
}

function AisleCard({
  href,
  label,
  itemCount,
  Icon,
  customIconSrc,
  tint,
  tintFallback,
}: {
  href: string;
  label: string;
  itemCount?: number;
  Icon: LucideIcon;
  customIconSrc?: string | null;
  tint: string | null;
  tintFallback: string;
}) {
  const color = tint ?? tintFallback;
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex w-[7.25rem] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-border/70 hover:shadow-md sm:w-[8.25rem]",
      )}
    >
      <span
        className="relative flex h-16 items-center justify-center sm:h-[4.75rem]"
        style={{
          background: `linear-gradient(160deg, ${color}22 0%, ${color}0a 55%, transparent 100%)`,
        }}
      >
        <span
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, currentColor 1px, transparent 1.5px)",
            backgroundSize: "10px 10px",
            color,
          }}
          aria-hidden
        />
        {customIconSrc ? (
          <span className="relative h-10 w-10 overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5 sm:h-11 sm:w-11">
            <Image
              src={customIconSrc}
              alt=""
              fill
              className="object-cover"
              sizes="44px"
              unoptimized
            />
          </span>
        ) : (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11"
            style={{ color }}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-0.5 px-2.5 py-2.5">
        <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-foreground sm:text-[13px]">
          {label}
        </span>
        {typeof itemCount === "number" && itemCount >= 0 ? (
          <span className="text-[10px] tabular-nums text-muted-foreground/70">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function ShopAisleSlider({
  categories,
  primaryHex,
  accentHex,
}: {
  categories: PublicCategory[];
  primaryHex: string | null;
  accentHex: string | null;
}) {
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim())
      ? accentHex.trim()
      : null;

  if (categories.length === 0) return null;

  return (
    <div className="relative" aria-label="Shop by aisle">
      <div
        className={cn(
          "flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 sm:gap-3",
          "[scrollbar-width:thin] [-ms-overflow-style:auto]",
          "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
        )}
      >
        {categories.map((c, i) => {
          const Icon = pickIcon(c.name);
          const tint = i % 2 === 0 ? primary : accent;
          const tintFallback = i % 2 === 0 ? "var(--color-primary)" : "#0ea5e9";
          const customIconSrc = categoryIconImageUrl(c.icon ?? null);
          return (
            <AisleCard
              key={c.id}
              href={shopListPath({
                categoryPathSlug: storefrontCategoryPathSlug(c),
              })}
              label={c.name}
              itemCount={c.itemCount}
              Icon={Icon}
              customIconSrc={customIconSrc}
              tint={tint}
              tintFallback={tintFallback}
            />
          );
        })}
        {/* Trailing spacer so the last card isn't flush-clipped */}
        <div className="w-1 shrink-0 snap-end" aria-hidden />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[oklch(0.985_0.002_90)] to-transparent dark:from-background"
        aria-hidden
      />
    </div>
  );
}
