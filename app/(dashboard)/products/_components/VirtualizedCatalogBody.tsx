"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
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

const ROW_COMFORTABLE = 56;
const ROW_DENSE = 40;

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
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 320 && hasMore && !loadingMore) {
        onLoadMore();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loadingMore, onLoadMore, rows.length]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background/60 shadow-inner">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/45 bg-muted/35 px-2 py-1.5 text-[10px] leading-tight text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide text-foreground/80">Row key</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-sm bg-amber-500 shadow-sm dark:bg-amber-400" aria-hidden />
          <span>
            <span className="font-medium text-amber-950 dark:text-amber-100">Label</span> — group header (shared
            merchandising, editable)
          </span>
        </span>
        <span className="text-muted-foreground/80">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-sm bg-emerald-600 shadow-sm dark:bg-emerald-500" aria-hidden />
          <span>
            <span className="font-medium text-emerald-900 dark:text-emerald-200">Standalone</span> — one sellable
            product
          </span>
        </span>
        <span className="text-muted-foreground/80">·</span>
        <span className="inline-flex items-center gap-1.5">
          <CornerDownRight className="size-3.5 shrink-0 text-violet-500/80 dark:text-violet-400/90" aria-hidden />
          <span>
            <span className="font-medium text-violet-900 dark:text-violet-200">Option</span> — sellable SKU under a
            group
          </span>
        </span>
      </div>
      <div
        className="relative grid shrink-0 grid-cols-[2rem_2.75rem_1fr] gap-2 border-b border-border/50 bg-muted/45 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[2rem_2.75rem_minmax(0,1fr)_7.5rem_6.5rem]"
        role="row"
      >
        <span className="sr-only">Select</span>
        <span className="sr-only">Image</span>
        <span>Name &amp; type</span>
        <span className="hidden sm:block">SKU</span>
        <span className="hidden sm:block">Category</span>
      </div>
      <div
        ref={parentRef}
        className="flex-1 min-h-[14rem] overflow-auto overscroll-contain scroll-smooth lg:min-h-0"
        tabIndex={-1}
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
                    : "—";
              const listThumb = itemListThumbnailUrl(row);
              const isGroupLabel = row.groupLabelOnly === true;
              const isVariant = Boolean(row.variantOfItemId);
              const active = isRowActive(row);
              const padY = density === "dense" ? "py-1.5" : "py-2.5";
              const optionLabel = row.variantName?.trim();
              const branchIconClass =
                density === "dense" ? "size-3.5" : "size-4";

              return (
                <div
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  aria-label={
                    isVariant ?
                      `Option SKU ${row.sku}${optionLabel ? `, ${optionLabel}` : ""}: ${row.name}`
                    : isGroupLabel ?
                      `Group label ${row.sku}: ${row.name}`
                    : `Standalone product ${row.sku}: ${row.name}`
                  }
                  className={cn(
                    "group relative grid grid-cols-[2rem_2.75rem_1fr] gap-2 border-b border-border/35 px-2 text-left text-sm transition-shadow duration-150 sm:grid-cols-[2rem_2.75rem_minmax(0,1fr)_7.5rem_6.5rem]",
                    padY,
                    active ? "bg-primary/[0.09] ring-1 ring-inset ring-primary/20" : "",
                    isVariant ?
                      cn(
                        "border-l-[3px] border-l-violet-500/70 bg-gradient-to-r from-violet-500/[0.11] via-violet-500/[0.04] to-transparent",
                        "shadow-[inset_6px_0_12px_-8px_rgba(139,92,246,0.12)]",
                        "hover:from-violet-500/[0.17] hover:via-violet-500/[0.08] hover:shadow-[inset_6px_0_14px_-8px_rgba(139,92,246,0.18)]",
                        "dark:border-l-violet-400/75 dark:from-violet-500/[0.14] dark:via-violet-950/25 dark:to-transparent",
                        "dark:shadow-[inset_6px_0_14px_-8px_rgba(139,92,246,0.18)]",
                        "dark:hover:from-violet-500/[0.19] dark:hover:via-violet-950/35",
                      )
                    : isGroupLabel ?
                      cn(
                        "border-l-[3px] border-l-amber-500/70 bg-gradient-to-r from-amber-500/[0.12] via-amber-500/[0.05] to-transparent",
                        "hover:from-amber-500/[0.16] hover:via-amber-500/[0.08]",
                        "dark:border-l-amber-400/65 dark:from-amber-500/[0.14] dark:via-amber-950/20",
                      )
                    : cn(
                        "border-l-[3px] border-l-emerald-600/65 bg-emerald-500/[0.05] hover:bg-muted/40 dark:border-l-emerald-500/55 dark:bg-emerald-500/[0.08]",
                      ),
                  )}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
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
                  <span
                    className="flex items-start pt-0.5"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-3.5 rounded border-input"
                      checked={selectedIds.has(row.id)}
                      onChange={() => onToggleRowSelect(row.id)}
                      aria-label={`Select ${row.sku}`}
                    />
                  </span>
                  <span className="flex items-center">
                    {listThumb ? (
                      <span className="relative block size-9 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        <Image src={listThumb} alt="" width={36} height={36} className="object-cover" />
                      </span>
                    ) : (
                      <span className="block size-9 shrink-0 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "flex flex-wrap items-center gap-x-1.5 gap-y-0.5",
                        isVariant ? "items-start" : "items-center",
                      )}
                    >
                      {isVariant ? (
                        <span
                          className="relative mt-0.5 flex shrink-0 text-violet-500/70 dark:text-violet-400/85"
                          aria-hidden
                        >
                          <CornerDownRight className={cn(branchIconClass, "drop-shadow-[0_0_6px_rgba(139,92,246,0.25)]")} />
                        </span>
                      ) : null}
                      {isVariant ? (
                        <Layers
                          className="mt-0.5 size-3.5 shrink-0 text-violet-600 dark:text-violet-400"
                          aria-hidden
                        />
                      ) : isGroupLabel ? (
                        <Tag className="size-3.5 shrink-0 text-amber-800 dark:text-amber-200" aria-hidden />
                      ) : (
                        <Package
                          className="size-3.5 shrink-0 text-emerald-700 dark:text-emerald-400"
                          aria-hidden
                        />
                      )}
                      {isVariant ? (
                        <span className="mt-0.5 shrink-0 rounded-md bg-violet-500/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-violet-950 ring-1 ring-violet-500/35 dark:text-violet-100 dark:ring-violet-400/30">
                          Option
                        </span>
                      ) : isGroupLabel ? (
                        <span className="shrink-0 rounded-md bg-amber-500/25 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-950 ring-1 ring-amber-600/30 dark:text-amber-50 dark:ring-amber-400/40">
                          Label
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-md bg-emerald-500/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-950 ring-1 ring-emerald-600/30 dark:text-emerald-50 dark:ring-emerald-400/35">
                          Standalone
                        </span>
                      )}
                      <span
                        className={cn(
                          "min-w-0 truncate font-medium leading-snug text-foreground",
                          isVariant ? "mt-0.5 text-[13px]" : "",
                        )}
                      >
                        {row.name}
                      </span>
                    </span>
                    {isVariant && optionLabel ? (
                      <span className="mt-1 block border-l-2 border-violet-400/25 pl-2.5 text-[11px] font-medium leading-snug text-violet-900/90 dark:border-violet-400/35 dark:text-violet-200/95">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600/80 dark:text-violet-300/90">
                          Option
                        </span>
                        <span className="mx-1.5 text-muted-foreground/70">·</span>
                        <span>{optionLabel}</span>
                      </span>
                    ) : null}
                    <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground sm:hidden">
                      {row.sku}
                      {row.barcode ? ` · ${row.barcode}` : ""}
                    </span>
                  </span>
                  <span className="hidden min-w-0 truncate font-mono text-xs text-muted-foreground sm:block">
                    {row.sku}
                  </span>
                  <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:block" title={categoryLabel}>
                    {categoryLabel}
                  </span>
                  <ChevronRight
                    className={cn(
                      "pointer-events-none absolute right-2 top-1/2 hidden size-4 -translate-y-1/2 text-muted-foreground transition-opacity sm:block",
                      selectedId === row.id ? "opacity-60" : "opacity-0 group-hover:opacity-50",
                    )}
                    aria-hidden
                  />
                </div>
              );
            })}
          </div>
        )}
        {loadingMore ? (
          <div className="sticky bottom-0 border-t border-border/40 bg-background/90 py-2 text-center text-xs text-muted-foreground backdrop-blur-sm">
            Loading more…
          </div>
        ) : null}
      </div>
    </div>
  );
}
