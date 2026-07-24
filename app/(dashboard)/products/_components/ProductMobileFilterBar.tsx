"use client";

import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CatalogListApi } from "../_hooks/useCatalogList";
import {
  catalogFilterHintClass,
  catalogFilterInputClass,
  catalogFilterSelectClass,
} from "./catalog-list-styles";

type Props = {
  catalog: Pick<
    CatalogListApi,
    | "search"
    | "setSearch"
    | "debouncedSearch"
    | "filterCategoryId"
    | "setFilterCategoryId"
    | "catalogScope"
    | "setCatalogScope"
    | "sortedCategories"
    | "filterNoBarcode"
    | "setFilterNoBarcode"
    | "filterInactiveOnly"
    | "setFilterInactiveOnly"
    | "filterNoPrice"
    | "setFilterNoPrice"
    | "filterZeroStock"
    | "setFilterZeroStock"
    | "filterLowStock"
    | "setFilterLowStock"
    | "catalogStats"
    | "includeCategoryDescendants"
    | "setIncludeCategoryDescendants"
    | "resetFilters"
  >;
};

const ATTENTION_PILL_CLASS = cn(
  "inline-flex h-6 shrink-0 items-center gap-1 border px-1.5 text-[10px] font-medium transition-colors",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
);

export function ProductMobileFilterBar({ catalog }: Props) {
  const searchPending =
    catalog.search.trim() !== catalog.debouncedSearch.trim();

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border border-border bg-card p-2 lg:hidden">
      <div className="grid min-w-0 grid-cols-1 gap-1.5 md:grid-cols-[minmax(0,1fr)_minmax(0,10.5rem)_minmax(0,9.5rem)]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="catalog-omni"
            className={cn(catalogFilterInputClass, "h-8 pl-7 pr-7 text-xs")}
            value={catalog.search}
            onChange={(e) => catalog.setSearch(e.target.value)}
            placeholder="Search by name, SKU, barcode…"
            aria-label="Search catalog"
          />
          {catalog.search ? (
            <button
              type="button"
              onClick={() => catalog.setSearch("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <select
          className={cn(catalogFilterSelectClass, "h-8 min-w-0 w-full truncate")}
          value={catalog.filterCategoryId}
          onChange={(e) => catalog.setFilterCategoryId(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {catalog.sortedCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {!c.active ? " (inactive)" : ""}
            </option>
          ))}
        </select>
        <select
          className={cn(catalogFilterSelectClass, "h-8 min-w-0 w-full")}
          value={catalog.catalogScope}
          onChange={(e) =>
            catalog.setCatalogScope(
              e.target.value as typeof catalog.catalogScope,
            )
          }
          aria-label="Catalog scope"
        >
          <option value="ALL">All items</option>
          <option value="SKUS_ONLY">SKUs only</option>
          <option value="PARENTS_ONLY">Groups only</option>
          <option value="VARIANTS_ONLY">Variants only</option>
        </select>
      </div>
      {searchPending ? (
        <p className={catalogFilterHintClass}>Updating results…</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1">
        {(
          [
            [
              "No barcode",
              catalog.filterNoBarcode,
              () => catalog.setFilterNoBarcode((v: boolean) => !v),
              catalog.catalogStats.missingBarcode,
            ],
            [
              "No price",
              catalog.filterNoPrice,
              () => catalog.setFilterNoPrice((v: boolean) => !v),
              catalog.catalogStats.missingPrice,
            ],
            [
              "Zero stock",
              catalog.filterZeroStock,
              () => catalog.setFilterZeroStock((v: boolean) => !v),
              catalog.catalogStats.zeroStock,
            ],
            [
              "Low stock",
              catalog.filterLowStock,
              () => catalog.setFilterLowStock((v: boolean) => !v),
              catalog.catalogStats.lowStock,
            ],
            [
              "Inactive",
              catalog.filterInactiveOnly,
              () => catalog.setFilterInactiveOnly((v: boolean) => !v),
              catalog.catalogStats.inactive,
            ],
          ] as const
        ).map(([label, active, onClick, count]) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
              ATTENTION_PILL_CLASS,
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {label}
            <span
              className={cn(
                "tabular-nums",
                active ? "text-background/80" : "text-muted-foreground/80",
              )}
            >
              {count.toLocaleString()}
            </span>
          </button>
        ))}
        {catalog.filterCategoryId ? (
          <button
            type="button"
            onClick={() =>
              catalog.setIncludeCategoryDescendants((v: boolean) => !v)
            }
            aria-pressed={catalog.includeCategoryDescendants}
            className={cn(
              ATTENTION_PILL_CLASS,
              catalog.includeCategoryDescendants
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            Subcats
          </button>
        ) : null}
        <button
          type="button"
          onClick={catalog.resetFilters}
          className={cn(
            ATTENTION_PILL_CLASS,
            "ml-auto border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
          )}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
