"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import { apiUrl } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCatalogListPayload,
} from "@/lib/public-storefront";
import { appendCatalogPage } from "@/lib/storefront-catalog-pages";

const DEFAULT_LIMIT = 24;
const LOAD_MARGIN = "0px 0px 720px 0px";
const MAX_AUTO_RETRIES = 2;

export type StorefrontCatalogQuery = {
  q?: string;
  categoryId?: string;
  typeId?: string;
  departmentId?: string;
};

class CatalogLoadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "CatalogLoadError";
  }
}

export function useStorefrontCatalogPages({
  slug,
  initialItems,
  initialNextCursor,
  query,
  limit = DEFAULT_LIMIT,
}: {
  slug: string;
  initialItems: PublicCatalogItemCard[];
  initialNextCursor: string | null;
  query?: StorefrontCatalogQuery;
  limit?: number;
}): {
  items: PublicCatalogItemCard[];
  setItems: Dispatch<SetStateAction<PublicCatalogItemCard[]>>;
  loading: boolean;
  error: string | null;
  willAutoRetry: boolean;
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  newFromIndex: number;
  loadMore: () => Promise<void>;
  retry: () => void;
} {
  const [items, setItems] = useState(initialItems);
  const [next, setNext] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [willAutoRetry, setWillAutoRetry] = useState(false);
  const [newFromIndex, setNewFromIndex] = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  const nextRef = useRef(next);
  const busyRef = useRef(false);
  const loadMoreRef = useRef<() => Promise<void>>(async () => {});
  const retryTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const unmountedRef = useRef(false);

  const q = query?.q;
  const categoryId = query?.categoryId;
  const typeId = query?.typeId;
  const departmentId = query?.departmentId;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  useEffect(() => {
    retryCountRef.current = 0;
    setWillAutoRetry(false);
    setError(null);
  }, [q, categoryId, typeId, departmentId]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      abortCtrlRef.current?.abort();
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, []);

  const fetchPage = useCallback(
    async (cursor: string, signal?: AbortSignal) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("cursor", cursor);
      const qt = q?.trim();
      if (qt) params.set("q", qt);
      const cid = categoryId?.trim();
      if (cid) params.set("categoryId", cid);
      const tid = typeId?.trim();
      if (tid) params.set("typeId", tid);
      const did = departmentId?.trim();
      if (did) params.set("departmentId", did);

      const path = `/api/v1/public/businesses/${encodeURIComponent(slug)}/catalog/items?${params}`;
      try {
        const res = await fetch(apiUrl(path), {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal,
        });
        if (!res.ok) {
          return { ok: false as const, status: res.status, message: res.statusText };
        }
        const payload = (await res.json()) as PublicCatalogListPayload;
        if (!Array.isArray(payload.items)) payload.items = [];
        return { ok: true as const, payload };
      } catch (err) {
        return {
          ok: false as const,
          status: 0,
          message: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [slug, limit, q, categoryId, typeId, departmentId],
  );

  const loadMore = useCallback(async () => {
    const cursor = nextRef.current;
    if (!cursor || busyRef.current) return;

    busyRef.current = true;
    setLoading(true);
    setError(null);
    setWillAutoRetry(false);

    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (unmountedRef.current) {
      busyRef.current = false;
      setLoading(false);
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

      const { items: nextItems, next: nextCursor } = appendCatalogPage(
        itemsRef.current,
        result.payload.items,
        cursor,
        result.payload.nextCursor,
      );
      setItems(nextItems);
      itemsRef.current = nextItems;
      setNext(nextCursor);
      nextRef.current = nextCursor;
      if (nextItems.length > appendFrom) {
        setNewFromIndex(appendFrom);
      }
      retryCountRef.current = 0;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;

      let message = "That shelf didn't load.";
      let isRetryable = true;
      if (err instanceof CatalogLoadError) {
        if (err.status === 429) {
          message = "Too many requests. Slow down a moment.";
          isRetryable = false;
        } else if (err.status >= 400 && err.status < 500) {
          message = err.message || "Could not load products.";
          isRetryable = false;
        }
      }
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
      setLoading(false);
      abortCtrlRef.current = null;
    }
  }, [fetchPage]);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    if (!next) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreRef.current();
      },
      { root: null, rootMargin: LOAD_MARGIN, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [next]);

  const retry = useCallback(() => {
    retryCountRef.current = 0;
    setWillAutoRetry(false);
    setError(null);
    void loadMoreRef.current();
  }, []);

  return {
    items,
    setItems,
    loading,
    error,
    willAutoRetry,
    hasMore: Boolean(next),
    sentinelRef,
    newFromIndex,
    loadMore,
    retry,
  };
}
