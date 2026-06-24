"use client";

import type { CSSProperties } from "react";
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
  { test: /snack|bite|cookie|candy/i, icon: Cookie },
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
        "group relative flex w-[5.5rem] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border/30 bg-card/80 p-3 transition-all duration-300 hover:-translate-y-1 hover:border-border/60 hover:shadow-md sm:w-[6.25rem] sm:p-4",
      )}
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105 sm:h-12 sm:w-12"
        style={{ backgroundColor: `${color}12` }}
      >
        {customIconSrc ? (
          <span className="relative h-7 w-7 overflow-hidden rounded-md sm:h-8 sm:w-8">
            <Image
              src={customIconSrc}
              alt=""
              fill
              className="object-cover"
              sizes="32px"
              unoptimized
            />
          </span>
        ) : (
          <Icon
            className="h-5 w-5 sm:h-6 sm:w-6"
            aria-hidden
            style={{ color }}
          />
        )}
      </span>
      <span className="line-clamp-2 text-center text-[11px] font-semibold leading-tight text-foreground sm:text-xs">
        {label}
      </span>
      {typeof itemCount === "number" && itemCount >= 0 ? (
        <span className="text-[10px] tabular-nums text-muted-foreground/60">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      ) : null}
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

  const renderCards = (keySuffix: string) =>
    categories.map((c, i) => {
      const Icon = pickIcon(c.name);
      const tint = i % 2 === 0 ? primary : accent;
      const tintFallback = i % 2 === 0 ? "var(--color-primary)" : "#f59e0b";
      const customIconSrc = categoryIconImageUrl(c.icon ?? null);
      return (
        <AisleCard
          key={`${c.id}${keySuffix}`}
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
    });

  const durationSec = Math.max(56, categories.length * 8);

  return (
    <div
      className="relative w-full overflow-hidden"
      aria-label="Shop by aisle"
      style={{ "--aisle-marquee-duration": `${durationSec}s` } as CSSProperties}
    >
      <div
        className={cn(
          "flex w-max flex-nowrap items-stretch gap-2 sm:gap-3",
          "animate-aisle-marquee hover:[animation-play-state:paused]",
        )}
      >
        {renderCards("")}
        {renderCards("-dup")}
      </div>
    </div>
  );
}
