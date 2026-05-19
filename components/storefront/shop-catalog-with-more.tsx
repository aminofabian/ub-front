"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ShopProductGrid from "@/components/storefront/shop-product-grid";
import { ShopProductGridSkeleton } from "@/components/storefront/shop-product-grid-skeleton";
import { useStorefrontCatalogSync } from "@/hooks/use-storefront-catalog-sync";
import { APP_ROUTES, apiUrl } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCatalogListPayload,
} from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

export default function ShopCatalogWithMore({
  slug,
  currency,
  initialItems,
  initialNextCursor,
  initialTotalCount,
  q,
  categoryId,
  categoryHeading,
  categoryPathSlug,
  accentHex,
}: {
  slug: string;
  currency: string;
  initialItems: PublicCatalogItemCard[];
  initialNextCursor: string | null;
  initialTotalCount?: number;
  q?: string;
  categoryId?: string;
  categoryHeading?: string;
  categoryPathSlug?: string;
  accentHex?: string | null;
}) {
  const [items, setItems] = useState<PublicCatalogItemCard[]>(initialItems);
  const [next, setNext] = useState<string | null>(initialNextCursor);
  const [totalCount] = useState<number>(initialTotalCount ?? initialItems.length);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const nextRef = useRef<string | null>(initialNextCursor);

  useStorefrontCatalogSync({
    slug,
    q,
    categoryId,
    items,
    setItems,
  });

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const loadMore = useCallback(async () => {
    const cursor = nextRef.current;
    if (!cursor || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      p.set("limit", "24");
      p.set("cursor", cursor);
      const qt = q?.trim();
      if (qt) p.set("q", qt);
      const cid = categoryId?.trim();
      if (cid) p.set("categoryId", cid);
      const path = `/api/v1/public/businesses/${encodeURIComponent(slug)}/catalog/items?${p}`;
      const res = await fetch(apiUrl(path), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        setError("Could not load more.");
        return;
      }
      const payload = (await res.json()) as PublicCatalogListPayload;
      setItems((prev) => [...prev, ...payload.items]);
      setNext(payload.nextCursor);
      nextRef.current = payload.nextCursor;
    } catch {
      setError("Could not load more.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [q, categoryId, slug]);

  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    if (!next) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreRef.current();
        }
      },
      {
        root: null,
        rootMargin: "0px 0px 152px 0px",
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [next]);

  const filtered = Boolean(q?.trim() || categoryId?.trim());

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {categoryHeading ? (
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
                {categoryHeading}
              </h2>
              {categoryPathSlug ? (
                <span
                  className="truncate font-mono text-[10px] font-normal normal-case tracking-normal text-muted-foreground/55"
                  title={`URL: ${APP_ROUTES.shop}/c/${categoryPathSlug}`}
                >
                  /{categoryPathSlug}
                </span>
              ) : null}
            </div>
          ) : (
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
              {filtered && q?.trim()
                ? `Results for "${q.trim()}"`
                : filtered
                  ? "Filtered results"
                  : "All Products"}
            </h2>
          )}
        </div>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground/50">
          {totalCount > items.length
            ? `${items.length} of ${totalCount}`
            : `${items.length} ${items.length === 1 ? "item" : "items"}`}
        </span>
      </div>

      <ShopProductGrid
        items={items}
        currency={currency}
        filtered={filtered}
        clearHref={APP_ROUTES.shop}
        slug={slug}
        accentHex={accentHex}
      />

      {error ? (
        <p className="text-center text-xs text-destructive">{error}</p>
      ) : null}

      {busy ? <ShopProductGridSkeleton count={8} /> : null}

      {next ? (
        <div
          ref={sentinelRef}
          className={cn(
            "py-2",
            busy ? "min-h-2" : "flex min-h-14 items-center justify-center",
          )}
          aria-live="polite"
        >
          {!busy ? (
            <span className="sr-only">Scroll for more products</span>
          ) : null}
        </div>
      ) : items.length > 0 ? (
        <p className="pb-2 text-center text-[11px] text-muted-foreground/40">
          End of catalog
        </p>
      ) : null}
    </div>
  );
}
