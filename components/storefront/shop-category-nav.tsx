import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
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

function NavRowLink({
  href,
  active,
  paddingLeft,
  children,
  accent,
}: {
  href: string;
  active: boolean;
  paddingLeft: number;
  children: ReactNode;
  accent: string | null;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative block rounded-lg py-2 pr-3 text-sm transition-colors",
        active
          ? "bg-muted/70 font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
      style={{ paddingLeft }}
    >
      {active ? (
        <span
          className="absolute bottom-2 left-2 top-2 w-0.5 rounded-full bg-primary"
          style={accent ? { backgroundColor: accent } : undefined}
          aria-hidden
        />
      ) : null}
      {children}
    </Link>
  );
}

export default function ShopCategoryNav({
  categories,
  activeCategoryId,
  q,
  accentHex,
}: {
  categories: PublicCategory[];
  activeCategoryId?: string;
  q?: string;
  accentHex?: string | null;
}) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const memo = new Map<string, number>();
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;

  return (
    <nav
      className="rounded-2xl border border-border/70 bg-card/80 p-1 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm dark:bg-card/50 dark:ring-white/[0.04] lg:sticky lg:top-24"
      aria-label="Categories"
    >
      <div className="border-b border-border/50 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Browse by category
        </p>
      </div>
      <ul className="max-h-[min(70vh,28rem)] space-y-0.5 overflow-y-auto p-1.5">
        <li>
          <NavRowLink
            href={shopListPath({ q })}
            active={!activeCategoryId}
            paddingLeft={14}
            accent={accent}
          >
            All products
          </NavRowLink>
        </li>
        {categories.map((c) => {
          const d = depthMemo(c.id, byId, memo);
          const pad = 14 + d * 12;
          const active = c.id === activeCategoryId;
          return (
            <li key={c.id}>
              <NavRowLink
                href={shopListPath({ categoryId: c.id, q })}
                active={active}
                paddingLeft={pad}
                accent={accent}
              >
                {c.name}
              </NavRowLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
