"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layers, Loader2, Power, Trash2, Warehouse, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { CatalogListApi } from "../_hooks/useCatalogList";
import type { ItemSummaryRecord } from "@/lib/api";
import {
  catalogListToolbarClass,
  catalogListToolbarMetaClass,
  type CatalogListDisplayType,
} from "./catalog-list-styles";
import { CatalogLetterJumpRail } from "./CatalogLetterJumpRail";
import type { CatalogLetterKey } from "./catalog-letter-index";
import {
  VirtualizedCatalogBody,
  type VirtualizedCatalogBodyHandle,
} from "./VirtualizedCatalogBody";

type Props = {
  catalog: CatalogListApi;
  selectedId: string | null;
  onRowClick: (id: string) => void;
  isRowActive: (row: ItemSummaryRecord) => boolean;
  canCatalogWrite: boolean;
  canInventoryWrite: boolean;
  bulkDeleteBusy: boolean;
  bulkChangeDepartmentBusy?: boolean;
  bulkActivateBusy?: boolean;
  onBulkDelete: () => void | Promise<void>;
  onBulkChangeDepartment?: () => void;
  onBulkActivate?: () => void;
  onBulkAdjustStock?: () => void;
  onAddFromCatalog?: () => void;
  canAddFromCatalog?: boolean;
  onCreateNew?: () => void;
  canCreateNew?: boolean;
};

const ROW_TYPE_LEGEND: {
  id: CatalogListDisplayType;
  label: string;
}[] = [
  { id: "parent", label: "Families" },
  { id: "variant", label: "Packs" },
  { id: "standalone", label: "Items" },
];

export function CatalogListColumn({
  catalog,
  selectedId,
  onRowClick,
  isRowActive,
  canCatalogWrite,
  canInventoryWrite,
  bulkDeleteBusy,
  bulkChangeDepartmentBusy = false,
  bulkActivateBusy = false,
  onBulkDelete,
  onBulkChangeDepartment,
  onBulkActivate,
  onBulkAdjustStock,
  onAddFromCatalog,
  canAddFromCatalog = false,
  onCreateNew,
  canCreateNew = false,
}: Props) {
  const selectionCount = catalog.rowSelection.size;
  const hasSelection = selectionCount > 0;
  const selectionBusy = bulkDeleteBusy || bulkChangeDepartmentBusy || bulkActivateBusy;
  const listBodyRef = useRef<VirtualizedCatalogBodyHandle>(null);
  const pendingScrollIndexRef = useRef<number | null>(null);
  const [activeLetter, setActiveLetter] = useState<CatalogLetterKey | null>(
    null,
  );

  const filtersActive = useMemo(() => {
    return (
      !!catalog.debouncedSearch.trim() ||
      !!catalog.filterCategoryId.trim() ||
      catalog.catalogScope !== "ALL" ||
      !!catalog.barcodeExact.trim() ||
      catalog.attentionFiltersActive
    );
  }, [
    catalog.debouncedSearch,
    catalog.filterCategoryId,
    catalog.catalogScope,
    catalog.barcodeExact,
    catalog.attentionFiltersActive,
  ]);

  const loadedHint =
    catalog.listRows.length < catalog.listTotalElements
      ? `${catalog.listRows.length} loaded`
      : null;

  const scrollToPending = useCallback(() => {
    const index = pendingScrollIndexRef.current;
    if (index == null) return;
    if (index >= catalog.displayRows.length) return;
    listBodyRef.current?.scrollToIndex(index);
    pendingScrollIndexRef.current = null;
  }, [catalog.displayRows.length]);

  useEffect(() => {
    scrollToPending();
  }, [scrollToPending, catalog.displayRows.length]);

  const jumpToLetter = catalog.jumpToLetter;

  const handleLetterJump = useCallback(
    async (letter: CatalogLetterKey) => {
      setActiveLetter(letter);
      const index = await jumpToLetter(letter);
      if (index < 0) {
        setActiveLetter(null);
        return;
      }
      pendingScrollIndexRef.current = index;
      scrollToPending();
    },
    [jumpToLetter, scrollToPending],
  );

  const onToggleSelectAllLoaded = useCallback(() => {
    const loadedIds = catalog.displayRows.map((row) => row.id);
    if (loadedIds.length === 0) return;
    const allSelected = loadedIds.every((id) => catalog.rowSelection.has(id));
    if (allSelected) {
      catalog.setRowSelection(new Set());
      return;
    }
    catalog.setRowSelection(new Set(loadedIds));
  }, [catalog]);

  return (
    <div className="flex min-h-[12rem] min-w-0 max-w-full flex-1 flex-col gap-0 overflow-x-hidden lg:min-h-0 lg:overflow-hidden">
      {hasSelection ? (
        <div
          className={cn(
            catalogListToolbarClass,
            "border-primary/25 bg-primary/[0.07]",
          )}
        >
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {selectionCount} selected
          </span>
          <div className="flex items-center gap-1">
            {canCatalogWrite && onBulkActivate ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 border px-2 text-xs"
                disabled={selectionBusy}
                onClick={onBulkActivate}
              >
                {bulkActivateBusy ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Power className="size-3.5" aria-hidden />
                )}
                <span className="sm:hidden">Active</span>
                <span className="hidden sm:inline">Mark active</span>
              </Button>
            ) : null}
            {canInventoryWrite && onBulkAdjustStock ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 border px-2 text-xs"
                disabled={selectionBusy}
                onClick={onBulkAdjustStock}
              >
                <Warehouse className="size-3.5" aria-hidden />
                <span className="sm:hidden">Stock</span>
                <span className="hidden sm:inline">Adjust stock</span>
              </Button>
            ) : null}
            {canCatalogWrite && onBulkChangeDepartment ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 border px-2 text-xs"
                disabled={selectionBusy}
                onClick={onBulkChangeDepartment}
              >
                {bulkChangeDepartmentBusy ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Layers className="size-3.5" aria-hidden />
                )}
                <span className="sm:hidden">Department</span>
                <span className="hidden sm:inline">Change department</span>
              </Button>
            ) : null}
            {canCatalogWrite ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-7 gap-1 border px-2 text-xs"
                disabled={selectionBusy}
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
              className="h-7 gap-1 rounded-md px-2 text-xs"
              disabled={selectionBusy}
              onClick={() => catalog.setRowSelection(new Set())}
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <div className={cn(catalogListToolbarClass, "hidden lg:flex")}>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className={catalogListToolbarMetaClass}>
              <span className="tabular-nums font-medium text-foreground">
                {catalog.listTotalElements.toLocaleString()}
              </span>{" "}
              products
              {loadedHint ? (
                <span className="text-muted-foreground"> · {loadedHint}</span>
              ) : null}
              {filtersActive ? (
                <span className="text-muted-foreground"> · filtered</span>
              ) : null}
            </p>
            <p
              className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 border-l border-border/40 pl-2 text-[10px] text-muted-foreground"
              aria-label="Row type counts"
            >
              {ROW_TYPE_LEGEND.map(({ id, label }, index) => {
                const count = catalog.rowTypeCounts[id];
                return (
                  <span key={id} className="inline-flex items-center gap-0.5">
                    {index > 0 ? (
                      <span className="text-border" aria-hidden>
                        ·
                      </span>
                    ) : null}
                    <span className="tabular-nums font-semibold text-foreground">
                      {count.toLocaleString()}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                );
              })}
            </p>
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden lg:pr-5">
        <VirtualizedCatalogBody
          ref={listBodyRef}
          rows={catalog.displayRows}
          categoryById={catalog.categoryById}
          variantIdsByParentId={catalog.variantIdsByParent}
          selectedId={selectedId}
          selectedIds={catalog.rowSelection}
          density="dense"
          onRowClick={onRowClick}
          onToggleRowSelect={catalog.onToggleRowSelect}
          onToggleSelectAllLoaded={onToggleSelectAllLoaded}
          isRowActive={isRowActive}
          loadingMore={catalog.listLoadingMore || catalog.letterJumpBusy}
          hasMore={!catalog.listLast}
          onLoadMore={catalog.loadMoreCatalog}
          initialLoading={catalog.listLoadingInitial}
          catalogEmpty={
            catalog.listTotalElements === 0 &&
            !catalog.listLoadingInitial &&
            !filtersActive
          }
          onAddFromCatalog={onAddFromCatalog}
          canAddFromCatalog={canAddFromCatalog}
          onCreateNew={onCreateNew}
          canCreateNew={canCreateNew}
        />
        {catalog.displayRows.length > 0 ? (
          <CatalogLetterJumpRail
            rows={catalog.displayRows}
            listComplete={catalog.listLast && !catalog.listLoadingInitial}
            busy={catalog.letterJumpBusy}
            activeLetter={activeLetter}
            onJump={(letter) => void handleLetterJump(letter)}
            className="hidden lg:flex"
          />
        ) : null}
      </div>
    </div>
  );
}
