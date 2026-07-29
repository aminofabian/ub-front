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
    <section aria-label="Shop by type" className="min-w-0">
      <div className="mb-3">
        <p className="storefront-section-eyebrow">Departments</p>
        <h2 className="storefront-section-title mt-0.5 text-[1.375rem] sm:text-[1.625rem]">
          Shop by type
        </h2>
      </div>
      <div
        className={cn(
          "flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
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
                "flex shrink-0 snap-start items-center gap-2.5 rounded-[3px] border px-2.5 py-2 transition-[border-color,background-color,box-shadow] duration-150 sm:gap-3 sm:px-3 sm:py-2.5",
                selected
                  ? "border-primary/30 bg-primary/[0.07] shadow-[0_1px_0_color-mix(in_srgb,var(--primary)_12%,transparent)]"
                  : "border-[var(--storefront-card-border,#e2e5e2)] bg-[var(--storefront-paper-elevated,#fff)] hover:border-[var(--storefront-card-border-hover,#c8cdc8)]",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-[3px] sm:size-9",
                  selected ? "bg-primary/12" : "bg-[var(--storefront-paper,#f4f5f4)]",
                )}
                style={
                  !selected && primary
                    ? {
                        backgroundColor: `color-mix(in srgb, ${primary} 9%, transparent)`,
                      }
                    : undefined
                }
              >
                {customIconSrc ? (
                  <span className="relative size-4 sm:size-[17px]">
                    <Image
                      src={customIconSrc}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="17px"
                      unoptimized
                    />
                  </span>
                ) : (
                  <Icon
                    className="size-4 sm:size-[17px]"
                    strokeWidth={1.75}
                    aria-hidden
                    style={
                      primary ? { color: primary } : { color: "var(--primary)" }
                    }
                  />
                )}
              </span>
              <div className="min-w-0 pr-0.5">
                <p className="truncate text-[12px] font-semibold leading-tight text-[var(--storefront-ink,#141816)] sm:text-[13px]">
                  {label}
                </p>
                <p className="text-[10px] leading-snug text-[var(--storefront-ink-quiet,#8a928c)] sm:text-[11px]">
                  {itemCountLabel(type.itemCount ?? 0)}
                </p>
              </div>
            </Link>
          );
        })}
        <div className="w-2 shrink-0" aria-hidden />
      </div>
    </section>
  );
}

/** @deprecated Use {@link ShopTypeFilters}. */
export const ShopDepartmentFilters = ShopTypeFilters;
