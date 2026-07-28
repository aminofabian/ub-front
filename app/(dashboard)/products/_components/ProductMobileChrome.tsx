"use client";

import { useState } from "react";
import {
  Library,
  ListFilter,
  PackagePlus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CatalogListApi } from "../_hooks/useCatalogList";
import {
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

const CHIP = cn(
  "inline-flex h-8 shrink-0 items-center gap-1.5 border px-2.5 text-[11px] font-medium transition-colors",
  "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
);

function countExtraFilters(catalog: Props["catalog"]): number {
  let n = 0;
  if (catalog.filterCategoryId.trim()) n += 1;
  if (catalog.catalogScope !== "ALL") n += 1;
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
  const [moreOpen, setMoreOpen] = useState(false);
  const searchPending =
    catalog.search.trim() !== catalog.debouncedSearch.trim();
  const extraCount = countExtraFilters(catalog);
  const attentionActive =
    catalog.filterNoBarcode ||
    catalog.filterNoPrice ||
    catalog.filterZeroStock ||
    catalog.filterLowStock ||
    catalog.filterInactiveOnly;
  const anyFilter =
    attentionActive || extraCount > 0 || !!catalog.search.trim();

  const attention = (
    [
      ["No barcode", catalog.filterNoBarcode, () => catalog.setFilterNoBarcode((v) => !v), catalog.catalogStats.missingBarcode],
      ["No price", catalog.filterNoPrice, () => catalog.setFilterNoPrice((v) => !v), catalog.catalogStats.missingPrice],
      ["Out", catalog.filterZeroStock, () => catalog.setFilterZeroStock((v) => !v), catalog.catalogStats.zeroStock],
      ["Low", catalog.filterLowStock, () => catalog.setFilterLowStock((v) => !v), catalog.catalogStats.lowStock],
      ["Off", catalog.filterInactiveOnly, () => catalog.setFilterInactiveOnly((v) => !v), catalog.catalogStats.inactive],
    ] as const
  ).filter(([, , , count]) => count > 0);

  return (
    <div className="sticky top-0 z-20 flex shrink-0 flex-col gap-2 border-b border-border bg-background/95 px-3 pb-2.5 pt-2 backdrop-blur-md lg:hidden supports-[backdrop-filter]:bg-background/85">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Catalog
          </p>
          <h1 className="truncate font-heading text-lg font-semibold tracking-tight text-foreground">
            <span className="tabular-nums">
              {catalog.listTotalElements.toLocaleString()}
            </span>{" "}
            products
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onAddFromCatalog && canAddFromCatalog ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canCreate}
              onClick={onAddFromCatalog}
              className="size-9 border border-border bg-card shadow-none"
              aria-label="Add from library"
            >
              <Library className="size-4" aria-hidden />
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={!canCreate}
            onClick={onCreateNew}
            className="h-9 gap-1.5 rounded-none px-3 text-xs font-semibold shadow-none"
          >
            <PackagePlus className="size-3.5" aria-hidden />
            New
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          id="catalog-omni"
          className={cn(
            "h-11 w-full border border-border bg-card pl-9 pr-9 text-sm shadow-none",
            "placeholder:text-muted-foreground/55",
            "focus-visible:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
          )}
          value={catalog.search}
          onChange={(e) => catalog.setSearch(e.target.value)}
          placeholder="Search name, SKU, or barcode"
          aria-label="Search catalog"
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
        />
        {catalog.search ? (
          <button
            type="button"
            onClick={() => catalog.setSearch("")}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {searchPending ? (
        <p className="text-[10px] text-muted-foreground">Updating…</p>
      ) : null}

      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={cn(
            CHIP,
            moreOpen || extraCount > 0
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card text-foreground",
          )}
        >
          <SlidersHorizontal className="size-3" aria-hidden />
          Filters
          {extraCount > 0 ? (
            <span className="tabular-nums opacity-80">{extraCount}</span>
          ) : null}
        </button>

        {(
          [
            ["ALL", "All"],
            ["SKUS_ONLY", "SKUs"],
            ["PARENTS_ONLY", "Groups"],
            ["VARIANTS_ONLY", "Variants"],
          ] as const
        ).map(([value, label]) => {
          const active = catalog.catalogScope === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => catalog.setCatalogScope(value)}
              aria-pressed={active}
              className={cn(
                CHIP,
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/80 bg-card text-muted-foreground",
              )}
            >
              {label}
            </button>
          );
        })}

        {attention.map(([label, active, onClick, count]) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
              CHIP,
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border/80 bg-card text-muted-foreground",
            )}
          >
            {label}
            <span className="tabular-nums opacity-75">
              {count.toLocaleString()}
            </span>
          </button>
        ))}

        {anyFilter ? (
          <button
            type="button"
            onClick={catalog.resetFilters}
            className={cn(CHIP, "border-dashed border-border bg-transparent text-muted-foreground")}
          >
            Clear
          </button>
        ) : null}
      </div>

      {moreOpen ? (
        <div className="grid grid-cols-1 gap-2 border border-border bg-card p-2">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </span>
            <select
              className={cn(catalogFilterSelectClass, "h-10 w-full text-sm")}
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
          </label>
          {catalog.filterCategoryId ? (
            <button
              type="button"
              onClick={() =>
                catalog.setIncludeCategoryDescendants((v) => !v)
              }
              aria-pressed={catalog.includeCategoryDescendants}
              className={cn(
                CHIP,
                "w-full justify-center",
                catalog.includeCategoryDescendants
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              <ListFilter className="size-3" aria-hidden />
              Include subcategories
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
