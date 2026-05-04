import {
  ArrowRight,
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
import { shopListPath } from "@/lib/shop-url";
import { APP_ROUTES } from "@/lib/config";
import { categoryIconImageUrl } from "@/lib/utils";

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
    if (m.test.test(name)) {
      return m.icon;
    }
  }
  return ShoppingBasket;
}

export function ShopAisleGrid({
  categories,
  primaryHex,
  accentHex,
}: {
  categories: PublicCategory[];
  primaryHex: string | null;
  accentHex: string | null;
}) {
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim()) ? primaryHex.trim() : null;
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;

  const roots = categories.filter((c) => !c.parentId?.trim()).slice(0, 5);
  const showOffers = roots.length > 0;
  if (roots.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Shop by Aisle</h2>
        <Link
          href={APP_ROUTES.shop}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          style={primary ? { color: primary } : undefined}
        >
          View all aisles
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
        {roots.map((c, i) => {
          const Icon = pickIcon(c.name);
          const tint = i % 2 === 0 ? primary : accent;
          const tintFallback = i % 2 === 0 ? "var(--color-primary)" : "#fb923c";
          const customIconSrc = categoryIconImageUrl(c.icon ?? null);
          return (
            <AisleCard
              key={c.id}
              href={shopListPath({ categoryId: c.id })}
              label={c.name}
              Icon={Icon}
              customIconSrc={customIconSrc}
              tint={tint}
              tintFallback={tintFallback}
            />
          );
        })}
        {showOffers ? (
          <AisleCard
            href="#shop-catalog"
            label="Special Offers"
            Icon={BadgePercent}
            tint={accent}
            tintFallback="#fb923c"
            promo
          />
        ) : null}
      </ul>
    </section>
  );
}

function AisleCard({
  href,
  label,
  Icon,
  customIconSrc,
  tint,
  tintFallback,
  promo,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  customIconSrc?: string | null;
  tint: string | null;
  tintFallback: string;
  promo?: boolean;
}) {
  const color = tint ?? tintFallback;
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.03] transition hover:-translate-y-0.5 hover:shadow-md dark:ring-white/[0.05]"
      >
        <div
          className="relative flex aspect-[4/3] items-center justify-center"
          style={{ background: `linear-gradient(160deg, ${color}26 0%, ${color}10 100%)` }}
        >
          {customIconSrc ? (
            <span className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/20 bg-white/90 shadow-inner sm:h-16 sm:w-16 dark:bg-white/95">
              <Image
                src={customIconSrc}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
              />
            </span>
          ) : (
            <Icon
              className="h-10 w-10 opacity-90 transition group-hover:scale-110 sm:h-12 sm:w-12"
              aria-hidden
              style={{ color }}
            />
          )}
          {promo ? (
            <span
              className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow"
              style={{ backgroundColor: color }}
            >
              Save
            </span>
          ) : null}
        </div>
        <div
          className="flex h-9 items-center justify-center text-center text-[12px] font-bold leading-tight text-white sm:h-10 sm:text-sm"
          style={{ backgroundColor: color }}
        >
          <span className="line-clamp-2 px-2">{label}</span>
        </div>
      </Link>
    </li>
  );
}
