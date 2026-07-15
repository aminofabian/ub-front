"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { CatalogListApi } from "../_hooks/useCatalogList";
import type { ItemSummaryRecord } from "@/lib/api";
import {
  catalogListToolbarClass,
  catalogListToolbarMetaClass,
  catalogListToolbarFilterCheckboxClass,
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
  bulkDeleteBusy: boolean;
  onBulkDelete: () => void | Promise<void>;
  onAddFromCatalog?: () => void;
  canAddFromCatalog?: boolean;
};

const ROW_TYPE_FILTERS: {
  id: CatalogListDisplayType;
  label: string;
  swatch: string;
}[] = [
  { id: "parent", label: "Parents", swatch: "bg-teal-500" },
  { id: "variant", label: "Variants", swatch: "bg-foreground" },
  { id: "standalone", label: "Standalones", swatch: "bg-emerald-500" },
];

export function CatalogListColumn({
  catalog,
  selectedId,
  onRowClick,
  isRowActive,
  canCatalogWrite,
  bulkDeleteBusy,
  onBulkDelete,
  onAddFromCatalog,
  canAddFromCatalog = false,
}: Props) {
  const selectionCount = catalog.rowSelection.size;
  const hasSelection = selectionCount > 0;
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
      catalog.attentionFiltersActive ||
      catalog.rowTypeFilterActive
    );
  }, [
    catalog.debouncedSearch,
    catalog.filterCategoryId,
    catalog.catalogScope,
    catalog.barcodeExact,
    catalog.attentionFiltersActive,
    catalog.rowTypeFilterActive,
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

  return (
    <div className="flex min-h-[12rem] min-w-0 max-w-full flex-1 flex-col gap-0 overflow-x-hidden lg:min-h-0 lg:overflow-hidden">
      <div className={catalogListToolbarClass}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
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
            {catalog.debouncedSearch.trim() ? (
              <span className="text-muted-foreground">
                {" "}
                · searching all departments
              </span>
            ) : null}
          </p>
          <div
            className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 border-l border-border/40 pl-2"
            role="group"
            aria-label="Filter by row type"
          >
            {ROW_TYPE_FILTERS.map(({ id, label, swatch }) => {
              const checked = catalog.rowTypeFilter.has(id);
              const count = catalog.rowTypeCounts[id];
              return (
                <label
                  key={id}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground",
                    checked && "text-foreground",
                  )}
                >
                  <input
                    type="checkbox"
                    className={catalogListToolbarFilterCheckboxClass(id)}
                    checked={checked}
                    onChange={() => catalog.toggleRowTypeFilter(id)}
                    aria-label={`${label}: ${count.toLocaleString()}`}
                  />
                  <span className={cn("size-1.5 shrink-0", swatch)} aria-hidden />
                  <span className="tabular-nums font-semibold text-foreground">
                    {count.toLocaleString()}
                  </span>
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {hasSelection ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 border-y border-r border-border px-2.5 py-1.5",
            "border-primary/25 bg-primary/[0.07]",
          )}
        >
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {selectionCount} selected
          </span>
          <div className="flex items-center gap-1">
            {canCatalogWrite ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-7 gap-1 border px-2 text-xs"
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
              className="h-7 gap-1 rounded-md px-2 text-xs"
              disabled={bulkDeleteBusy}
              onClick={() => catalog.setRowSelection(new Set())}
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-hidden pr-4">
        <VirtualizedCatalogBody
          ref={listBodyRef}
          rows={catalog.displayRows}
          categoryById={catalog.categoryById}
          variantIdsByParentId={catalog.variantIdsByParent}
          selectedId={selectedId}
          selectedIds={catalog.rowSelection}
          density={catalog.listDensity}
          onRowClick={onRowClick}
          onToggleRowSelect={catalog.onToggleRowSelect}
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
        />
        {catalog.displayRows.length > 0 ? (
          <CatalogLetterJumpRail
            rows={catalog.displayRows}
            listComplete={catalog.listLast && !catalog.listLoadingInitial}
            busy={catalog.letterJumpBusy}
            activeLetter={activeLetter}
            onJump={(letter) => void handleLetterJump(letter)}
          />
        ) : null}
      </div>
    </div>
  );
}
