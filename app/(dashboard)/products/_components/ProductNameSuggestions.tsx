"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Globe2, Loader2, Package, Store } from "lucide-react";

import {
  fetchItemsPage,
  itemListThumbnailUrl,
  lookupGlobalCatalogProducts,
  type GlobalProductRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";

const SEARCH_DEBOUNCE_MS = 280;
const MIN_QUERY_LEN = 2;
const RESULT_LIMIT = 5;
const BARCODE_DIGIT_MIN = 6;

type Props = {
  query: string;
  enabled?: boolean;
  canGlobalCatalog: boolean;
  onOpenExisting: (itemId: string) => void;
  onUseGlobal: (product: GlobalProductRecord) => void;
};

function queryLooksLikeBarcode(q: string): boolean {
  return new RegExp(`^\\d{${BARCODE_DIGIT_MIN},}$`).test(q.trim());
}

function formatPrice(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function ProductNameSuggestions({
  query,
  enabled = true,
  canGlobalCatalog,
  onOpenExisting,
  onUseGlobal,
}: Props) {
  const [tenantHits, setTenantHits] = useState<ItemSummaryRecord[]>([]);
  const [globalHits, setGlobalHits] = useState<GlobalProductRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      const idle = window.setTimeout(() => {
        setTenantHits([]);
        setGlobalHits([]);
        setBusy(false);
      }, 0);
      return () => window.clearTimeout(idle);
    }

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < MIN_QUERY_LEN) {
      const idle = window.setTimeout(() => {
        setTenantHits([]);
        setGlobalHits([]);
        setBusy(false);
      }, 0);
      return () => window.clearTimeout(idle);
    }

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      setBusy(true);
      const asBarcode = queryLooksLikeBarcode(trimmed);
      const tenantPromise = (async () => {
        if (!asBarcode) {
          return fetchItemsPage(trimmed, {
            page: 0,
            size: RESULT_LIMIT,
            includeInactive: true,
          });
        }
        const exact = await fetchItemsPage(undefined, {
          barcode: trimmed,
          page: 0,
          size: RESULT_LIMIT,
          includeInactive: true,
        });
        if (exact.content.length > 0) return exact;
        return fetchItemsPage(trimmed, {
          page: 0,
          size: RESULT_LIMIT,
          includeInactive: true,
        });
      })();
      const globalPromise = canGlobalCatalog
        ? lookupGlobalCatalogProducts(
            asBarcode
              ? { barcode: trimmed, q: trimmed }
              : { q: trimmed },
          )
        : Promise.resolve([] as GlobalProductRecord[]);

      void Promise.all([tenantPromise, globalPromise])
        .then(([tenantPage, globalRows]) => {
          if (requestId !== requestIdRef.current) return;
          setTenantHits(tenantPage.content);
          setGlobalHits(globalRows.slice(0, RESULT_LIMIT));
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setTenantHits([]);
          setGlobalHits([]);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setBusy(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, canGlobalCatalog, enabled]);

  if (!enabled) return null;

  const hasMatches = tenantHits.length > 0 || globalHits.length > 0;
  if (!busy && !hasMatches) return null;

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
      {busy && !hasMatches ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Checking catalog…
        </p>
      ) : null}

      {tenantHits.length > 0 ? (
        <section className="space-y-1">
          <h3 className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Store className="size-3" aria-hidden />
            Already in your catalog
          </h3>
          <ul className="overflow-hidden rounded-md border border-border/70 bg-background divide-y divide-border/60">
            {tenantHits.map((hit) => {
              const thumb = itemListThumbnailUrl(hit);
              return (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => onOpenExisting(hit.id)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <SuggestionThumb
                      src={thumb}
                      fallback={<Package className="size-3 text-muted-foreground" aria-hidden />}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {itemCatalogDisplayTitle(hit)}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-muted-foreground">
                        {[hit.sku, hit.barcode].filter(Boolean).join(" · ") || "No SKU"}
                        {hit.active === false ? " · inactive" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-primary">Open</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {globalHits.length > 0 ? (
        <section className="space-y-1">
          <h3 className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Globe2 className="size-3" aria-hidden />
            Fill from library
          </h3>
          <ul className="overflow-hidden rounded-md border border-border/70 bg-background divide-y divide-border/60">
            {globalHits.map((hit) => {
              const sell = formatPrice(hit.recommendedSellingPrice);
              const already = hit.alreadyImported && hit.adoptedItemId;
              return (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (already && hit.adoptedItemId) {
                        onOpenExisting(hit.adoptedItemId);
                        return;
                      }
                      onUseGlobal(hit);
                    }}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <SuggestionThumb
                      src={hit.imageUrl}
                      fallback={<Globe2 className="size-3 text-muted-foreground" aria-hidden />}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {hit.name}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {[hit.brand, hit.size, hit.barcode, sell ? `sell ${sell}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-primary">
                      {already ? "Open" : "Use"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SuggestionThumb({
  src,
  fallback,
}: {
  src: string | null | undefined;
  fallback: React.ReactNode;
}) {
  return (
    <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted/60">
      {src ? (
        <Image
          src={src}
          alt=""
          width={28}
          height={28}
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        fallback
      )}
    </span>
  );
}
