"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  appendComingSoonShelf,
  COMING_SOON_PAGE_LIMIT,
  comingSoonShelfCount,
  seedComingSoonShelf,
} from "@/lib/coming-soon-catalog";
import { comingSoonShelfFromCards, type ComingSoonShelfItem } from "@/lib/coming-soon-editorial";
import { fetchPublicCatalogPageBrowser } from "@/lib/public-storefront-client";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

const ROOT_MARGIN = "480px 0px";
const NO_CARDS: readonly PublicCatalogItemCard[] = [];

type CatalogInput = {
  slug: string | null;
  currency: string | null;
  catalogItems?: readonly PublicCatalogItemCard[] | null;
  featured?: readonly PublicCatalogItemCard[] | null;
  fallback: readonly ComingSoonShelfItem[];
  nextCursor: string | null;
  totalCount: number | null;
};

export function useComingSoonCatalog(input: CatalogInput) {
  const catalogItems = input.catalogItems?.length ? input.catalogItems : NO_CARDS;
  const featured = input.featured?.length ? input.featured : NO_CARDS;
  const seed = useMemo(() => {
    const fromCards = seedComingSoonShelf(featured, catalogItems, input.currency);
    return fromCards.length > 0 ? fromCards : [...input.fallback];
  }, [catalogItems, featured, input.currency, input.fallback]);

  const [items, setItems] = useState<ComingSoonShelfItem[]>(seed);
  const [cursor, setCursor] = useState<string | null>(input.nextCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [watchesScroll, setWatchesScroll] = useState(true);
  const [sentinel, setSentinel] = useState<HTMLLIElement | null>(null);
  const busy = useRef(false);
  const cursorRef = useRef(input.nextCursor);

  useEffect(() => {
    setItems(seed);
    cursorRef.current = input.nextCursor;
    setCursor(input.nextCursor);
    setFailed(false);
  }, [seed, input.nextCursor]);

  useEffect(() => {
    setWatchesScroll(typeof IntersectionObserver !== "undefined");
  }, []);

  const hasMore =
    Boolean(input.slug && cursor) &&
    (input.totalCount == null || items.length < input.totalCount);
  const countLabel = hasMore
    ? comingSoonShelfCount(items.length, input.totalCount)
    : null;

  const loadMore = useCallback(async () => {
    const current = cursorRef.current;
    if (!input.slug || !current || busy.current) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    const page = await fetchPublicCatalogPageBrowser(input.slug, {
      cursor: current,
      limit: COMING_SOON_PAGE_LIMIT,
    });
    if (!page) {
      busy.current = false;
      setLoading(false);
      setFailed(true);
      return;
    }
    const more = comingSoonShelfFromCards(page.items, input.currency);
    const nextCursor = page.nextCursor === current ? null : page.nextCursor;
    cursorRef.current = nextCursor;
    setItems((currentItems) => appendComingSoonShelf(currentItems, more));
    setCursor(nextCursor);
    busy.current = false;
    setLoading(false);
  }, [input.currency, input.slug]);

  useEffect(() => {
    if (!sentinel || !hasMore || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      setVisible(entries.some((entry) => entry.isIntersecting));
    }, { rootMargin: ROOT_MARGIN });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, sentinel]);

  useEffect(() => {
    if (!visible || !hasMore || loading || failed) return;
    void loadMore();
  }, [failed, hasMore, loadMore, loading, visible]);

  return {
    items,
    loading,
    failed,
    hasMore,
    countLabel,
    loadMore,
    sentinelRef: setSentinel,
    watchesScroll,
  };
}
