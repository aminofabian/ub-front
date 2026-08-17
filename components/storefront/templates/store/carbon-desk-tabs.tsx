"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import styles from "@/components/storefront/templates/store/carbon-desk.module.css";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import type { PublicCatalogType } from "@/lib/public-storefront";
import { shopListPath } from "@/lib/shop-url";

export function CarbonDeskTabs({ types }: { types: PublicCatalogType[] }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const activeId =
    sp.get("typeId")?.trim() || sp.get("departmentId")?.trim() || "";
  const q = sp.get("q")?.trim() ?? "";
  const visible = filterShopperTypes(types);
  if (visible.length === 0) return null;

  const categoryPathSlug = pathname.startsWith("/shop/c/")
    ? pathname.slice("/shop/c/".length).split("/")[0]
    : undefined;

  return (
    <nav className={styles.tabs} aria-label="Shop by type">
      {visible.map((type, i) => {
        const selected = activeId === type.id;
        const href = shopListPath({
          categoryPathSlug,
          q: q || undefined,
          typeId: selected ? undefined : type.id,
        });
        return (
          <Link
            key={type.id}
            href={href}
            scroll={false}
            className={styles.tab}
            data-tab-index={i % 5}
            aria-current={selected ? "true" : undefined}
          >
            {type.label}
            {type.itemCount != null ? (
              <span className={styles.tabCount}>{type.itemCount}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
