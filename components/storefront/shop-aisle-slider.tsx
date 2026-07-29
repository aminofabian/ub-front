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
        "group relative flex w-[6.75rem] shrink-0 snap-start flex-col overflow-hidden rounded-[3px] border border-[var(--storefront-card-border,#e2e5e2)] bg-[var(--storefront-paper-elevated,#fff)] transition-[border-color,box-shadow,transform] duration-200",
        "hover:border-[var(--storefront-card-border-hover,#c8cdc8)] hover:shadow-[0_4px_14px_-6px_rgba(20,24,22,0.14)] sm:w-[7.75rem]",
      )}
    >
      <span
        className="relative flex h-[4.25rem] items-center justify-center sm:h-[4.75rem]"
        style={{
          background: `linear-gradient(165deg, color-mix(in srgb, ${color} 14%, transparent) 0%, transparent 72%)`,
        }}
      >
        {customIconSrc ? (
          <span className="relative size-10 overflow-hidden rounded-[3px] ring-1 ring-black/[0.06] sm:size-11">
            <Image
              src={customIconSrc}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="44px"
              unoptimized
            />
          </span>
        ) : (
          <span
            className="flex size-10 items-center justify-center rounded-[3px] bg-white shadow-[0_1px_3px_rgba(20,24,22,0.08)] ring-1 ring-black/[0.05] transition-transform duration-300 group-hover:scale-105 sm:size-11"
            style={{ color }}
          >
            <Icon className="size-5 sm:size-[1.35rem]" strokeWidth={1.75} aria-hidden />
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-0.5 border-t border-[var(--storefront-rule,#e4e6e4)] px-2.5 py-2">
        <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-[var(--storefront-ink,#141816)] sm:text-[13px]">
          {label}
        </span>
        {typeof itemCount === "number" && itemCount >= 0 ? (
          <span className="text-[10px] tabular-nums text-[var(--storefront-ink-quiet,#8a928c)]">
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
    <div className="relative -mx-1 px-1" aria-label="Shop by aisle">
      <div
        className={cn(
          "flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 sm:gap-2.5",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
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
        <div className="w-6 shrink-0 snap-end sm:w-8" aria-hidden />
      </div>
      <div
        className="storefront-aisle-fade pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-14"
        aria-hidden
      />
    </div>
  );
}
