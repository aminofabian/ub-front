"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { filterLabelClass, quickInputClass } from "../_types";
import type { CatalogListApi } from "../_hooks/useCatalogList";

type Props = {
  catalog: Pick<CatalogListApi,
    "search" | "setSearch" | "barcodeExact" | "setBarcodeExact" |
    "filterCategoryId" | "setFilterCategoryId" |
    "catalogScope" | "setCatalogScope" | "sortedCategories" |
    "includeCategoryDescendants" | "setIncludeCategoryDescendants" |
    "filterNoBarcode" | "setFilterNoBarcode" |
    "filterIncludeInactive" | "setFilterIncludeInactive" |
    "resetFilters"
  >;
};

export function ProductFilterSidebar({ catalog }: Props) {
  return (
    <aside className="hidden lg:flex lg:max-h-none lg:w-56 lg:flex-col lg:gap-3 lg:overflow-y-auto lg:border-r lg:border-border/40 lg:pr-3 xl:w-64">
      <div className="flex items-center gap-2 text-foreground">
        <Filter className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Filters</h2>
      </div>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); }}>
        <label className="flex flex-col gap-1.5">
          <span className={filterLabelClass}>Search</span>
          <input id="catalog-omni" className={quickInputClass} value={catalog.search}
            onChange={(e) => catalog.setSearch(e.target.value)} placeholder="Name, SKU, barcode…" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={filterLabelClass}>Exact barcode</span>
          <input className={cn(quickInputClass, "font-mono text-xs")} value={catalog.barcodeExact}
            onChange={(e) => catalog.setBarcodeExact(e.target.value)} placeholder="POS lookup" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={filterLabelClass}>Category</span>
          <select className={cn(quickInputClass, "cursor-pointer py-2.5")} value={catalog.filterCategoryId}
            onChange={(e) => catalog.setFilterCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {catalog.sortedCategories.map((c) => <option key={c.id} value={c.id}>{c.name}{!c.active ? " (inactive)" : ""}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={filterLabelClass}>Scope</span>
          <select className={cn(quickInputClass, "cursor-pointer py-2.5")} value={catalog.catalogScope}
            onChange={(e) => catalog.setCatalogScope(e.target.value as typeof catalog.catalogScope)}>
            <option value="ALL">Full tree</option>
            <option value="SKUS_ONLY">Sellable SKUs only</option>
            <option value="PARENTS_ONLY">Group labels only</option>
            <option value="VARIANTS_ONLY">Option SKUs only</option>
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input type="checkbox" className="size-3.5 rounded border-input" checked={catalog.includeCategoryDescendants}
            onChange={(e) => catalog.setIncludeCategoryDescendants(e.target.checked)} disabled={!catalog.filterCategoryId.trim()} />
          Include subcategories
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input type="checkbox" className="size-3.5 rounded border-input" checked={catalog.filterNoBarcode}
            onChange={(e) => catalog.setFilterNoBarcode(e.target.checked)} /> Missing barcode
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input type="checkbox" className="size-3.5 rounded border-input" checked={catalog.filterIncludeInactive}
            onChange={(e) => catalog.setFilterIncludeInactive(e.target.checked)} /> Include inactive
        </label>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" size="sm" className="rounded-lg">Apply search</Button>
          <Button type="button" variant="secondary" size="sm" className="rounded-lg" onClick={catalog.resetFilters}>Reset</Button>
        </div>
      </form>
    </aside>
  );
}
