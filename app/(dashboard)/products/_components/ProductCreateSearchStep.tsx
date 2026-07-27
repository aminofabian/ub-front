"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  Globe2,
  Loader2,
  Package,
  Plus,
  Search,
  Store,
} from "lucide-react";

import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import {
  fetchItemsPage,
  itemListThumbnailUrl,
  lookupGlobalCatalogProducts,
  type GlobalProductRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";
import { cn } from "@/lib/utils";

import { productFormInputClass, productFormLabelClass } from "./product-form-styles";

const SEARCH_DEBOUNCE_MS = 280;
const MIN_QUERY_LEN = 2;
const TENANT_RESULT_LIMIT = 8;
const GLOBAL_RESULT_LIMIT = 8;
const BARCODE_DIGIT_MIN = 6;

type Props = {
  canGlobalCatalog: boolean;
  onOpenExisting: (itemId: string) => void;
  onUseGlobal: (product: GlobalProductRecord) => void;
  onCreateNew: (seed: { name: string; barcode: string }) => void;
  onCreateGroup: () => void;
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

export function ProductCreateSearchStep({
  canGlobalCatalog,
  onOpenExisting,
  onUseGlobal,
  onCreateNew,
  onCreateGroup,
}: Props) {
  const [query, setQuery] = useState("");
  const [tenantHits, setTenantHits] = useState<ItemSummaryRecord[]>([]);
  const [globalHits, setGlobalHits] = useState<GlobalProductRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < MIN_QUERY_LEN) {
      const idle = window.setTimeout(() => {
        setTenantHits([]);
        setGlobalHits([]);
        setBusy(false);
        setSearched(false);
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
            size: TENANT_RESULT_LIMIT,
            includeInactive: true,
          });
        }
        const exact = await fetchItemsPage(undefined, {
          barcode: trimmed,
          page: 0,
          size: TENANT_RESULT_LIMIT,
          includeInactive: true,
        });
        if (exact.content.length > 0) return exact;
        return fetchItemsPage(trimmed, {
          page: 0,
          size: TENANT_RESULT_LIMIT,
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
          setGlobalHits(globalRows.slice(0, GLOBAL_RESULT_LIMIT));
          setSearched(true);
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setTenantHits([]);
          setGlobalHits([]);
          setSearched(true);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setBusy(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, canGlobalCatalog]);

  const trimmed = query.trim();
  const canContinue =
    trimmed.length > 0 && (queryLooksLikeBarcode(trimmed) || trimmed.length >= MIN_QUERY_LEN);
  const seed = queryLooksLikeBarcode(trimmed)
    ? { name: "", barcode: trimmed }
    : { name: trimmed, barcode: "" };

  const hasMatches = tenantHits.length > 0 || globalHits.length > 0;
  const showCreateCta = canContinue && !busy;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className={cn(productFormLabelClass, "normal-case")}>
          Start by searching
        </p>
        <div className="flex gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canContinue) {
                  e.preventDefault();
                  onCreateNew(seed);
                }
              }}
              placeholder="Type a name, SKU, or barcode"
              className={cn(productFormInputClass, "pl-8 pr-2")}
              aria-label="Search existing products"
            />
          </div>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-input/80 bg-background text-muted-foreground shadow-sm hover:bg-muted"
            aria-label="Scan barcode"
            title="Scan barcode"
          >
            <Camera className="size-3.5" aria-hidden />
          </button>
        </div>
        {!trimmed ? (
          <p className="text-[10px] leading-snug text-muted-foreground">
            We check your catalog (and the product library) so you don’t add
            the same item twice. If nothing matches, you’ll create a new one.
          </p>
        ) : trimmed.length < MIN_QUERY_LEN && !queryLooksLikeBarcode(trimmed) ? (
          <p className="text-[10px] leading-snug text-muted-foreground">
            Keep typing — search starts after 2 characters.
          </p>
        ) : (
          <p className="text-[10px] leading-snug text-muted-foreground">
            Pick a match below, or create a new product with this name.
          </p>
        )}
      </div>

      {busy ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Searching…
        </p>
      ) : null}

      {searched && !busy && !hasMatches ? (
        <p className="rounded-md border border-dashed border-border/70 bg-muted/20 px-2.5 py-2 text-xs text-muted-foreground">
          No matches found. Create a new product to continue.
        </p>
      ) : null}

      {tenantHits.length > 0 ? (
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Store className="size-3" aria-hidden />
            Already in your catalog
          </h3>
          <ul className="overflow-hidden rounded-md border border-border/70 divide-y divide-border/60">
            {tenantHits.map((hit) => {
              const thumb = itemListThumbnailUrl(hit);
              const inactive = hit.active === false;
              return (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => onOpenExisting(hit.id)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted/60">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt=""
                          width={28}
                          height={28}
                          unoptimized
                          className="size-full object-cover"
                        />
                      ) : (
                        <Package className="size-3 text-muted-foreground" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {itemCatalogDisplayTitle(hit)}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-muted-foreground">
                        {[hit.sku, hit.barcode].filter(Boolean).join(" · ") || "No SKU"}
                        {inactive ? " · inactive" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-primary">
                      Open
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {globalHits.length > 0 ? (
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Globe2 className="size-3" aria-hidden />
            From the product library
          </h3>
          <ul className="overflow-hidden rounded-md border border-border/70 divide-y divide-border/60">
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
                    <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted/60">
                      {hit.imageUrl ? (
                        <Image
                          src={hit.imageUrl}
                          alt=""
                          width={28}
                          height={28}
                          unoptimized
                          className="size-full object-cover"
                        />
                      ) : (
                        <Globe2 className="size-3 text-muted-foreground" aria-hidden />
                      )}
                    </span>
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

      <div className="flex flex-col gap-1.5 border-t border-border/50 pt-2">
        {showCreateCta ? (
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onCreateNew(seed)}
          >
            <Plus className="size-3.5" aria-hidden />
            {hasMatches ? "None of these — create new" : "Create new product"}
          </Button>
        ) : (
          <p className="rounded-md bg-muted/40 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
            Type in the search box above to continue.
          </p>
        )}
        <button
          type="button"
          onClick={onCreateGroup}
          className="text-left text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Creating variants (sizes, colors)? Start a product group
        </button>
      </div>

      {scannerOpen ? (
        <BarcodeScanner
          onScan={(barcode) => {
            setQuery(barcode);
            setScannerOpen(false);
            inputRef.current?.focus();
          }}
          onClose={() => setScannerOpen(false)}
        />
      ) : null}
    </div>
  );
}
