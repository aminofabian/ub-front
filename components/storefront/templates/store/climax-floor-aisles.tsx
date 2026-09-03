"use client";

import Link from "next/link";

import styles from "@/components/storefront/templates/store/climax-floor.module.css";
import type { PublicCategory } from "@/lib/public-storefront";
import { shopListPath, storefrontCategoryPathSlug } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

type AisleNode = {
  cat: PublicCategory;
  children: PublicCategory[];
};

export function climaxFloorAisleTree(
  categories: PublicCategory[],
): AisleNode[] {
  const roots = categories.filter((c) => !c.parentId);
  return roots.map((cat) => ({
    cat,
    children: categories.filter((c) => c.parentId === cat.id),
  }));
}

export function ClimaxFloorAisles({
  categories,
  categoryId,
  categoryPathSlug,
  q,
  onNavigate,
  compact,
}: {
  categories: PublicCategory[];
  categoryId?: string;
  categoryPathSlug?: string;
  q?: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const tree = climaxFloorAisleTree(categories);
  const shopActive = !categoryId && !categoryPathSlug;

  const linkClass = (active: boolean) =>
    cn(styles.catLink, active && styles.catLinkActive);

  return (
    <div>
      {compact ? null : <p className={styles.catHead}>Aisles</p>}
      <ul className={styles.catList}>
        <li>
          <Link
            href={shopListPath({ q: q || undefined })}
            className={linkClass(shopActive)}
            scroll={false}
            onClick={onNavigate}
          >
            All pieces
          </Link>
        </li>
        {tree.map(({ cat, children }) => {
          const slugSeg = storefrontCategoryPathSlug(cat);
          const active = categoryId === cat.id || categoryPathSlug === slugSeg;
          return (
            <li key={cat.id}>
              <Link
                href={shopListPath({
                  categoryPathSlug: slugSeg,
                  q: q || undefined,
                })}
                className={linkClass(active)}
                scroll={false}
                onClick={onNavigate}
              >
                <span>{cat.name}</span>
                {cat.itemCount != null ? (
                  <span className={styles.catCount}>{cat.itemCount}</span>
                ) : null}
              </Link>
              {children.length > 0 && !compact ? (
                <ul className={styles.catList}>
                  {children.map((child) => {
                    const childSlug = storefrontCategoryPathSlug(child);
                    const childOn =
                      categoryId === child.id || categoryPathSlug === childSlug;
                    return (
                      <li key={child.id}>
                        <Link
                          href={shopListPath({
                            categoryPathSlug: childSlug,
                            q: q || undefined,
                          })}
                          className={linkClass(childOn)}
                          scroll={false}
                          onClick={onNavigate}
                        >
                          {child.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
