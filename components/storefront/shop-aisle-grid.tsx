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
import { shopListPath } from "@/lib/shop-url";
import { categoryIconImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim())
      ? accentHex.trim()
      : null;

  const roots = categories.filter((c) => !c.parentId?.trim()).slice(0, 6);
  if (roots.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
        Shop by Category
      </h2>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
        {roots.map((c, i) => {
          const Icon = pickIcon(c.name);
          const tint = i % 2 === 0 ? primary : accent;
          const tintFallback = i % 2 === 0 ? "var(--color-primary)" : "#f59e0b";
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
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  customIconSrc?: string | null;
  tint: string | null;
  tintFallback: string;
}) {
  const color = tint ?? tintFallback;
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group relative flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-card p-3 transition-all duration-200 hover:border-border hover:shadow-sm sm:p-4",
        )}
      >
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors sm:h-12 sm:w-12"
          style={{
            backgroundColor: `${color}14`,
          }}
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
        <span className="text-[11px] font-semibold leading-tight text-foreground text-center line-clamp-2 sm:text-xs">
          {label}
        </span>
      </Link>
    </li>
  );
}
