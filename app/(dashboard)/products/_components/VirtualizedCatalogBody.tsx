"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, Layers } from "lucide-react";

import { kioskCategoryPillClass } from "@/components/cashier/kiosk-listing-styles";
import { itemListThumbnailUrl, type CategoryRecord, type ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  buildCatalogRowMeta,
  catalogRowHeightPx,
  catalogRowTone,
  catalogStockTone,
} from "./catalog-list-styles";

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
  const rowMetaById = useMemo(() => buildCatalogRowMeta(rows), [rows]);

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
    estimateSize: (index) => {
      const row = rows[index];
      const meta = rowMetaById.get(row.id);
      const kind = meta?.kind ?? "standalone";
      return catalogRowHeightPx(kind, density, meta?.startsParentBlock ?? false);
    },
    overscan: 12,
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    checkLoadMore(el);
  }, [checkLoadMore, rows.length]);

  useEffect(() => {
    virtualizer.measure();
  }, [density, rows.length, virtualizer]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/55 bg-card/80 shadow-sm ring-1 ring-black/[0.02] dark:bg-card/90 dark:ring-white/[0.04]">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/45 bg-[linear-gradient(180deg,oklch(0.97_0.004_90),oklch(0.99_0.002_90))] px-3 py-2 text-[10px] leading-snug text-muted-foreground dark:bg-muted/35">
        <span className="font-bold uppercase tracking-[0.14em] text-foreground/75">Catalog</span>
        <span className="hidden h-3 w-px bg-border/60 sm:block" aria-hidden />
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-full bg-amber-500 shadow-sm" aria-hidden />
          <span className="font-semibold text-amber-950 dark:text-amber-100">Parent group</span>
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-full bg-teal-500 shadow-sm" aria-hidden />
          <span className="font-semibold text-teal-900 dark:text-teal-100">With variants</span>
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
          <span className="font-semibold text-emerald-900 dark:text-emerald-200">Standalone</span>
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-full bg-violet-500 shadow-sm" aria-hidden />
          <span className="font-semibold text-violet-900 dark:text-violet-200">Variant</span>
        </span>
      </div>

      <div
        className="grid shrink-0 grid-cols-[1.75rem_2.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/50 bg-muted/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm md:grid-cols-[1.75rem_2.5rem_minmax(0,1fr)_5.5rem_4.5rem_auto]"
        role="row"
      >
        <span className="sr-only">Select</span>
        <span className="sr-only">Image</span>
        <span>Product</span>
        <span className="hidden md:block">SKU</span>
        <span className="hidden text-right md:block">Stock</span>
        <span className="sr-only">Category</span>
      </div>

      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth"
        tabIndex={-1}
        onScroll={(event) => checkLoadMore(event.currentTarget)}
      >
        {initialLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <span className="relative flex size-10 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" aria-hidden />
              <span className="size-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden />
            </span>
            <p className="text-sm font-medium text-muted-foreground">Loading catalog…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="mx-4 my-14 rounded-2xl border border-dashed border-border/60 bg-muted/15 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">No products match</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Widen search, change scope, or reset filters.
            </p>
          </div>
        ) : (
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              const meta = rowMetaById.get(row.id) ?? {
                kind: "standalone" as const,
                variantCount: 0,
                opensVariantGroup: false,
                continuesVariantGroup: false,
                startsParentBlock: false,
              };
              const tone = catalogRowTone(meta.kind, meta.variantCount);
              const TypeIcon = tone.icon;
              const category =
                row.categoryId != null && row.categoryId !== ""
                  ? categoryById.get(row.categoryId)
                  : undefined;
              const categoryLabel =
                row.categoryName?.trim() ||
                (category != null
                  ? `${category.name}${!category.active ? " (inactive)" : ""}`
                  : row.categoryId
                    ? "Unknown"
                    : null);
              const listThumb = itemListThumbnailUrl(row);
              const active = isRowActive(row);
              const optionLabel = row.variantName?.trim();
              const stock = catalogStockTone(row.stockQty);
              const isGroup = meta.kind === "group";
              const isVariant = meta.kind === "variant";
              const thumbSize = isGroup ? "size-9" : isVariant ? "size-7" : "size-8";
              const titleInitial = row.name.trim().charAt(0).toUpperCase() || "?";

              return (
                <div
                  key={row.id}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 flex w-full flex-col"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  {meta.startsParentBlock ? (
                    <div
                      className={cn("shrink-0", density === "dense" ? "h-2" : "h-3.5")}
                      aria-hidden
                    />
                  ) : null}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={
                      isVariant
                        ? `Variant ${optionLabel ? `${optionLabel}: ` : ""}${row.name}`
                        : isGroup
                          ? `Parent group: ${row.name}`
                          : `Product: ${row.name}`
                    }
                    className={cn(
                      "group relative grid w-full grid-cols-[1.75rem_2.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/25 px-2.5 text-left transition-[background,box-shadow] duration-150 md:grid-cols-[1.75rem_2.5rem_minmax(0,1fr)_5.5rem_4.5rem_auto]",
                      tone.gradient,
                      tone.rowBg,
                      active
                        ? cn("z-[1] shadow-sm ring-1 ring-inset", tone.rowActive)
                        : undefined,
                      row.active === false && "opacity-55",
                      meta.opensVariantGroup && "border-b-amber-500/15",
                      isVariant && "pl-1 md:pl-2",
                    )}
                    onClick={() => onRowClick(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(row.id);
                      }
                    }}
                  >
                  <span
                    className={cn(
                      "pointer-events-none absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full",
                      tone.accent,
                      isGroup && "top-0.5 bottom-0.5 w-1 rounded-r-md",
                    )}
                    aria-hidden
                  />

                  {isVariant ? (
                    <span
                      className="pointer-events-none absolute bottom-0 top-0 w-px bg-violet-400/25 dark:bg-violet-500/20"
                      style={{ left: "1.125rem" }}
                      aria-hidden
                    />
                  ) : null}

                  <span
                    className="relative z-[1] flex items-center"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-input shadow-sm"
                      checked={selectedIds.has(row.id)}
                      onChange={() => onToggleRowSelect(row.id)}
                      aria-label={`Select ${row.name}`}
                    />
                  </span>

                  <span className="relative z-[1] flex items-center">
                    {listThumb ? (
                      <span
                        className={cn(
                          "relative block shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted shadow-sm ring-1 ring-black/[0.03]",
                          thumbSize,
                          isGroup && "rounded-xl ring-amber-500/15",
                        )}
                      >
                        <Image
                          src={listThumb}
                          alt=""
                          width={isGroup ? 36 : isVariant ? 28 : 32}
                          height={isGroup ? 36 : isVariant ? 28 : 32}
                          className="object-cover"
                        />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "flex shrink-0 items-center justify-center rounded-lg border border-dashed font-bold tracking-tight",
                          thumbSize,
                          tone.accentLight,
                          isGroup ? "rounded-xl text-sm" : "text-xs",
                        )}
                      >
                        {titleInitial}
                      </span>
                    )}
                  </span>

                  <span
                    className={cn(
                      "relative z-[1] flex min-w-0 flex-col justify-center gap-0.5",
                      isVariant && "pl-2",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {isVariant ? (
                        <TypeIcon className={cn("size-3.5 shrink-0", tone.muted)} aria-hidden />
                      ) : null}
                      <span
                        className={cn(
                          "min-w-0 truncate font-semibold tracking-tight",
                          isGroup ? "text-[15px]" : "text-sm",
                          tone.text,
                        )}
                      >
                        {row.name}
                      </span>
                      {meta.variantCount > 0 ? (
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                            tone.accentLight,
                          )}
                        >
                          <Layers className="size-2.5 opacity-70" aria-hidden />
                          {meta.variantCount}
                        </span>
                      ) : null}
                      {isGroup ? (
                        <span
                          className={cn(
                            "hidden shrink-0 rounded-md px-1.5 py-px text-[9px] font-bold uppercase tracking-wide sm:inline",
                            tone.accentLight,
                          )}
                        >
                          Group
                        </span>
                      ) : null}
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {isVariant && optionLabel ? (
                        <span className={cn("truncate text-[11px] font-medium", tone.muted)}>
                          {optionLabel}
                        </span>
                      ) : null}
                      {row.sku ? (
                        <span className="truncate font-mono text-[10px] text-muted-foreground md:hidden">
                          {row.sku}
                        </span>
                      ) : null}
                      {row.active === false ? (
                        <span className="rounded-full bg-muted px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Inactive
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span className="relative z-[1] hidden min-w-0 md:block">
                    {row.sku ? (
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        {row.sku}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/35">—</span>
                    )}
                  </span>

                  <span className="relative z-[1] hidden justify-end md:flex">
                    {stock.label ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                          stock.className,
                        )}
                      >
                        {stock.label}
                        {row.stockQty != null && Number.isFinite(Number(row.stockQty)) ? (
                          <span className="ml-1 font-normal opacity-80">{row.stockQty}</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/35">—</span>
                    )}
                  </span>

                  <span className="relative z-[1] flex items-center justify-end gap-1.5">
                    {categoryLabel ? (
                      <span
                        className={cn(
                          "hidden max-w-[7rem] truncate rounded-md px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide lg:inline",
                          kioskCategoryPillClass(categoryLabel),
                        )}
                      >
                        {categoryLabel}
                      </span>
                    ) : null}
                    <ChevronRight
                      className={cn(
                        "pointer-events-none size-4 shrink-0 text-muted-foreground/70 transition-all duration-150",
                        selectedId === row.id
                          ? "translate-x-0 opacity-80"
                          : "translate-x-0 opacity-0 group-hover:translate-x-0.5 group-hover:opacity-55",
                      )}
                      aria-hidden
                    />
                  </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {loadingMore ? (
          <div className="sticky bottom-0 border-t border-border/40 bg-background/95 py-2 text-center text-xs font-medium text-muted-foreground backdrop-blur-md">
            Loading more products…
          </div>
        ) : null}
      </div>
    </div>
  );
}
