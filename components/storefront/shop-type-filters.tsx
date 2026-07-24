"use client";

import {
  Beer,
  Cookie,
  Package,
  PenTool,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Wine,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { PublicCatalogType } from "@/lib/public-storefront";
import { shopListPath } from "@/lib/shop-url";
import { categoryIconImageUrl, cn } from "@/lib/utils";

const ICON_BY_KEYWORD: Array<{ test: RegExp; icon: LucideIcon }> = [
  { test: /grocery|general|retail/i, icon: ShoppingBasket },
  { test: /drink|beverage|water|juice|soda|dairy/i, icon: Beer },
  { test: /house|clean|essent|hygiene|home|household/i, icon: Sparkles },
  { test: /station|office|paper|pen|electronic/i, icon: PenTool },
  { test: /snack|bite|cookie|candy|bakery|cereal/i, icon: Cookie },
  { test: /liquor|wine|spirit|alcohol/i, icon: Wine },
  { test: /cloth|fashion|wear|appar|beauty|care/i, icon: Shirt },
  { test: /spice|season/i, icon: Sparkles },
];

/** Catch-all store labels that aren't useful as shopper "types". */
const GENERIC_TYPE_LABEL = /^(retail(\s+shop)?|grocery|general|all(\s+products)?)$/i;

function pickIcon(label: string): LucideIcon {
  for (const m of ICON_BY_KEYWORD) {
    if (m.test.test(label)) return m.icon;
  }
  return Package;
}

function itemCountLabel(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

function titleCaseLabel(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .map((word) =>
      word.length <= 2 && word === word.toUpperCase()
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

function isGenericType(label: string): boolean {
  return GENERIC_TYPE_LABEL.test(label.trim());
}

/** Prefer real product families; drop lone Retail/Grocery catch-alls. */
export function filterShopperTypes(
  types: PublicCatalogType[],
): PublicCatalogType[] {
  const meaningful = types.filter((t) => !isGenericType(t.label));
  if (meaningful.length > 0) {
    return meaningful;
  }
  // Only generic types exist — hide the section rather than show "Retail".
  return [];
}

export function ShopTypeFilters({
  types,
  primaryHex,
}: {
  types: PublicCatalogType[];
  primaryHex: string | null;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const activeId =
    sp.get("typeId")?.trim() || sp.get("departmentId")?.trim() || "";
  const q = sp.get("q")?.trim() ?? "";

  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;

  const visibleTypes = filterShopperTypes(types);
  if (visibleTypes.length === 0) return null;

  const categoryPathSlug =
    pathname.startsWith("/shop/c/")
      ? pathname.slice("/shop/c/".length).split("/")[0]
      : undefined;

  return (
    <section aria-label="Shop by type">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
        Shop by type
      </h2>
      <div
        className={cn(
          "grid gap-2 rounded-lg border border-border/50 bg-card p-2.5 shadow-[0_1px_0_rgba(0,0,0,0.03),0_2px_10px_-4px_rgba(0,0,0,0.06)] sm:gap-2.5 sm:p-3",
          visibleTypes.length <= 2
            ? "grid-cols-2"
            : visibleTypes.length === 3
              ? "grid-cols-3"
              : "grid-cols-2 sm:grid-cols-4",
        )}
        role="group"
        aria-label="Filter by type"
      >
        {visibleTypes.map((type) => {
          const selected = activeId === type.id;
          const href = shopListPath({
            categoryPathSlug,
            q: q || undefined,
            typeId: selected ? undefined : type.id,
          });
          const Icon = pickIcon(type.label);
          const customIconSrc = categoryIconImageUrl(type.icon ?? null);
          const label = titleCaseLabel(type.label);

          return (
            <Link
              key={type.id}
              href={href}
              scroll={false}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-2.5 rounded-md px-1 py-1.5 transition-colors sm:gap-3 sm:px-1.5",
                selected
                  ? "bg-primary/8 ring-1 ring-primary/20"
                  : "hover:bg-muted/40",
              )}
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-md sm:size-9"
                style={{
                  backgroundColor: primary
                    ? `color-mix(in srgb, ${primary} 10%, transparent)`
                    : "color-mix(in srgb, var(--primary) 10%, transparent)",
                }}
              >
                {customIconSrc ? (
                  <span className="relative size-4 sm:size-[18px]">
                    <Image
                      src={customIconSrc}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="18px"
                      unoptimized
                    />
                  </span>
                ) : (
                  <Icon
                    className="size-4 sm:size-[18px]"
                    aria-hidden
                    style={
                      primary ? { color: primary } : { color: "var(--primary)" }
                    }
                  />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold leading-tight text-foreground sm:text-xs">
                  {label}
                </p>
                <p className="text-[10px] leading-snug text-muted-foreground/70 sm:text-[11px]">
                  {itemCountLabel(type.itemCount ?? 0)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** @deprecated Use {@link ShopTypeFilters}. */
export const ShopDepartmentFilters = ShopTypeFilters;
