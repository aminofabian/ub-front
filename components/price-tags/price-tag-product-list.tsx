"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { TAG_CHIP, TAG_CHIP_IDLE, TAG_CHIP_ON, TAG_HAIRLINE, TAG_STRIP } from "@/components/price-tags/price-tag-chrome";
import { CopiesInput, DraftNumberInput, FIELD_CLASS } from "@/components/price-tags/price-tag-inputs";
import type { CatalogScope } from "@/components/price-tags/use-catalog-run";
import type { PriceTagJob } from "@/components/price-tags/use-price-tag-job";
import { CATALOG_BTN_GHOST, CATALOG_BTN_PRIMARY } from "@/app/(dashboard)/products/_components/catalog-chrome";
import { useDashboard } from "@/components/dashboard-provider";
import { UNASSIGNED_SHELF_ZONE_VALUE } from "@/hooks/use-session-scope";
import {
  fetchAisles,
  fetchCategories,
  fetchItemsPage,
  fetchSuppliersPage,
  type AisleRecord,
  type CategoryRecord,
  type FetchItemsOpts,
  type SupplierRecord,
} from "@/lib/api";
import { resolvedWasPrice } from "@/lib/price-tags/face";
import { tagPriceLabel, toAmount } from "@/lib/price-tags/money";
import { tagProductFromSummary } from "@/lib/price-tags/product";
import { MAX_COPIES, copiesOf } from "@/lib/price-tags/slots";
import { MAX_QUEUED_TAGS } from "@/lib/price-tags/storage";
import type { TagProduct } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const LIST_PAGE_SIZE = 40;

/** The column the price-tag list actually scrolls in (the picker panel). */
function scrollParent(node: HTMLElement): HTMLElement | null {
  let current = node.parentElement;
  while (current) {
    const overflow = getComputedStyle(current).overflowY;
    if (overflow === "auto" || overflow === "scroll") return current;
    current = current.parentElement;
  }
  return null;
}
const BULK_PAGE_SIZE = 100;

function toTagProducts(rows: Parameters<typeof tagProductFromSummary>[0][]): TagProduct[] {
  return rows.map(tagProductFromSummary).filter((row): row is TagProduct => row != null);
}

export function PriceTagProductList({
  job,
  branchId,
  currency,
  showWasInput,
  showBarcode,
  onShowBarcode,
  onPrintAll,
}: {
  job: PriceTagJob;
  branchId: string | null | undefined;
  currency: string | null | undefined;
  showWasInput: boolean;
  /** Print the product barcode on each tag, and only when the product has one. */
  showBarcode: boolean;
  onShowBarcode: (on: boolean) => void;
  /** Opens the non-stop run for everything the current search and filters match. */
  onPrintAll?: (scope: CatalogScope) => void;
}) {
  const {
    itemTypeId,
    setItemTypeId,
    aisleId,
    setAisleId,
    itemTypes,
    headerScopeReady,
  } = useDashboard();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [noPrice, setNoPrice] = useState(false);
  const [noBarcode, setNoBarcode] = useState(false);
  const [zeroStock, setZeroStock] = useState(false);
  const [lowStock, setLowStock] = useState(false);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [aisles, setAisles] = useState<AisleRecord[]>([]);
  const [rows, setRows] = useState<TagProduct[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  /** Products read so far, against the catalogue total, while a bulk add is running. */
  const [bulk, setBulk] = useState<{ seen: number; total: number } | null>(null);
  const [showSelected, setShowSelected] = useState(false);
  const scanning = useRef(false);
  const scanQueue = useRef<{ code: string; onlyListed: TagProduct | null }[]>([]);
  /** Only the newest list request may fill the list; filters can change faster than replies arrive. */
  const listRequest = useRef(0);
  /** Set before the await, so a still-visible sentinel cannot start a second page. */
  const paging = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<() => void>(() => {});

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void fetchCategories()
      .then((categoryRows) => {
        if (!cancelled) setCategories(categoryRows.filter((row) => row.active));
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load categories");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const gathered: SupplierRecord[] = [];
      try {
        for (let index = 0; index < 10; index += 1) {
          const result = await fetchSuppliersPage({ page: index, size: 100 });
          gathered.push(...result.content);
          if (result.last) break;
        }
        if (!cancelled) {
          setSuppliers(
            gathered
              .filter((row) => (row.status || "").toLowerCase() !== "inactive")
              .sort((a, b) => a.name.localeCompare(b.name, "en")),
          );
        }
      } catch {
        if (!cancelled) setSuppliers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchAisles({ itemTypeId: itemTypeId || null })
      .then((list) => {
        if (!cancelled) setAisles(list.filter((row) => row.active));
      })
      .catch(() => {
        // Shelf zones are optional; the other filters still work without them.
        if (!cancelled) setAisles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [itemTypeId]);

  const filters = useCallback(
    (): FetchItemsOpts => ({
      catalogScope: "SKUS_ONLY",
      categoryId: categoryId || undefined,
      includeCategoryDescendants: true,
      itemTypeId: itemTypeId || undefined,
      aisleUnset: aisleId === UNASSIGNED_SHELF_ZONE_VALUE || undefined,
      aisleId: aisleId && aisleId !== UNASSIGNED_SHELF_ZONE_VALUE ? aisleId : undefined,
      linkedSupplierId: supplierId || undefined,
      noPrice: noPrice || undefined,
      noBarcode: noBarcode || undefined,
      zeroStock: zeroStock || undefined,
      lowStock: lowStock || undefined,
      branchId: branchId || undefined,
      sort: [{ property: "name", direction: "asc" }],
    }),
    [categoryId, itemTypeId, aisleId, supplierId, noPrice, noBarcode, zeroStock, lowStock, branchId],
  );

  const hasQuery =
    debouncedSearch.length > 0 ||
    Boolean(categoryId || itemTypeId || aisleId || supplierId || noPrice || noBarcode || zeroStock || lowStock);

  /** The current filters in plain words, e.g. "Dairy · Milk · search “fresh”". */
  function scopeSummary(): string {
    const parts: string[] = [];
    const department = itemTypes.find((row) => row.id === itemTypeId)?.label;
    const category = categories.find((row) => row.id === categoryId)?.name;
    const supplier = suppliers.find((row) => row.id === supplierId)?.name;
    const zone =
      aisleId === UNASSIGNED_SHELF_ZONE_VALUE
        ? "No shelf zone"
        : aisles.find((row) => row.id === aisleId)?.name;
    if (department) parts.push(department);
    if (category) parts.push(category);
    if (supplier) parts.push(supplier);
    if (zone) parts.push(`Shelf zone: ${zone}`);
    if (noPrice) parts.push("No price");
    if (noBarcode) parts.push("No barcode");
    if (zeroStock) parts.push("Out of stock");
    if (lowStock) parts.push("Low stock");
    if (debouncedSearch) parts.push(`search “${debouncedSearch}”`);
    return parts.length > 0 ? parts.join(" · ") : "The whole catalogue";
  }

  function wholeCatalogueScope(): CatalogScope {
    return {
      search: "",
      filters: {
        catalogScope: "SKUS_ONLY",
        includeCategoryDescendants: true,
        branchId: branchId || undefined,
        sort: [{ property: "name", direction: "asc" }],
      },
      summary: "The whole catalogue",
    };
  }

  const loadPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      listRequest.current += 1;
      const request = listRequest.current;
      paging.current = true;
      setListLoading(true);
      if (replace) {
        setRows([]);
        setHasMore(false);
      }
      try {
        const result = await fetchItemsPage(debouncedSearch || undefined, {
          ...filters(),
          page: nextPage,
          size: LIST_PAGE_SIZE,
        });
        if (request !== listRequest.current) return;
        const mapped = toTagProducts(result.content);
        setRows((current) => (replace ? mapped : current.concat(mapped)));
        setHasMore(!result.last);
        setPage(nextPage);
      } catch {
        if (request === listRequest.current) toast.error("Could not load products");
      } finally {
        if (request === listRequest.current) {
          paging.current = false;
          setListLoading(false);
        }
      }
    },
    [debouncedSearch, filters],
  );

  // With no filter the list browses the whole catalogue. The next page loads
  // when the end of the list scrolls into view. Adding all of it to one sheet
  // stays behind a filter.
  useEffect(() => {
    // Wait until the header department and shelf zone have been restored, or the
    // first page is the whole catalogue and the header looks ignored.
    if (!headerScopeReady) return;
    void loadPage(0, true);
  }, [headerScopeReady, loadPage]);

  loadMoreRef.current = () => {
    if (paging.current || !hasMore || showSelected) return;
    void loadPage(page + 1, false);
  };

  useEffect(() => {
    if (showSelected || !hasMore || listLoading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const root = scrollParent(sentinel);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { root, rootMargin: "160px 0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, showSelected, listLoading, rows.length]);

  function reportAdded(added: number, offered: number) {
    if (added === 0 && offered > 0) {
      toast.message(
        job.instances.length >= MAX_QUEUED_TAGS
          ? `The sheet holds ${MAX_QUEUED_TAGS.toLocaleString("en-KE")} tags. Print these first.`
          : "Those products are already on the sheet.",
      );
      return;
    }
    toast.success(added === 1 ? "Added 1 product" : `Added ${added.toLocaleString("en-KE")} products`);
  }

  async function addEveryMatch() {
    setBulkBusy(true);
    setBulk({ seen: 0, total: 0 });
    try {
      let seen = 0;
      let added = 0;
      let offered = 0;
      let onSheet = job.instances.length;
      let complete = false;
      const maxPages = Math.ceil(MAX_QUEUED_TAGS / BULK_PAGE_SIZE);
      for (let index = 0; index < maxPages; index += 1) {
        const result = await fetchItemsPage(debouncedSearch || undefined, {
          ...filters(),
          page: index,
          size: BULK_PAGE_SIZE,
        });
        const mapped = toTagProducts(result.content);
        const cap = Math.min(result.totalElements, MAX_QUEUED_TAGS);
        seen += mapped.length;
        offered += mapped.length;
        const pageAdded = job.addProducts(mapped);
        added += pageAdded;
        onSheet += pageAdded;
        setBulk({ seen: Math.min(seen, cap || seen), total: cap || seen });
        if (result.last || seen >= MAX_QUEUED_TAGS) {
          complete = result.last;
          break;
        }
      }
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduceMotion && seen > 0) {
        await new Promise((resolve) => setTimeout(resolve, 320));
      }
      reportAdded(added, offered);
      const sheetFull = onSheet >= MAX_QUEUED_TAGS;
      if (!complete || (sheetFull && added > 0 && added < offered)) {
        toast.warning(
          `The sheet holds ${MAX_QUEUED_TAGS.toLocaleString("en-KE")} tags. Print these, then add the rest — or use Print whole catalogue.`,
        );
      }
    } catch {
      toast.error("Could not add the matching products");
    } finally {
      setBulk(null);
      setBulkBusy(false);
    }
  }

  async function lookUpCode(code: string, onlyListed: TagProduct | null): Promise<void> {
    const base = { catalogScope: "SKUS_ONLY" as const, branchId: branchId || undefined, size: 5 };
    let hits = toTagProducts((await fetchItemsPage(undefined, { ...base, barcode: code })).content);
    if (hits.length === 0) {
      const lower = code.toLowerCase();
      const text = await fetchItemsPage(code, { ...base, size: 20 });
      hits = toTagProducts(text.content).filter(
        (row) => row.sku.toLowerCase() === lower || row.barcode === code,
      );
    }
    if (hits.length === 0 && onlyListed) hits = [onlyListed];
    if (hits.length === 1) {
      const copies = job.addOneCopy(hits[0]);
      toast.success(`${hits[0].name} · ${copies} on the sheet`);
      return;
    }
    // Give the code back so it can be corrected, unless the next scan is already being typed.
    setSearch((current) => (current === "" ? code : current));
    toast.message(
      hits.length > 1
        ? `${hits.length} products share “${code}”. Tick the right one below.`
        : `No exact barcode or SKU match for “${code}”.`,
    );
  }

  /**
   * Enter in the search box: a scanned barcode or typed SKU goes straight onto
   * the sheet. The box clears at once and codes queue, so a fast second scan
   * is neither glued onto the first nor dropped while the first is looked up.
   */
  function addByCode() {
    const code = search.trim();
    if (!code) return;
    const onlyListed = rows.length === 1 && debouncedSearch === code ? rows[0] : null;
    setSearch("");
    scanQueue.current.push({ code, onlyListed });
    if (scanning.current) return;
    scanning.current = true;
    void (async () => {
      try {
        for (let next = scanQueue.current.shift(); next; next = scanQueue.current.shift()) {
          try {
            await lookUpCode(next.code, next.onlyListed);
          } catch {
            toast.error(`Could not look up “${next.code}”`);
          }
        }
      } finally {
        scanning.current = false;
      }
    })();
  }

  const visibleRows = showSelected
    ? job.selectedIds.map((id) => job.products.get(id)).filter((row): row is TagProduct => row != null)
    : rows;

  return (
    <>
      {/* Pinned while the list scrolls, so a scan or a new filter never needs a scroll back up. */}
      <div className={cn("sticky top-0 z-10 flex flex-col gap-2 border-b bg-[var(--catalog-shelf,#FCFAF5)] px-3 py-2.5", TAG_HAIRLINE)}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addByCode();
            }
          }}
          placeholder="Search by name, SKU, or scan a barcode"
          aria-label="Search the catalog"
          autoComplete="off"
          enterKeyHint="done"
          className={cn(FIELD_CLASS, "h-9 px-3 pointer-coarse:h-11")}
        />
        <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
          <select
            aria-label="Department"
            value={itemTypeId}
            onChange={(event) => {
              setItemTypeId(event.target.value);
              setAisleId("");
            }}
            className={FIELD_CLASS}
          >
            <option value="">All departments</option>
            {itemTypes.filter((type) => type.active).map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Shelf zone"
            value={aisleId}
            onChange={(event) => setAisleId(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">All shelf zones</option>
            <option value={UNASSIGNED_SHELF_ZONE_VALUE}>No shelf zone</option>
            {aisles.map((row) => (
              <option key={row.id} value={row.id}>
                {row.code ? `${row.code} · ${row.name}` : row.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Supplier"
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            className={cn(FIELD_CLASS, "col-span-2 lg:col-span-1")}
          >
            <option value="">All suppliers</option>
            {suppliers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </div>
        <div className={TAG_STRIP} role="group" aria-label="More filters">
          {(
            [
              ["No price", noPrice, () => setNoPrice((on) => !on), false],
              ["No barcode", noBarcode, () => setNoBarcode((on) => !on), false],
              ["Out of stock", zeroStock, () => setZeroStock((on) => !on), !branchId],
              ["Low stock", lowStock, () => setLowStock((on) => !on), !branchId],
            ] as const
          ).map(([label, on, toggle, disabled]) => (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              title={disabled ? "Choose a branch first." : undefined}
              className={cn(TAG_CHIP, "px-2", on ? TAG_CHIP_ON : TAG_CHIP_IDLE)}
              onClick={toggle}
            >
              {label}
            </button>
          ))}
        </div>
        {bulk ? (
          <CatalogueAddProgress seen={bulk.seen} total={bulk.total} />
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className={cn(CATALOG_BTN_PRIMARY, "pointer-coarse:h-10")}
                disabled={bulkBusy}
                title={
                  hasQuery
                    ? undefined
                    : `Adds every product, up to ${MAX_QUEUED_TAGS.toLocaleString("en-KE")} tags. Print whole catalogue sends them all.`
                }
                onClick={() => {
                  if (hasQuery) {
                    void addEveryMatch();
                    return;
                  }
                  const limit = MAX_QUEUED_TAGS.toLocaleString("en-KE");
                  toast("Add the whole catalogue to the sheet?", {
                    id: "price-tags-whole-catalogue",
                    description: `The sheet holds ${limit} tags. Print whole catalogue sends every product.`,
                    duration: 12_000,
                    action: {
                      label: "Add",
                      onClick: () => {
                        void addEveryMatch();
                      },
                    },
                  });
                }}
              >
                {hasQuery ? "Add every match" : "Add whole catalogue"}
              </button>
              <button
                type="button"
                className={cn(CATALOG_BTN_GHOST, "pointer-coarse:h-10")}
                disabled={rows.length === 0}
                onClick={() => reportAdded(job.addProducts(rows), rows.length)}
              >
                Add listed
              </button>
              {onPrintAll && hasQuery ? (
                <button
                  type="button"
                  className={cn(CATALOG_BTN_GHOST, "pointer-coarse:h-10")}
                  title="Print every matching product in batches, without adding them to the sheet."
                  onClick={() => onPrintAll({ search: debouncedSearch, filters: filters(), summary: scopeSummary() })}
                >
                  Print matches…
                </button>
              ) : null}
              {onPrintAll ? (
                <button
                  type="button"
                  className={cn(CATALOG_BTN_GHOST, "pointer-coarse:h-10")}
                  title="Print every product in the catalogue, in batches, without adding them to the sheet."
                  onClick={() => onPrintAll(wholeCatalogueScope())}
                >
                  Print whole catalogue…
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <label className="flex h-8 items-center gap-1.5 text-[12.5px] text-[#556159] pointer-coarse:h-10">
                <input
                  type="checkbox"
                  className="size-4 accent-[#1D4B3B]"
                  checked={showBarcode}
                  onChange={(event) => onShowBarcode(event.target.checked)}
                />
                Show barcode
              </label>
              <button
                type="button"
                className={cn(CATALOG_BTN_GHOST, "pointer-coarse:h-10", showSelected && "text-[#1D4B3B]")}
                aria-pressed={showSelected}
                onClick={() => setShowSelected((current) => !current)}
              >
                {showSelected ? "Show search" : "Show selected"}
              </button>
            </div>
          </div>
        )}
      </div>

      <ul>
        {visibleRows.length === 0 ? (
          <li className="px-3 py-10 text-center font-[family-name:var(--font-cormorant)] text-[1.35rem] text-[#556159]">
            {showSelected
              ? job.restoring
                ? "Loading your sheet…"
                : "No products on the sheet."
              : listLoading || search.trim() !== debouncedSearch
                ? "Searching the catalog…"
                : hasQuery
                  ? "No products match."
                  : "The catalogue has no products yet."}
          </li>
        ) : null}
        {visibleRows.map((product) => {
          const copies = copiesOf(job.instances, product.id);
          const checked = copies > 0;
          return (
            <li
              key={product.id}
              className={cn(
                "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_6%,transparent)] px-3 py-2 transition-colors pointer-coarse:py-2.5",
                checked && "bg-[color-mix(in_srgb,#1D4B3B_5%,transparent)]",
              )}
            >
              <input
                type="checkbox"
                className="size-4 accent-[#1D4B3B] pointer-coarse:size-5"
                checked={checked}
                aria-label={`Select ${product.name}`}
                onChange={() => {
                  if (checked) job.dropProducts([product.id]);
                  else reportAdded(job.addProducts([product]), 1);
                }}
              />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[var(--catalog-ink,#121A16)]">
                  {product.name}
                </p>
                <p className="truncate font-[family-name:var(--font-geist-mono)] text-[11px] text-[#556159]">
                  {showBarcode && product.barcode ? `${product.barcode} · ` : ""}
                  <span className={product.sellingPrice == null ? "text-[#A55237]" : undefined}>
                    {tagPriceLabel(product.sellingPrice, currency)}
                    {product.pricePer ? ` / ${product.pricePer}` : ""}
                  </span>
                </p>
                {checked && showWasInput ? (
                  <label className="mt-1 flex items-center gap-1 text-[11px] text-[#556159]">
                    Was
                    <DraftNumberInput
                      value={resolvedWasPrice(product, job.wasOverrides)}
                      inputMode="decimal"
                      placeholder="Optional"
                      aria-label={`Previous price for ${product.name}`}
                      className="h-6 w-20 px-1"
                      parse={(text) => (/^\d*(\.\d*)?$/.test(text) ? toAmount(text) : null)}
                      onValue={(value) => job.setWasOverride(product.id, value)}
                      onEmpty={() => job.setWasOverride(product.id, null)}
                    />
                  </label>
                ) : null}
              </div>
              <CopiesInput
                label={product.name}
                value={copies}
                max={MAX_COPIES}
                disabled={!checked}
                onChange={(count) => job.setCopiesFor(product.id, count)}
              />
            </li>
          );
        })}
      </ul>
      {!showSelected && hasMore ? (
        <div
          ref={sentinelRef}
          className="flex min-h-12 items-center justify-center py-3 text-[12px] text-[#556159]"
          aria-live="polite"
        >
          {listLoading && rows.length > 0 ? "Loading…" : <span className="sr-only">More products load as you scroll</span>}
        </div>
      ) : null}
    </>
  );
}

/** Fills as each catalogue page lands on the sheet. Scale, not width, so the bar stays on the compositor. */
function CatalogueAddProgress({ seen, total }: { seen: number; total: number }) {
  const share = total > 0 ? Math.min(1, seen / total) : 0;
  const counted = total > 0 ? `${seen.toLocaleString("en-KE")} of ${total.toLocaleString("en-KE")}` : "Reading the catalogue";
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        <span className="text-[var(--catalog-ink,#121A16)]">Adding to the sheet</span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[#556159]">{counted}</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden bg-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)]"
        role="progressbar"
        aria-label={counted}
        aria-valuemin={0}
        aria-valuemax={Math.max(total, 1)}
        aria-valuenow={seen}
      >
        <div
          className="h-full w-full origin-left bg-[#1D4B3B] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `scaleX(${share})` }}
        />
      </div>
    </div>
  );
}
