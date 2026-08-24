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

import { StorefrontCategoryPhotoButton } from "@/components/storefront/storefront-category-photo-button";
import {
  useStorefrontDisplayCategoryIcon,
  useStorefrontStaffEditOptional,
} from "@/components/storefront/storefront-staff-edit";
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
  categoryId,
}: {
  href: string;
  label: string;
  itemCount?: number;
  Icon: LucideIcon;
  customIconSrc?: string | null;
  tint: string | null;
  tintFallback: string;
  categoryId: string;
}) {
  const staff = useStorefrontStaffEditOptional();
  const editing = Boolean(staff?.editMode && staff.canEditCategoryPhotos);
  const color = tint ?? tintFallback;
  const className = cn(
    "group relative h-[5.75rem] w-[5.75rem] shrink-0 snap-start overflow-hidden rounded-[3px] border border-[var(--storefront-card-border,#e2e5e2)] transition-[border-color,box-shadow,transform] duration-200",
    "hover:border-[var(--storefront-card-border-hover,#c8cdc8)] hover:shadow-[0_4px_14px_-6px_rgba(20,24,22,0.2)] sm:h-[6.25rem] sm:w-[6.25rem]",
  );
  const style = {
    background: `linear-gradient(145deg, color-mix(in srgb, ${color} 24%, white) 0%, color-mix(in srgb, ${color} 62%, white) 100%)`,
  };

  const content = (
    <>
      {customIconSrc ? (
        <Image
          src={customIconSrc}
          alt=""
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 92px, 100px"
          unoptimized
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center pb-4 text-white/90">
          <Icon
            className="size-8 drop-shadow-sm transition-transform duration-300 group-hover:scale-105 sm:size-9"
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
      )}

      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
        aria-hidden
      />

      <span className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-px px-1.5 pb-1.5 pt-5 text-white">
        <span className="line-clamp-2 text-[11px] font-semibold uppercase leading-tight tracking-wide drop-shadow-sm sm:text-[12px]">
          {label}
        </span>
        {typeof itemCount === "number" && itemCount >= 0 ? (
          <span className="text-[9px] tabular-nums text-white/75 drop-shadow-sm">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        ) : null}
      </span>
    </>
  );

  if (editing) {
    return (
      <div className={className} style={style}>
        {content}
        <StorefrontCategoryPhotoButton
          categoryId={categoryId}
          categoryName={label}
          className="bottom-auto top-1.5 right-1.5 z-20"
        />
      </div>
    );
  }

  return (
    <Link href={href} className={className} style={style}>
      {content}
    </Link>
  );
}

function AisleCardWithOverride({
  category,
  tint,
  tintFallback,
}: {
  category: PublicCategory;
  tint: string | null;
  tintFallback: string;
}) {
  const Icon = pickIcon(category.name);
  const customIconSrc = useStorefrontDisplayCategoryIcon(
    category.id,
    categoryIconImageUrl(category.icon ?? null),
  );
  return (
    <AisleCard
      href={shopListPath({
        categoryPathSlug: storefrontCategoryPathSlug(category),
      })}
      label={category.name}
      itemCount={category.itemCount}
      Icon={Icon}
      customIconSrc={customIconSrc}
      tint={tint}
      tintFallback={tintFallback}
      categoryId={category.id}
    />
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
          "flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1 sm:gap-2",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {categories.map((c, i) => {
          const tint = i % 2 === 0 ? primary : accent;
          const tintFallback = i % 2 === 0 ? "var(--color-primary)" : "#0ea5e9";
          return (
            <AisleCardWithOverride
              key={c.id}
              category={c}
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
