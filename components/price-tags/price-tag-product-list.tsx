"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CopiesInput, DraftNumberInput, FIELD_CLASS } from "@/components/price-tags/price-tag-inputs";
import type { PriceTagJob } from "@/components/price-tags/use-price-tag-job";
import { CATALOG_BTN_GHOST } from "@/app/(dashboard)/products/_components/catalog-chrome";
import {
  fetchAisles,
  fetchCategories,
  fetchItemsPage,
  fetchItemTypes,
  type AisleRecord,
  type CategoryRecord,
  type FetchItemsOpts,
  type ItemTypeRecord,
} from "@/lib/api";
import { resolvedWasPrice } from "@/lib/price-tags/face";
import { tagPriceLabel, toAmount } from "@/lib/price-tags/money";
import { tagProductFromSummary } from "@/lib/price-tags/product";
import { MAX_COPIES, copiesOf } from "@/lib/price-tags/slots";
import { MAX_QUEUED_TAGS } from "@/lib/price-tags/storage";
import type { TagProduct } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const NO_AISLE = "__none";
const LIST_PAGE_SIZE = 40;
const BULK_PAGE_SIZE = 100;

function toTagProducts(rows: Parameters<typeof tagProductFromSummary>[0][]): TagProduct[] {
  return rows.map(tagProductFromSummary).filter((row): row is TagProduct => row != null);
}

export function PriceTagProductList({
  job,
  branchId,
  currency,
  showWasInput,
}: {
  job: PriceTagJob;
  branchId: string | null | undefined;
  currency: string | null | undefined;
  showWasInput: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemTypeId, setItemTypeId] = useState("");
  const [aisle, setAisle] = useState("");
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [aisles, setAisles] = useState<AisleRecord[]>([]);
  const [rows, setRows] = useState<TagProduct[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showSelected, setShowSelected] = useState(false);
  const scanning = useRef(false);
  const scanQueue = useRef<{ code: string; onlyListed: TagProduct | null }[]>([]);
  /** Only the newest list request may fill the list; filters can change faster than replies arrive. */
  const listRequest = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchCategories(), fetchItemTypes()])
      .then(([categoryRows, typeRows]) => {
        if (cancelled) return;
        setCategories(categoryRows.filter((row) => row.active));
        setItemTypes(typeRows.filter((row) => row.active));
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load departments");
      });
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
      aisleUnset: aisle === NO_AISLE || undefined,
      aisleId: aisle && aisle !== NO_AISLE ? aisle : undefined,
      branchId: branchId || undefined,
      sort: [{ property: "name", direction: "asc" }],
    }),
    [categoryId, itemTypeId, aisle, branchId],
  );

  const loadPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      listRequest.current += 1;
      const request = listRequest.current;
      setListLoading(true);
      try {
        const result = await fetchItemsPage(debouncedSearch, {
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
        if (request === listRequest.current) setListLoading(false);
      }
    },
    [debouncedSearch, filters],
  );

  useEffect(() => {
    void loadPage(0, true);
  }, [loadPage]);

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
    try {
      const gathered: TagProduct[] = [];
      let complete = false;
      const maxPages = Math.ceil(MAX_QUEUED_TAGS / BULK_PAGE_SIZE);
      for (let index = 0; index < maxPages; index += 1) {
        const result = await fetchItemsPage(debouncedSearch, {
          ...filters(),
          page: index,
          size: BULK_PAGE_SIZE,
        });
        gathered.push(...toTagProducts(result.content));
        if (result.last) {
          complete = true;
          break;
        }
      }
      const added = job.addProducts(gathered);
      reportAdded(added, gathered.length);
      if (!complete || added < gathered.filter((row) => copiesOf(job.instances, row.id) === 0).length) {
        toast.warning("Not every match fit on this sheet. Narrow the filter and add the rest after printing.");
      }
    } catch {
      toast.error("Could not add the matching products");
    } finally {
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
      <div className="flex flex-col gap-2 px-3 py-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addByCode();
            }
          }}
          placeholder="Search, or scan a barcode and press Enter"
          aria-label="Search products or scan a barcode"
          autoComplete="off"
          className="h-9 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-2.5 text-[13px] outline-none focus:border-[#1D4B3B]"
        />
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label="Department"
            value={itemTypeId}
            onChange={(event) => {
              setItemTypeId(event.target.value);
              setAisle("");
            }}
            className={FIELD_CLASS}
          >
            <option value="">All departments</option>
            {itemTypes.map((type) => (
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
            value={aisle}
            onChange={(event) => setAisle(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">All shelf zones</option>
            <option value={NO_AISLE}>No shelf zone</option>
            {aisles.map((row) => (
              <option key={row.id} value={row.id}>
                {row.code ? `${row.code} · ${row.name}` : row.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={CATALOG_BTN_GHOST}
            disabled={rows.length === 0}
            onClick={() => reportAdded(job.addProducts(rows), rows.length)}
          >
            Add listed
          </button>
          <button
            type="button"
            className={CATALOG_BTN_GHOST}
            disabled={bulkBusy}
            onClick={() => void addEveryMatch()}
          >
            {bulkBusy ? "Adding…" : "Add every match"}
          </button>
          <button
            type="button"
            className={cn(CATALOG_BTN_GHOST, showSelected && "text-[#1D4B3B]")}
            aria-pressed={showSelected}
            onClick={() => setShowSelected((current) => !current)}
          >
            {showSelected ? "Show search" : "Show selected"}
          </button>
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-auto border-t border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_8%,transparent)]">
        {visibleRows.length === 0 && !(listLoading && !showSelected) ? (
          <li className="px-3 py-8 text-center font-[family-name:var(--font-cormorant)] text-[1.35rem] text-[#556159]">
            {showSelected
              ? job.restoring
                ? "Loading your sheet…"
                : "No products on the sheet."
              : "No products match."}
          </li>
        ) : null}
        {visibleRows.map((product) => {
          const copies = copiesOf(job.instances, product.id);
          const checked = copies > 0;
          return (
            <li
              key={product.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_6%,transparent)] px-3 py-2"
            >
              <input
                type="checkbox"
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
                <p className="truncate font-mono text-[11px] text-[#556159]">
                  {product.sku || "No SKU"}
                  {product.barcode ? ` · ${product.barcode}` : ""}
                  {" · "}
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
        <button
          type="button"
          className={cn(CATALOG_BTN_GHOST, "m-2")}
          disabled={listLoading}
          onClick={() => void loadPage(page + 1, false)}
        >
          {listLoading ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </>
  );
}
