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
  catalogFilterNeedsCountClass,
  catalogFilterNeedsRowActiveClass,
  catalogFilterNeedsRowClass,
  catalogFilterNeedsSheetClass,
  catalogFilterOptionClass,
  catalogFilterScopeCellActiveClass,
  catalogFilterScopeCellClass,
  catalogFilterScopeGridClass,
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
    | "stockFiltersNeedBranch"
    | "resetFilters"
  >;
};

const SCOPE = [
  ["ALL", "All"],
  ["SKUS_ONLY", "For sale"],
  ["PARENTS_ONLY", "Families"],
  ["VARIANTS_ONLY", "Packs"],
] as const;

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

  const needs = (
    [
      ["No barcode", catalog.filterNoBarcode, () => catalog.setFilterNoBarcode((v) => !v), catalog.catalogStats.missingBarcode],
      ["No price", catalog.filterNoPrice, () => catalog.setFilterNoPrice((v) => !v), catalog.catalogStats.missingPrice],
      ["Out of stock", catalog.filterZeroStock, () => catalog.setFilterZeroStock((v) => !v), catalog.catalogStats.zeroStock],
      ["Low stock", catalog.filterLowStock, () => catalog.setFilterLowStock((v) => !v), catalog.catalogStats.lowStock],
      ["Inactive", catalog.filterInactiveOnly, () => catalog.setFilterInactiveOnly((v) => !v), catalog.catalogStats.inactive],
    ] as const
  ).filter(([, , , count]) => count > 0);

  return (
    <aside className={catalogFilterColumnClass}>
      <div className={catalogFilterToolbarClass}>
        <span className={catalogFilterToolbarTitleClass}>Find</span>
        {filtersActive ? (
          <button
            type="button"
            onClick={catalog.resetFilters}
            className="text-[10px] font-medium tracking-tight text-foreground/45 hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>

      <form
        className={catalogFilterBodyClass}
        onSubmit={(e) => e.preventDefault()}
      >
        <label className={catalogFilterSectionClass}>
          <span className={catalogFilterLabelClass}>Find</span>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/70"
              aria-hidden
            />
            <input
              id="catalog-omni"
              className={cn(catalogFilterInputClass, "pl-6 pr-6")}
              value={catalog.search}
              onChange={(e) => catalog.setSearch(e.target.value)}
              placeholder="Name or code"
              aria-label="Search products"
            />
            {catalog.search ? (
              <button
                type="button"
                onClick={() => catalog.setSearch("")}
                className="absolute right-0.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3" aria-hidden />
              </button>
            ) : null}
          </div>
          <span className={catalogFilterHintClass}>
            {searchPending ? "Updating…" : "/ to focus"}
          </span>
        </label>

        <div className={catalogFilterSectionClass}>
          <span className={catalogFilterLabelClass}>Show</span>
          <div
            className={catalogFilterScopeGridClass}
            role="tablist"
            aria-label="Catalog list view"
          >
            {SCOPE.map(([value, label]) => {
              const active = catalog.catalogScope === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => catalog.setCatalogScope(value)}
                  className={cn(
                    catalogFilterScopeCellClass,
                    active && catalogFilterScopeCellActiveClass,
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

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
            <label className={cn(catalogFilterOptionClass, "mt-0.5 px-0.5")}>
              <input
                type="checkbox"
                className={catalogFilterCheckboxClass}
                checked={catalog.includeCategoryDescendants}
                onChange={(e) =>
                  catalog.setIncludeCategoryDescendants(e.target.checked)
                }
              />
              <span className="text-[10px]">Subcats</span>
            </label>
          ) : null}
        </div>

        <label className={catalogFilterSectionClass}>
          <span className={catalogFilterLabelClass}>Barcode</span>
          <input
            className={cn(catalogFilterInputClass, "font-mono")}
            value={catalog.barcodeExact}
            onChange={(e) => catalog.setBarcodeExact(e.target.value)}
            placeholder="Exact scan"
            inputMode="numeric"
            aria-label="Exact barcode"
          />
        </label>

        {needs.length > 0 ? (
          <div className={catalogFilterSectionClass}>
            <span className={catalogFilterLabelClass}>Needs</span>
            <div className={catalogFilterNeedsSheetClass}>
              {needs.map(([label, active, onClick, count]) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  aria-pressed={active}
                  className={cn(
                    catalogFilterNeedsRowClass,
                    active && catalogFilterNeedsRowActiveClass,
                  )}
                >
                  <span className="min-w-0 truncate">{label}</span>
                  <span className={catalogFilterNeedsCountClass}>
                    {count.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {catalog.stockFiltersNeedBranch &&
        (catalog.filterZeroStock || catalog.filterLowStock) ? (
          <p className={catalogFilterHintClass}>
            Pick a branch to filter stock.
          </p>
        ) : null}
      </form>
    </aside>
  );
}
