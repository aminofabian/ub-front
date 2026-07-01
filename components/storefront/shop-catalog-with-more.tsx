"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

const PAGE_SIZE = 24;
const LOAD_MARGIN = "0px 0px 200px 0px";
const PREFETCH_MARGIN = "0px 0px 500px 0px";
const MAX_AUTO_RETRIES = 2;

type PrefetchedPage = {
  cursor: string;
  items: PublicCatalogItemCard[];
  nextCursor: string | null;
};

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

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

function shouldPrefetch(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  const slow = /(2g|slow-2g)/i.test(conn.effectiveType || "");
  return !slow;
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
  const [prefetchedPage, setPrefetchedPage] = useState<PrefetchedPage | null>(
    null,
  );
  const [newFromIndex, setNewFromIndex] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [willAutoRetry, setWillAutoRetry] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  const nextRef = useRef(next);
  const busyRef = useRef(false);
  const prefetchedRef = useRef(prefetchedPage);
  const prefetchPromiseRef = useRef<Promise<PageResult> | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const abortCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  useEffect(() => {
    prefetchedRef.current = prefetchedPage;
  }, [prefetchedPage]);

  // Reset retry state whenever the filter/search changes (parent remounts via key).
  useEffect(() => {
    retryCountRef.current = 0;
    setWillAutoRetry(false);
    setError(null);
  }, [q, categoryId, resolvedTypeId]);

  // Cancel any in-flight prefetch if the component unmounts.
  useEffect(() => {
    return () => {
      abortCtrlRef.current?.abort();
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // Only warm the next page once the user has actually scrolled.
  useEffect(() => {
    const onScroll = () => setHasScrolled(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useStorefrontCatalogSync({
    slug,
    q,
    categoryId,
    typeId: resolvedTypeId,
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

  const prefetchNext = useCallback(async (): Promise<PageResult> => {
    const cursor = nextRef.current;
    if (!cursor) {
      return { ok: false, status: 0, message: "No next page" };
    }

    const cached = prefetchedRef.current;
    if (cached?.cursor === cursor) {
      return {
        ok: true,
        payload: {
          currency,
          items: cached.items,
          nextCursor: cached.nextCursor,
          totalCount,
        },
      };
    }

    if (!shouldPrefetch()) {
      return { ok: false, status: 0, message: "Prefetch disabled" };
    }

    if (prefetchPromiseRef.current) {
      return prefetchPromiseRef.current;
    }

    const promise = (async () => {
      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;
      try {
        const result = await fetchPage(cursor, ctrl.signal);
        if (result.ok) {
          const payload = result.payload;
          if (
            payload.items.length > 0 &&
            payload.nextCursor !== cursor
          ) {
            const page: PrefetchedPage = {
              cursor,
              items: payload.items,
              nextCursor: payload.nextCursor,
            };
            prefetchedRef.current = page;
            setPrefetchedPage(page);
          }
        }
        return result;
      } finally {
        abortCtrlRef.current = null;
      }
    })();

    prefetchPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      prefetchPromiseRef.current = null;
    }
  }, [fetchPage, currency, totalCount]);

  // Stable ref so callbacks declared earlier can reach the latest loadMore.
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

    try {
      const appendFrom = itemsRef.current.length;
      let result: PageResult;

      const cached = prefetchedRef.current;
      if (cached?.cursor === cursor) {
        result = {
          ok: true,
          payload: {
            currency,
            items: cached.items,
            nextCursor: cached.nextCursor,
            totalCount,
          },
        };
        prefetchedRef.current = null;
        setPrefetchedPage(null);
      } else if (prefetchPromiseRef.current) {
        result = await prefetchPromiseRef.current;
      } else {
        result = await fetchPage(cursor);
      }

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
        { q, categoryId, cursor: nextRef.current },
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
    }
  }, [currency, totalCount, fetchPage, q, categoryId]);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const prefetchRef = useRef(prefetchNext);
  useEffect(() => {
    prefetchRef.current = prefetchNext;
  }, [prefetchNext]);

  // Trigger the actual load when the user gets close to the bottom.
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

  // Look-ahead prefetch so the next page is already cached before they scroll into it.
  useEffect(() => {
    if (!next || !hasScrolled || error) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void prefetchRef.current();
        }
      },
      { root: null, rootMargin: PREFETCH_MARGIN, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [next, hasScrolled, error]);

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
