import Link from "next/link";

import type { PublicCategory } from "@/lib/public-storefront";
import { shopListPath } from "@/lib/shop-url";

function depthMemo(
  id: string,
  byId: Map<string, PublicCategory>,
  memo: Map<string, number>,
): number {
  const hit = memo.get(id);
  if (hit != null) {
    return hit;
  }
  const row = byId.get(id);
  const p = row?.parentId?.trim();
  if (!p) {
    memo.set(id, 0);
    return 0;
  }
  const d = 1 + depthMemo(p, byId, memo);
  memo.set(id, d);
  return d;
}

export default function ShopCategoryNav({
  categories,
  activeCategoryId,
  q,
}: {
  categories: PublicCategory[];
  activeCategoryId?: string;
  q?: string;
}) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const memo = new Map<string, number>();

  return (
    <nav className="rounded-xl border border-border/70 bg-card/50 p-3" aria-label="Categories">
      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Categories
      </p>
      <ul className="mt-2 space-y-0.5">
        <li>
          <Link
            href={shopListPath({ q })}
            className={
              !activeCategoryId
                ? "block rounded-md bg-secondary px-2 py-1.5 text-sm font-medium"
                : "block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          >
            All products
          </Link>
        </li>
        {categories.map((c) => {
          const d = depthMemo(c.id, byId, memo);
          const pad = 8 + d * 12;
          const active = c.id === activeCategoryId;
          return (
            <li key={c.id}>
              <Link
                href={shopListPath({ categoryId: c.id, q })}
                className={
                  active
                    ? "block rounded-md bg-secondary py-1.5 text-sm font-medium hover:bg-secondary/90"
                    : "block rounded-md py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                }
                style={{ paddingLeft: pad, paddingRight: 8 }}
              >
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
