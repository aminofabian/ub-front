"use client";

import { Search, X } from "lucide-react";

import { dashboardInputClass, dashboardSelectClass } from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import type { CatalogListApi } from "../_hooks/useCatalogList";

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
    | "filterIncludeInactive"
    | "setFilterIncludeInactive"
    | "includeCategoryDescendants"
    | "setIncludeCategoryDescendants"
    | "resetFilters"
  >;
};

export function ProductMobileFilterBar({ catalog }: Props) {
  const searchPending =
    catalog.search.trim() !== catalog.debouncedSearch.trim();

  return (
    <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-border/70 bg-card p-2.5 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04] lg:hidden">
      <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,10.5rem)_minmax(0,9.5rem)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id="catalog-omni"
            className={cn(dashboardInputClass(), "h-9 py-1.5 pl-8 pr-8 text-sm")}
            value={catalog.search}
            onChange={(e) => catalog.setSearch(e.target.value)}
            placeholder="Search by name, SKU, barcode…"
            aria-label="Search catalog"
          />
          {catalog.search ? (
            <button
              type="button"
              onClick={() => catalog.setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <select
          className={cn(dashboardSelectClass(), "h-9 min-w-0 w-full truncate text-sm")}
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
          className={cn(dashboardSelectClass(), "h-9 min-w-0 w-full text-sm")}
          value={catalog.catalogScope}
          onChange={(e) => catalog.setCatalogScope(e.target.value as typeof catalog.catalogScope)}
          aria-label="Catalog scope"
        >
          <option value="ALL">All items</option>
          <option value="SKUS_ONLY">SKUs only</option>
          <option value="PARENTS_ONLY">Groups only</option>
          <option value="VARIANTS_ONLY">Variants only</option>
        </select>
      </div>
      {searchPending ? (
        <p className="-mt-1 text-[10px] text-muted-foreground">Updating results…</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          ["No barcode", catalog.filterNoBarcode, () => catalog.setFilterNoBarcode((v: boolean) => !v)],
          ["+ Inactive", catalog.filterIncludeInactive, () => catalog.setFilterIncludeInactive((v: boolean) => !v)],
        ].map(([label, active, onClick]) => (
          <button key={label as string} type="button" onClick={onClick as () => void}
            className={cn("inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[11px] font-medium transition-colors",
              active ? "border-foreground bg-foreground text-background" : "border-border/70 bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground")}>
            {label as string}
          </button>
        ))}
        {catalog.filterCategoryId && (
          <button type="button" onClick={() => catalog.setIncludeCategoryDescendants((v: boolean) => !v)}
            className={cn("inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[11px] font-medium transition-colors",
              catalog.includeCategoryDescendants ? "border-foreground bg-foreground text-background" : "border-border/70 bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground")}>Subcats</button>
        )}
        <button type="button" onClick={catalog.resetFilters}
          className="ml-auto inline-flex h-7 shrink-0 items-center rounded-full border border-border/70 bg-background px-3 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">Reset</button>
      </div>
    </div>
  );
}
