"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ShopProductGrid from "@/components/storefront/shop-product-grid";
import { ShopProductGridSkeleton } from "@/components/storefront/shop-product-grid-skeleton";
import { Button } from "@/components/ui/button";
import { useStorefrontCatalogSync } from "@/hooks/use-storefront-catalog-sync";
import { APP_ROUTES, apiUrl } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCatalogListPayload,
} from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 48;
const LOAD_MARGIN = "0px 0px 800px 0px";
const MAX_AUTO_RETRIES = 2;

type CatalogSort = "default" | "name_asc" | "price_asc" | "price_desc";

function sortCatalogItems(
  items: PublicCatalogItemCard[],
  sort: CatalogSort,
): PublicCatalogItemCard[] {
  if (sort === "default") {
    return items;
  }
  const copy = [...items];
  switch (sort) {
    case "name_asc":
      return copy.sort((a, b) => {
        const left = `${a.name} ${a.variantName ?? ""}`.trim();
        const right = `${b.name} ${b.variantName ?? ""}`.trim();
        return left.localeCompare(right);
      });
    case "price_asc":
      return copy.sort((a, b) => {
        const left = a.price ?? Number.POSITIVE_INFINITY;
        const right = b.price ?? Number.POSITIVE_INFINITY;
        return left - right;
      });
    case "price_desc":
      return copy.sort((a, b) => {
        const left = a.price ?? Number.NEGATIVE_INFINITY;
        const right = b.price ?? Number.NEGATIVE_INFINITY;
        return right - left;
      });
    default:
      return items;
  }
}

type PageResult =
  | { ok: true; payload: PublicCatalogListPayload }
  | { ok: false; status: number; message: string };

class CatalogLoadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "CatalogLoadError";
  }
}

export default function ShopCatalogWithMore({
  slug,
  currency,
  initialItems,
  initialNextCursor,
  initialTotalCount,
  q,
  categoryId,
  typeId,
  departmentId,
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
  typeId?: string;
  /** @deprecated Use {@link typeId}. */
  departmentId?: string;
  categoryHeading?: string;
  categoryPathSlug?: string;
  accentHex?: string | null;
}) {
  const resolvedTypeId = typeId?.trim() || departmentId?.trim() || undefined;
  const [items, setItems] = useState<PublicCatalogItemCard[]>(initialItems);
  const [next, setNext] = useState<string | null>(initialNextCursor);
  const [totalCount] = useState<number>(
    initialTotalCount ?? initialItems.length,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [willAutoRetry, setWillAutoRetry] = useState(false);
  const [newFromIndex, setNewFromIndex] = useState(0);
  const [sort, setSort] = useState<CatalogSort>("default");

  const sortedItems = useMemo(
    () => sortCatalogItems(items, sort),
    [items, sort],
  );

  const sentinelRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  const nextRef = useRef(next);
  const busyRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  // Reset retry state whenever the filter/search changes (parent remounts via key).
  useEffect(() => {
    retryCountRef.current = 0;
    setWillAutoRetry(false);
    setError(null);
    setSort("default");
  }, [q, categoryId, resolvedTypeId]);

  // Cancel any in-flight request if the component unmounts.
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      abortCtrlRef.current?.abort();
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  useStorefrontCatalogSync({
    slug,
    q,
    categoryId,
    departmentId: resolvedTypeId,
    items,
    setItems,
  });

  const fetchPage = useCallback(
    async (cursor: string, signal?: AbortSignal): Promise<PageResult> => {
      const p = new URLSearchParams();
      p.set("limit", String(PAGE_SIZE));
      p.set("cursor", cursor);
      const qt = q?.trim();
      if (qt) p.set("q", qt);
      const cid = categoryId?.trim();
      if (cid) p.set("categoryId", cid);
      const tid = resolvedTypeId;
      if (tid) p.set("departmentId", tid);
      const path = `/api/v1/public/businesses/${encodeURIComponent(slug)}/catalog/items?${p}`;

      try {
        const res = await fetch(apiUrl(path), {
          headers: { Accept: "application/json" },
          signal,
        });
        if (!res.ok) {
          return { ok: false, status: res.status, message: res.statusText };
        }
        const payload = (await res.json()) as PublicCatalogListPayload;
        if (!Array.isArray(payload.items)) {
          payload.items = [];
        }
        return { ok: true, payload };
      } catch (err) {
        return {
          ok: false,
          status: 0,
          message: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [slug, q, categoryId, resolvedTypeId],
  );

  const loadMoreRef = useRef<() => Promise<void>>(async () => {});

  const loadMore = useCallback(async () => {
    const cursor = nextRef.current;
    if (!cursor || busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setError(null);
    setWillAutoRetry(false);

    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (unmountedRef.current) {
      busyRef.current = false;
      setBusy(false);
      return;
    }

    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    try {
      const appendFrom = itemsRef.current.length;
      const result = await fetchPage(cursor, ctrl.signal);

      if (!result.ok) {
        throw new CatalogLoadError(result.message, result.status);
      }

      const payload = result.payload;

      // Defensive: stop if the backend keeps returning the same cursor or empty pages.
      if (payload.items.length === 0 || payload.nextCursor === cursor) {
        setNext(null);
        nextRef.current = null;
      } else {
        setItems((prev) => [...prev, ...payload.items]);
        const newCursor = payload.nextCursor ?? null;
        setNext(newCursor);
        nextRef.current = newCursor;
        setNewFromIndex(appendFrom);
      }

      retryCountRef.current = 0;
      setWillAutoRetry(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      let message = "Could not load more.";
      let status = 0;
      let isRetryable = true;

      if (err instanceof CatalogLoadError) {
        status = err.status;
        if (status === 429) {
          message = "Too many requests. Please slow down.";
          isRetryable = false;
        } else if (status >= 400 && status < 500) {
          message = err.message || "Could not load products.";
          isRetryable = false;
        }
      }

      console.warn(
        `[ShopCatalog] page load failed (status ${status || "network"}):`,
        message,
        { q, categoryId, typeId: resolvedTypeId, cursor: nextRef.current },
      );

      setError(message);

      if (isRetryable && retryCountRef.current < MAX_AUTO_RETRIES) {
        retryCountRef.current += 1;
        setWillAutoRetry(true);
        const delay = 1000 * 2 ** (retryCountRef.current - 1);
        retryTimerRef.current = window.setTimeout(() => {
          setWillAutoRetry(false);
          void loadMoreRef.current();
        }, delay);
      } else {
        retryCountRef.current = MAX_AUTO_RETRIES + 1;
        setWillAutoRetry(false);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
      abortCtrlRef.current = null;
    }
  }, [fetchPage, q, categoryId, resolvedTypeId]);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  // Trigger the next page when the user gets close to the bottom.
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
      { root: null, rootMargin: LOAD_MARGIN, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [next]);

  const handleRetry = useCallback(() => {
    retryCountRef.current = 0;
    setWillAutoRetry(false);
    setError(null);
    void loadMoreRef.current();
  }, []);

  const filtered = Boolean(
    q?.trim() || categoryId?.trim() || resolvedTypeId,
  );
  const atEnd = !next && items.length > 0;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {categoryHeading ? (
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
                {categoryHeading}
                {departmentId ? " (department filter)" : null}
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
        <div className="flex shrink-0 items-center gap-2">
          <label className="sr-only" htmlFor="shop-catalog-sort">
            Sort products
          </label>
          <select
            id="shop-catalog-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as CatalogSort)}
            className="h-7 rounded-md border border-border/60 bg-background px-2 text-[11px] font-medium text-foreground shadow-sm outline-none transition-colors hover:border-border focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <option value="default">Featured</option>
            <option value="name_asc">Name A–Z</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground/50">
            {totalCount > items.length
              ? `${items.length} of ${totalCount}`
              : `${items.length} ${items.length === 1 ? "item" : "items"}`}
          </span>
        </div>
      </div>

      <ShopProductGrid
        items={sortedItems}
        currency={currency}
        filtered={filtered}
        clearHref={APP_ROUTES.shop}
        slug={slug}
        accentHex={accentHex}
        newFromIndex={newFromIndex}
      />

      {error ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-center text-xs text-destructive">{error}</p>
          {willAutoRetry ? (
            <p className="text-center text-[11px] text-muted-foreground/60">
              Retrying…
            </p>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={busy}
            >
              <RefreshCw className="mr-1.5 size-3" />
              Try again
            </Button>
          )}
        </div>
      ) : null}

      {busy ? <ShopProductGridSkeleton count={4} /> : null}

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
            <>
              <span className="sr-only">Scroll for more products</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-[11px] text-muted-foreground/70 hover:text-foreground"
                onClick={() => void loadMoreRef.current()}
                disabled={busy}
              >
                Load more
              </Button>
            </>
          ) : null}
        </div>
      ) : atEnd ? (
        <p className="pb-2 text-center text-[11px] text-muted-foreground/40">
          End of catalog
        </p>
      ) : null}
    </div>
  );
}
