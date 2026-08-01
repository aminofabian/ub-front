"use client";

import { useState } from "react";
import { Library, ListFilter, PackagePlus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CatalogListApi } from "../_hooks/useCatalogList";
import { catalogFilterSelectClass } from "./catalog-list-styles";

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

  const needs = (
    [
      ["No barcode", catalog.filterNoBarcode, () => catalog.setFilterNoBarcode((v) => !v), catalog.catalogStats.missingBarcode],
      ["No price", catalog.filterNoPrice, () => catalog.setFilterNoPrice((v) => !v), catalog.catalogStats.missingPrice],
      ["Out", catalog.filterZeroStock, () => catalog.setFilterZeroStock((v) => !v), catalog.catalogStats.zeroStock],
      ["Low", catalog.filterLowStock, () => catalog.setFilterLowStock((v) => !v), catalog.catalogStats.lowStock],
      ["Off", catalog.filterInactiveOnly, () => catalog.setFilterInactiveOnly((v) => !v), catalog.catalogStats.inactive],
    ] as const
  ).filter(([, , , count]) => count > 0);

  return (
    <div className="sticky top-0 z-20 flex shrink-0 flex-col gap-1.5 border-b border-border bg-background px-2 py-1.5 lg:hidden">
      <div className="flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
            aria-hidden
          />
          <input
            id="catalog-omni"
            className={cn(
              "h-9 w-full rounded-none border border-border bg-background pl-8 pr-8 text-[13px] shadow-none",
              "placeholder:text-foreground/35",
              "focus-visible:border-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/25",
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
              className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={showPanel}
          aria-label="More filters"
          className={cn(
            "relative inline-flex size-9 shrink-0 items-center justify-center rounded-none border transition-colors",
            showPanel || panelCount > 0
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          <ListFilter className="size-3.5" aria-hidden />
          {panelCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-none border border-border bg-background text-[9px] font-bold tabular-nums text-foreground">
              {panelCount}
            </span>
          ) : null}
        </button>

        {onAddFromCatalog && canAddFromCatalog ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canCreate}
            onClick={onAddFromCatalog}
            className="size-9 shrink-0 rounded-none border border-border bg-background shadow-none"
            aria-label="Add from library"
          >
            <Library className="size-3.5" aria-hidden />
          </Button>
        ) : null}

        <Button
          type="button"
          size="sm"
          disabled={!canCreate}
          onClick={onCreateNew}
          className="h-9 shrink-0 gap-1 rounded-none px-2.5 text-[12px] font-semibold shadow-none"
        >
          <PackagePlus className="size-3.5" aria-hidden />
          New
        </Button>
      </div>

      <div
        className="grid grid-cols-4 gap-px overflow-hidden rounded-none border border-border bg-border"
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
                "h-7 text-[11px] font-medium transition-colors",
                active
                  ? "bg-muted/40 font-semibold text-foreground"
                  : "bg-background text-foreground/55 hover:bg-muted/30 hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-0.5">
        <p className="text-[11px] font-medium tabular-nums tracking-tight text-foreground/50">
          {catalog.listTotalElements.toLocaleString()} products
          {searchPending ? " · updating…" : null}
        </p>
        {panelCount > 0 || catalog.catalogScope !== "ALL" || catalog.search ? (
          <button
            type="button"
            onClick={catalog.resetFilters}
            className="text-[11px] font-medium tracking-tight text-foreground/45 underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="flex flex-col gap-2 rounded-md border border-border/70 bg-muted/15 p-2">
          <select
            className={cn(
              catalogFilterSelectClass,
              "h-9 w-full rounded-md border-border/80 bg-background text-[13px]",
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
                "flex h-8 items-center justify-between rounded-md border px-2.5 text-[12px] font-medium",
                catalog.includeCategoryDescendants
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/80 bg-background text-muted-foreground",
              )}
            >
              Include subcategories
              <span className="text-[10px] opacity-70">
                {catalog.includeCategoryDescendants ? "ON" : "OFF"}
              </span>
            </button>
          ) : null}

          {needs.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              <p className="px-0.5 text-[11px] font-medium tracking-tight text-foreground/55">
                Needs attention
              </p>
              {needs.map(([label, active, onClick, count]) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  aria-pressed={active}
                  className={cn(
                    "flex h-8 items-center justify-between rounded-md px-2.5 text-[12px] font-medium transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "bg-background text-muted-foreground ring-1 ring-border/80 hover:text-foreground",
                  )}
                >
                  <span>{label}</span>
                  <span className="tabular-nums text-[11px] opacity-70">
                    {count.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-0.5 text-[11px] text-muted-foreground">
              Catalog looks healthy — no attention filters.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
