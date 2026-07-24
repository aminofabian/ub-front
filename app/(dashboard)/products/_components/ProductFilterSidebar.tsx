"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogListApi } from "../_hooks/useCatalogList";
import {
  catalogFilterBodyClass,
  catalogFilterCheckboxClass,
  catalogFilterColumnClass,
  catalogFilterHintClass,
  catalogFilterInputClass,
  catalogFilterLabelClass,
  catalogFilterOptionClass,
  catalogFilterSectionClass,
  catalogFilterSelectClass,
  catalogFilterToolbarClass,
  catalogFilterToolbarTitleClass,
} from "./catalog-list-styles";

type Props = {
  catalog: Pick<
    CatalogListApi,
    | "search"
    | "setSearch"
    | "debouncedSearch"
    | "barcodeExact"
    | "setBarcodeExact"
    | "filterCategoryId"
    | "setFilterCategoryId"
    | "catalogScope"
    | "setCatalogScope"
    | "sortedCategories"
    | "includeCategoryDescendants"
    | "setIncludeCategoryDescendants"
    | "filterNoBarcode"
    | "filterInactiveOnly"
    | "filterNoPrice"
    | "filterZeroStock"
    | "filterLowStock"
    | "stockFiltersNeedBranch"
    | "resetFilters"
  >;
};

function hasActiveFilters(catalog: Props["catalog"]): boolean {
  return (
    !!catalog.debouncedSearch.trim() ||
    !!catalog.barcodeExact.trim() ||
    !!catalog.filterCategoryId.trim() ||
    catalog.catalogScope !== "ALL" ||
    catalog.filterNoBarcode ||
    catalog.filterInactiveOnly ||
    catalog.filterNoPrice ||
    catalog.filterZeroStock ||
    catalog.filterLowStock ||
    (!!catalog.filterCategoryId.trim() && !catalog.includeCategoryDescendants)
  );
}

export function ProductFilterSidebar({ catalog }: Props) {
  const filtersActive = useMemo(() => hasActiveFilters(catalog), [catalog]);
  const searchPending = catalog.search.trim() !== catalog.debouncedSearch.trim();
  const categorySelected = !!catalog.filterCategoryId.trim();

  return (
    <aside className={catalogFilterColumnClass}>
      <div className={catalogFilterToolbarClass}>
        <span className={catalogFilterToolbarTitleClass}>Find</span>
        {filtersActive ? (
          <button
            type="button"
            onClick={catalog.resetFilters}
            className="text-[10px] font-medium text-primary hover:underline"
          >
            Reset
          </button>
        ) : null}
      </div>

      <form
        className={catalogFilterBodyClass}
        onSubmit={(e) => e.preventDefault()}
      >
        <label className={catalogFilterSectionClass}>
          <span className={catalogFilterLabelClass}>Search</span>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="catalog-omni"
              className={cn(catalogFilterInputClass, "pl-7 pr-7")}
              value={catalog.search}
              onChange={(e) => catalog.setSearch(e.target.value)}
              placeholder="Name, SKU, barcode"
              aria-label="Search catalog"
            />
            {catalog.search ? (
              <button
                type="button"
                onClick={() => catalog.setSearch("")}
                className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3" aria-hidden />
              </button>
            ) : null}
          </div>
          <span className={catalogFilterHintClass}>
            {searchPending
              ? "Updating…"
              : catalog.debouncedSearch.trim()
                ? "All departments"
                : "/ to focus"}
          </span>
        </label>

        <label className={catalogFilterSectionClass}>
          <span className={catalogFilterLabelClass}>Barcode</span>
          <input
            className={cn(catalogFilterInputClass, "font-mono")}
            value={catalog.barcodeExact}
            onChange={(e) => catalog.setBarcodeExact(e.target.value)}
            placeholder="Exact POS scan"
            inputMode="numeric"
            aria-label="Exact barcode"
          />
        </label>

        <div className={catalogFilterSectionClass}>
          <span className={catalogFilterLabelClass}>Category</span>
          <select
            className={catalogFilterSelectClass}
            value={catalog.filterCategoryId}
            onChange={(e) => catalog.setFilterCategoryId(e.target.value)}
            aria-label="Category"
          >
            <option value="">All</option>
            {catalog.sortedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {!c.active ? " (off)" : ""}
              </option>
            ))}
          </select>
          {categorySelected ? (
            <label className={cn(catalogFilterOptionClass, "mt-0.5")}>
              <input
                type="checkbox"
                className={catalogFilterCheckboxClass}
                checked={catalog.includeCategoryDescendants}
                onChange={(e) =>
                  catalog.setIncludeCategoryDescendants(e.target.checked)
                }
              />
              <span>Include subcategories</span>
            </label>
          ) : null}
        </div>

        <label className={catalogFilterSectionClass}>
          <span className={catalogFilterLabelClass}>List view</span>
          <select
            className={catalogFilterSelectClass}
            value={catalog.catalogScope}
            onChange={(e) =>
              catalog.setCatalogScope(e.target.value as typeof catalog.catalogScope)
            }
            aria-label="Catalog list view"
          >
            <option value="ALL">All rows</option>
            <option value="SKUS_ONLY">SKUs only</option>
            <option value="PARENTS_ONLY">Parents only</option>
            <option value="VARIANTS_ONLY">Variants only</option>
          </select>
        </label>

        {catalog.stockFiltersNeedBranch &&
        (catalog.filterZeroStock || catalog.filterLowStock) ? (
          <p className={catalogFilterHintClass}>
            Pick a branch in the header to filter by stock.
          </p>
        ) : null}
      </form>
    </aside>
  );
}
