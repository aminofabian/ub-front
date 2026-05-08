"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogListApi } from "../_hooks/useCatalogList";

type Props = {
  catalog: Pick<CatalogListApi,
    "search" | "setSearch" | "filterCategoryId" | "setFilterCategoryId" |
    "catalogScope" | "setCatalogScope" | "sortedCategories" |
    "filterNoBarcode" | "setFilterNoBarcode" |
    "filterIncludeInactive" | "setFilterIncludeInactive" |
    "includeCategoryDescendants" | "setIncludeCategoryDescendants" |
    "resetFilters"
  >;
};

export function ProductMobileFilterBar({ catalog }: Props) {
  return (
    <div className="lg:hidden flex flex-col gap-2 shrink-0 rounded-2xl border border-border/60 bg-card/90 p-3 shadow-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input id="catalog-omni" className="h-9 w-full rounded-xl border border-input/80 bg-background pl-9 pr-9 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 placeholder:text-muted-foreground/60"
          value={catalog.search} onChange={(e) => catalog.setSearch(e.target.value)} placeholder="Search by name, SKU, barcode…" aria-label="Search catalog" />
        {catalog.search && <button type="button" onClick={() => catalog.setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="size-3.5" /></button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className="h-9 w-full cursor-pointer rounded-xl border border-input/80 bg-background px-3 text-sm focus-visible:border-ring focus-visible:outline-none truncate"
          value={catalog.filterCategoryId} onChange={(e) => catalog.setFilterCategoryId(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {catalog.sortedCategories.map((c) => <option key={c.id} value={c.id}>{c.name}{!c.active ? " (inactive)" : ""}</option>)}
        </select>
        <select className="h-9 w-full cursor-pointer rounded-xl border border-input/80 bg-background px-3 text-sm focus-visible:border-ring focus-visible:outline-none"
          value={catalog.catalogScope} onChange={(e) => catalog.setCatalogScope(e.target.value as typeof catalog.catalogScope)} aria-label="Catalog scope">
          <option value="ALL">All items</option>
          <option value="SKUS_ONLY">SKUs only</option>
          <option value="PARENTS_ONLY">Groups only</option>
          <option value="VARIANTS_ONLY">Options only</option>
        </select>
      </div>
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
