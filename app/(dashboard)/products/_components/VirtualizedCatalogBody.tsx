"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, CornerDownRight, Layers, Package, Tag } from "lucide-react";

import { itemListThumbnailUrl, type CategoryRecord, type ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

export type CatalogDensity = "comfortable" | "dense";

export type VirtualizedCatalogBodyProps = {
  rows: ItemSummaryRecord[];
  categoryById: Map<string, CategoryRecord>;
  selectedId: string | null;
  selectedIds: Set<string>;
  density: CatalogDensity;
  onRowClick: (id: string) => void;
  onToggleRowSelect: (id: string) => void;
  isRowActive: (row: ItemSummaryRecord) => boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  initialLoading: boolean;
};

const ROW_COMFORTABLE = 36;
const ROW_DENSE = 28;

export function VirtualizedCatalogBody({
  rows,
  categoryById,
  selectedId,
  selectedIds,
  density,
  onRowClick,
  onToggleRowSelect,
  isRowActive,
  loadingMore,
  hasMore,
  onLoadMore,
  initialLoading,
}: VirtualizedCatalogBodyProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowPx = density === "dense" ? ROW_DENSE : ROW_COMFORTABLE;
  const checkLoadMore = useCallback(
    (el: HTMLDivElement) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 320 && hasMore && !loadingMore) {
        onLoadMore();
      }
    },
    [hasMore, loadingMore, onLoadMore],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual list
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowPx,
    overscan: 14,
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el) {
      return;
    }
    checkLoadMore(el);
  }, [checkLoadMore, rows.length]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background/60 shadow-inner">
      {/* Compact legend */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-border/45 bg-muted/35 px-2 py-1 text-[10px] leading-tight text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide text-foreground/80">Row key</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-1 rounded-sm bg-amber-500 shadow-sm dark:bg-amber-400" aria-hidden />
          <span className="font-medium text-amber-950 dark:text-amber-100">Label</span>
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-1 rounded-sm bg-emerald-600 shadow-sm dark:bg-emerald-500" aria-hidden />
          <span className="font-medium text-emerald-900 dark:text-emerald-200">Standalone</span>
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span className="inline-flex items-center gap-1">
          <CornerDownRight className="size-3 shrink-0 text-violet-500/80 dark:text-violet-400/90" aria-hidden />
          <span className="font-medium text-violet-900 dark:text-violet-200">Option</span>
        </span>
      </div>

      {/* Header */}
      <div
        className="relative grid shrink-0 grid-cols-[1.75rem_2rem_1fr_auto] gap-1.5 border-b border-border/50 bg-muted/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
        role="row"
      >
        <span className="sr-only">Select</span>
        <span className="sr-only">Image</span>
        <span>Product</span>
        <span className="sr-only">Category</span>
      </div>

      {/* Scrollable body */}
      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth"
        tabIndex={-1}
        onScroll={(event) => checkLoadMore(event.currentTarget)}
      >
        {initialLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-pulse rounded-full bg-primary/40" aria-hidden />
            Loading catalog…
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-14 text-center text-sm text-muted-foreground">
            No rows match your filters. Widen search or switch scope.
          </div>
        ) : (
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              const category =
                row.categoryId != null && row.categoryId !== ""
                  ? categoryById.get(row.categoryId)
                  : undefined;
              const categoryLabel =
                category != null
                  ? `${category.name}${!category.active ? " (inactive)" : ""}`
                  : row.categoryId
                    ? "Unknown"
                    : null;
              const listThumb = itemListThumbnailUrl(row);
              const isGroupLabel = row.groupLabelOnly === true;
              const isVariant = Boolean(row.variantOfItemId);
              const active = isRowActive(row);
              const optionLabel = row.variantName?.trim();

              return (
                <div
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  aria-label={
                    isVariant
                      ? `Option ${optionLabel ? optionLabel : ""}: ${row.name}`
                      : isGroupLabel
                        ? `Group label: ${row.name}`
                        : `Product: ${row.name}`
                  }
                  className={cn(
                    "group relative grid grid-cols-[1.75rem_2rem_1fr_auto] items-center gap-1.5 border-b border-border/30 px-2 text-left text-sm transition-colors",
                    active
                      ? "bg-primary/[0.08] ring-1 ring-inset ring-primary/15"
                      : "hover:bg-muted/30",
                    isVariant
                      ? "border-l-[3px] border-l-violet-500/60 bg-violet-500/[0.04]"
                      : isGroupLabel
                        ? "border-l-[3px] border-l-amber-500/60 bg-amber-500/[0.04]"
                        : "border-l-[3px] border-l-emerald-600/55 bg-emerald-500/[0.03]",
                  )}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${vi.size}px`,
                    transform: `translateY(${vi.start}px)`,
                  }}
                  onClick={() => onRowClick(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(row.id);
                    }
                  }}
                >
                  {/* Checkbox */}
                  <span
                    className="flex items-center"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-input"
                      checked={selectedIds.has(row.id)}
                      onChange={() => onToggleRowSelect(row.id)}
                      aria-label={`Select ${row.name}`}
                    />
                  </span>

                  {/* Thumbnail */}
                  <span className="flex items-center">
                    {listThumb ? (
                      <span className="relative block size-7 shrink-0 overflow-hidden rounded-md border bg-muted">
                        <Image src={listThumb} alt="" width={28} height={28} className="object-cover" />
                      </span>
                    ) : (
                      <span className="block size-7 shrink-0 rounded-md border border-dashed border-muted-foreground/25 bg-muted/30" />
                    )}
                  </span>

                  {/* Name line */}
                  <span className="flex min-w-0 items-center gap-1.5">
                    {isVariant ? (
                      <CornerDownRight className="size-3 shrink-0 text-violet-500/70 dark:text-violet-400/80" aria-hidden />
                    ) : isGroupLabel ? (
                      <Tag className="size-3 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
                    ) : (
                      <Package className="size-3 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
                    )}

                    <span className="min-w-0 truncate text-sm font-medium text-foreground">
                      {row.name}
                    </span>

                    {isVariant && optionLabel ? (
                      <>
                        <span className="text-muted-foreground/60">·</span>
                        <span className="min-w-0 truncate text-[11px] font-medium text-violet-800 dark:text-violet-300">
                          {optionLabel}
                        </span>
                      </>
                    ) : null}
                  </span>

                  {/* Right side: category + chevron */}
                  <span className="flex items-center justify-end gap-1.5">
                    {categoryLabel ? (
                      <span className="hidden truncate rounded bg-muted/50 px-1.5 py-px text-[10px] font-medium text-muted-foreground sm:block">
                        {categoryLabel}
                      </span>
                    ) : null}
                    <ChevronRight
                      className={cn(
                        "pointer-events-none size-3.5 text-muted-foreground transition-opacity",
                        selectedId === row.id ? "opacity-60" : "opacity-0 group-hover:opacity-50",
                      )}
                      aria-hidden
                    />
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {loadingMore ? (
          <div className="sticky bottom-0 border-t border-border/40 bg-background/90 py-1.5 text-center text-xs text-muted-foreground backdrop-blur-sm">
            Loading more…
          </div>
        ) : null}
      </div>
    </div>
  );
}
