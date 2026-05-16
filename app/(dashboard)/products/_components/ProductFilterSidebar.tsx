"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { filterLabelClass, quickInputClass } from "../_types";
import type { CatalogListApi } from "../_hooks/useCatalogList";

type Props = {
  catalog: Pick<
    CatalogListApi,
    | "search"
    | "setSearch"
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
    | "filterIncludeInactive"
    | "setFilterIncludeInactive"
    | "resetFilters"
  >;
};

const fieldClass = "flex w-full min-w-0 flex-col gap-1.5";
const controlClass = cn(quickInputClass, "w-full min-w-0");

export function ProductFilterSidebar({ catalog }: Props) {
  return (
    <aside
      className={cn(
        "hidden min-h-0 w-full max-w-full shrink-0 flex-col border-border/40 lg:flex lg:w-[min(16rem,30vw)] lg:max-w-[18rem] lg:border-r lg:pr-3 xl:max-w-[19rem]",
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border/35 pb-2.5 text-foreground">
        <Filter className="size-4 shrink-0 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
      </div>
      <form
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pt-3 pr-0.5"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label className={fieldClass}>
          <span className={filterLabelClass}>Search</span>
          <input
            id="catalog-omni"
            className={controlClass}
            value={catalog.search}
            onChange={(e) => catalog.setSearch(e.target.value)}
            placeholder="Name, SKU, barcode…"
          />
        </label>
        <label className={fieldClass}>
          <span className={filterLabelClass}>Exact barcode</span>
          <input
            className={cn(controlClass, "font-mono text-xs")}
            value={catalog.barcodeExact}
            onChange={(e) => catalog.setBarcodeExact(e.target.value)}
            placeholder="POS lookup"
          />
        </label>
        <label className={fieldClass}>
          <span className={filterLabelClass}>Category</span>
          <select
            className={cn(controlClass, "cursor-pointer")}
            value={catalog.filterCategoryId}
            onChange={(e) => catalog.setFilterCategoryId(e.target.value)}
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
        <label className={fieldClass}>
          <span className={filterLabelClass}>Scope</span>
          <select
            className={cn(controlClass, "cursor-pointer")}
            value={catalog.catalogScope}
            onChange={(e) =>
              catalog.setCatalogScope(e.target.value as typeof catalog.catalogScope)
            }
          >
            <option value="ALL">Full tree</option>
            <option value="SKUS_ONLY">Sellable SKUs only</option>
            <option value="PARENTS_ONLY">Group labels only</option>
            <option value="VARIANTS_ONLY">Variant SKUs only</option>
          </select>
        </label>
        <div className="flex flex-col gap-2.5 border-t border-border/30 pt-1">
          <label className="flex w-full cursor-pointer items-start gap-2.5 text-xs leading-snug text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 shrink-0 rounded border-input"
              checked={catalog.includeCategoryDescendants}
              onChange={(e) => catalog.setIncludeCategoryDescendants(e.target.checked)}
              disabled={!catalog.filterCategoryId.trim()}
            />
            <span className="min-w-0">Include subcategories</span>
          </label>
          <label className="flex w-full cursor-pointer items-start gap-2.5 text-xs leading-snug text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 shrink-0 rounded border-input"
              checked={catalog.filterNoBarcode}
              onChange={(e) => catalog.setFilterNoBarcode(e.target.checked)}
            />
            <span className="min-w-0">Missing barcode</span>
          </label>
          <label className="flex w-full cursor-pointer items-start gap-2.5 text-xs leading-snug text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 shrink-0 rounded border-input"
              checked={catalog.filterIncludeInactive}
              onChange={(e) => catalog.setFilterIncludeInactive(e.target.checked)}
            />
            <span className="min-w-0">Include inactive</span>
          </label>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 border-t border-border/30 pt-3 sm:flex-row sm:flex-wrap">
          <Button type="submit" size="sm" className="w-full shrink-0 rounded-lg sm:w-auto sm:flex-1">
            Apply search
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full shrink-0 rounded-lg sm:w-auto sm:flex-1"
            onClick={catalog.resetFilters}
          >
            Reset
          </Button>
        </div>
      </form>
    </aside>
  );
}
