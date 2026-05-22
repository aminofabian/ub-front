"use client";

import { useMemo } from "react";
import {
  AlignJustify,
  Info,
  LayoutList,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { CatalogListApi } from "../_hooks/useCatalogList";
import type { ItemSummaryRecord } from "@/lib/api";
import {
  catalogListShellClass,
  catalogListToolbarClass,
  catalogListToolbarMetaClass,
} from "./catalog-list-styles";
import { VirtualizedCatalogBody } from "./VirtualizedCatalogBody";

type Props = {
  catalog: CatalogListApi;
  selectedId: string | null;
  onRowClick: (id: string) => void;
  isRowActive: (row: ItemSummaryRecord) => boolean;
  canCatalogWrite: boolean;
  bulkDeleteBusy: boolean;
  onBulkDelete: () => void | Promise<void>;
};

export function CatalogListColumn({
  catalog,
  selectedId,
  onRowClick,
  isRowActive,
  canCatalogWrite,
  bulkDeleteBusy,
  onBulkDelete,
}: Props) {
  const selectionCount = catalog.rowSelection.size;
  const hasSelection = selectionCount > 0;

  const filtersActive = useMemo(() => {
    return (
      !!catalog.debouncedSearch.trim() ||
      !!catalog.filterCategoryId.trim() ||
      catalog.catalogScope !== "ALL" ||
      !!catalog.barcodeExact.trim() ||
      catalog.filterNoBarcode ||
      catalog.filterIncludeInactive
    );
  }, [
    catalog.debouncedSearch,
    catalog.filterCategoryId,
    catalog.catalogScope,
    catalog.barcodeExact,
    catalog.filterNoBarcode,
    catalog.filterIncludeInactive,
  ]);

  const loadedHint =
    catalog.listRows.length < catalog.listTotalElements
      ? `${catalog.listRows.length} loaded`
      : null;

  return (
    <div className="flex min-h-[12rem] min-w-0 max-w-full flex-1 flex-col gap-2 overflow-x-hidden lg:min-h-0 lg:overflow-hidden">
      <div className={catalogListToolbarClass}>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Catalog
            </h2>
            <p className={catalogListToolbarMetaClass}>
              <span className="tabular-nums font-semibold text-foreground">
                {catalog.listTotalElements.toLocaleString()}
              </span>{" "}
              in view
              {loadedHint ? (
                <span className="text-muted-foreground"> · {loadedHint}</span>
              ) : null}
            </p>
          </div>
          {filtersActive ? (
            <p className="text-[11px] text-muted-foreground">
              Filters applied — adjust in the sidebar or search
            </p>
          ) : (
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Parents, variants, and packages in one list
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="mr-0.5 hidden items-center gap-1 text-[10px] text-muted-foreground lg:inline-flex"
            title="Row colors: group · parent · product · variant"
          >
            <Info className="size-3" aria-hidden />
            <span className="sr-only">Row type legend shown on list rows</span>
          </span>
          <div
            className="flex rounded-lg border border-border/55 bg-background/80 p-0.5 shadow-sm"
            role="group"
            aria-label="List density"
          >
            <Button
              type="button"
              size="sm"
              variant={
                catalog.listDensity === "comfortable" ? "secondary" : "ghost"
              }
              className="h-8 gap-1 rounded-md px-2.5 text-xs"
              onClick={() => catalog.setListDensity("comfortable")}
              aria-pressed={catalog.listDensity === "comfortable"}
            >
              <LayoutList className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Comfort</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={catalog.listDensity === "dense" ? "secondary" : "ghost"}
              className="h-8 gap-1 rounded-md px-2.5 text-xs"
              onClick={() => catalog.setListDensity("dense")}
              aria-pressed={catalog.listDensity === "dense"}
            >
              <AlignJustify className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Compact</span>
            </Button>
          </div>
        </div>
      </div>

      {hasSelection ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 shadow-sm",
            "border-primary/25 bg-primary/[0.07] ring-1 ring-inset ring-primary/12",
          )}
        >
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {selectionCount} selected
          </span>
          <div className="flex items-center gap-1.5">
            {canCatalogWrite ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 gap-1 rounded-lg text-xs"
                disabled={bulkDeleteBusy}
                onClick={() => void onBulkDelete()}
              >
                {bulkDeleteBusy ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden />
                )}
                Delete
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1 rounded-lg text-xs"
              disabled={bulkDeleteBusy}
              onClick={() => catalog.setRowSelection(new Set())}
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        <VirtualizedCatalogBody
          rows={catalog.listRows}
          categoryById={catalog.categoryById}
          variantIdsByParentId={catalog.variantIdsByParent}
          selectedId={selectedId}
          selectedIds={catalog.rowSelection}
          density={catalog.listDensity}
          onRowClick={onRowClick}
          onToggleRowSelect={catalog.onToggleRowSelect}
          isRowActive={isRowActive}
          loadingMore={catalog.listLoadingMore}
          hasMore={!catalog.listLast}
          onLoadMore={catalog.loadMoreCatalog}
          initialLoading={catalog.listLoadingInitial}
        />
      </div>
    </div>
  );
}
