"use client";

import { useState } from "react";
import { Library, ListFilter, PackagePlus, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CatalogListApi } from "../_hooks/useCatalogList";
import {
  catalogFilterNeedsCountClass,
  catalogFilterNeedsRowActiveClass,
  catalogFilterNeedsRowClass,
  catalogFilterNeedsSheetClass,
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
    | "listTotalElements"
  >;
  canCreate: boolean;
  onCreateNew: () => void;
  onAddFromCatalog?: () => void;
  canAddFromCatalog?: boolean;
};

const SCOPE = [
  ["ALL", "All"],
  ["SKUS_ONLY", "SKUs"],
  ["PARENTS_ONLY", "Groups"],
  ["VARIANTS_ONLY", "Variants"],
] as const;

function countPanelFilters(catalog: Props["catalog"]): number {
  let n = 0;
  if (catalog.filterCategoryId.trim()) n += 1;
  if (catalog.filterNoBarcode) n += 1;
  if (catalog.filterNoPrice) n += 1;
  if (catalog.filterZeroStock) n += 1;
  if (catalog.filterLowStock) n += 1;
  if (catalog.filterInactiveOnly) n += 1;
  if (
    catalog.filterCategoryId.trim() &&
    !catalog.includeCategoryDescendants
  ) {
    n += 1;
  }
  return n;
}

const toolBtn = cn(
  "relative inline-flex size-10 shrink-0 items-center justify-center",
  "border-l border-border bg-background text-foreground/55 transition-colors",
  "hover:bg-muted/40 hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/40",
  "disabled:pointer-events-none disabled:opacity-40",
);

/**
 * Mobile catalog chrome — one sheet: search tools, scope, meta, optional filters.
 */
export function ProductMobileChrome({
  catalog,
  canCreate,
  onCreateNew,
  onAddFromCatalog,
  canAddFromCatalog = false,
}: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const searchPending =
    catalog.search.trim() !== catalog.debouncedSearch.trim();
  const panelCount = countPanelFilters(catalog);
  const panelForced = panelCount > 0;
  const showPanel = panelOpen || panelForced;
  const filtersDirty =
    panelCount > 0 ||
    catalog.catalogScope !== "ALL" ||
    Boolean(catalog.search.trim());

  const needs = (
    [
      [
        "No barcode",
        catalog.filterNoBarcode,
        () => catalog.setFilterNoBarcode((v) => !v),
        catalog.catalogStats.missingBarcode,
      ],
      [
        "No price",
        catalog.filterNoPrice,
        () => catalog.setFilterNoPrice((v) => !v),
        catalog.catalogStats.missingPrice,
      ],
      [
        "Out of stock",
        catalog.filterZeroStock,
        () => catalog.setFilterZeroStock((v) => !v),
        catalog.catalogStats.zeroStock,
      ],
      [
        "Low stock",
        catalog.filterLowStock,
        () => catalog.setFilterLowStock((v) => !v),
        catalog.catalogStats.lowStock,
      ],
      [
        "Inactive",
        catalog.filterInactiveOnly,
        () => catalog.setFilterInactiveOnly((v) => !v),
        catalog.catalogStats.inactive,
      ],
    ] as const
  ).filter(([, , , count]) => count > 0);

  return (
    <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background lg:hidden">
      <div className="flex flex-col">
        {/* Row 1 — search + tools as one bordered strip */}
        <div className="flex items-stretch border-b border-border">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-foreground/40"
              aria-hidden
            />
            <input
              id="catalog-omni"
              className={cn(
                "h-11 w-full border-0 bg-transparent pl-9 pr-9 text-[14px] text-foreground shadow-none",
                "placeholder:text-foreground/35",
                "focus-visible:outline-none focus-visible:ring-0",
              )}
              value={catalog.search}
              onChange={(e) => catalog.setSearch(e.target.value)}
              placeholder="Search products…"
              aria-label="Search catalog"
              enterKeyHint="search"
              autoCapitalize="off"
              autoCorrect="off"
            />
            {catalog.search ? (
              <button
                type="button"
                onClick={() => catalog.setSearch("")}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center text-foreground/40 hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={showPanel}
            aria-label="Filters"
            className={cn(
              toolBtn,
              (showPanel || panelCount > 0) &&
                "bg-foreground text-background hover:bg-foreground hover:text-background",
            )}
          >
            <ListFilter className="size-3.5" aria-hidden />
            {panelCount > 0 ? (
              <span className="absolute right-1 top-1 flex size-3.5 items-center justify-center bg-background text-[8px] font-bold tabular-nums text-foreground">
                {panelCount}
              </span>
            ) : null}
          </button>

          {onAddFromCatalog && canAddFromCatalog ? (
            <button
              type="button"
              disabled={!canCreate}
              onClick={onAddFromCatalog}
              className={toolBtn}
              aria-label="Add from library"
              title="Library"
            >
              <Library className="size-3.5" aria-hidden />
            </button>
          ) : null}

          <button
            type="button"
            disabled={!canCreate}
            onClick={onCreateNew}
            className={cn(
              toolBtn,
              "gap-1 px-3 text-[12px] font-semibold tracking-tight text-background",
              "bg-foreground hover:bg-foreground/90 hover:text-background",
              "disabled:bg-foreground/40 disabled:text-background/80",
            )}
            aria-label="New product"
          >
            <PackagePlus className="size-3.5" aria-hidden />
            <span>New</span>
          </button>
        </div>

        {/* Row 2 — scope as equal cells */}
        <div
          className="grid grid-cols-4 divide-x divide-border border-b border-border"
          role="tablist"
          aria-label="Catalog scope"
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
                  "h-9 text-[11px] font-medium tracking-tight transition-colors",
                  active
                    ? "bg-muted/50 font-semibold text-foreground"
                    : "bg-background text-foreground/50 hover:bg-muted/30 hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Row 3 — quiet meta */}
        <div className="flex h-8 items-center justify-between gap-2 bg-muted/15 px-3">
          <p className="text-[11px] font-medium tabular-nums tracking-tight text-foreground/50">
            {catalog.listTotalElements.toLocaleString()} products
            {searchPending ? (
              <span className="text-foreground/35"> · updating</span>
            ) : null}
          </p>
          {filtersDirty ? (
            <button
              type="button"
              onClick={() => {
                catalog.resetFilters();
                setPanelOpen(false);
              }}
              className="text-[11px] font-semibold tracking-tight text-foreground/55 hover:text-foreground"
            >
              Clear
            </button>
          ) : null}
        </div>

        {/* Expandable filters — same sheet language */}
        {showPanel ? (
          <div className="space-y-3 border-t border-border bg-background px-3 py-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/40">
                Category
              </p>
              <select
                className={cn(
                  catalogFilterSelectClass,
                  "h-10 w-full rounded-none text-[13px]",
                )}
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
              {catalog.filterCategoryId ? (
                <button
                  type="button"
                  onClick={() =>
                    catalog.setIncludeCategoryDescendants((v) => !v)
                  }
                  aria-pressed={catalog.includeCategoryDescendants}
                  className={cn(
                    "flex h-9 w-full items-center justify-between border border-border px-2.5 text-[12px] font-medium",
                    catalog.includeCategoryDescendants
                      ? "bg-muted/50 text-foreground"
                      : "bg-background text-foreground/55",
                  )}
                >
                  Include subcategories
                  <span className="text-[10px] uppercase tracking-wide text-foreground/40">
                    {catalog.includeCategoryDescendants ? "On" : "Off"}
                  </span>
                </button>
              ) : null}
            </div>

            {needs.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/40">
                  Needs
                </p>
                <div className={catalogFilterNeedsSheetClass}>
                  {needs.map(([label, active, onClick, count]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={onClick}
                      aria-pressed={active}
                      className={cn(
                        catalogFilterNeedsRowClass,
                        "h-9",
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
            ) : (
              <p className="text-[11px] text-foreground/45">
                No attention filters right now.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
