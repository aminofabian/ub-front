"use client";

import Link from "next/link";
import { Flame, LayoutGrid } from "lucide-react";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { PublicCategory } from "@/lib/public-storefront";
import {
  activeStorefrontCategorySlugFromPathname,
  shopListPath,
  storefrontCategoryPathSlug,
} from "@/lib/shop-url";
import { cn } from "@/lib/utils";

function RailLinks({
  categories,
  primaryHex,
  accentHex,
}: {
  categories: PublicCategory[];
  primaryHex: string | null;
  accentHex: string | null;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const pathSlug = activeStorefrontCategorySlugFromPathname(pathname);
  const q = sp.get("q")?.trim() ?? "";

  const roots = useMemo(
    () => categories.filter((c) => !c.parentId?.trim()).slice(0, 8),
    [categories],
  );

  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim()) ? primaryHex.trim() : null;
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;

  return (
    <div
      className={cn("text-white", !primary && "bg-primary")}
      style={primary ? { backgroundColor: primary } : undefined}
    >
      <div className="mx-auto flex max-w-7xl items-stretch gap-2 px-4 sm:px-6">
        <Link
          href={shopListPath({ q })}
          className="flex shrink-0 items-center gap-2 border-r border-white/15 py-2.5 pr-3 text-sm font-semibold sm:pr-4"
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
          <span className="hidden whitespace-nowrap sm:inline">Shop by Aisle</span>
          <span className="sm:hidden">Aisles</span>
        </Link>
        <nav
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto py-1.5"
          aria-label="Shop by aisle"
        >
          {roots.map((c) => {
            const seg = storefrontCategoryPathSlug(c);
            const active =
              pathSlug !== "" &&
              (seg === pathSlug || seg.toLowerCase() === pathSlug.toLowerCase());
            return (
              <Link
                key={c.id}
                href={shopListPath({ categoryPathSlug: seg, q })}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition",
                  active ? "bg-white/20 font-semibold" : "hover:bg-white/10",
                )}
              >
                {c.name}
              </Link>
            );
          })}
        </nav>
        <Link
          href="#shop-catalog"
          className={cn(
            "ml-auto inline-flex shrink-0 items-center gap-1.5 self-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10",
          )}
        >
          <Flame className="h-4 w-4" aria-hidden />
          Offers
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow"
            style={
              accent ? { backgroundColor: accent } : { backgroundColor: "#dc2626" }
            }
          >
            Hot
          </span>
        </Link>
      </div>
    </div>
  );
}

export function ShopCategoryRail({
  categories,
  primaryHex,
  accentHex,
}: {
  categories: PublicCategory[];
  primaryHex: string | null;
  accentHex: string | null;
}) {
  return <RailLinks categories={categories} primaryHex={primaryHex} accentHex={accentHex} />;
}
