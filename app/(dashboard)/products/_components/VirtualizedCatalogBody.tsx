"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Boxes, ChevronRight, Package } from "lucide-react";

import { kioskCategoryPillClass } from "@/components/cashier/kiosk-listing-styles";
import { itemListThumbnailUrl, type CategoryRecord, type ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { formatStockLabel } from "../_utils";
import { CatalogListSkeleton } from "./CatalogListSkeleton";
import {
  buildCatalogRowMeta,
  catalogListGridClass,
  catalogListHeaderRowClass,
  catalogListMetricCellClass,
  catalogListShellClass,
  catalogRowHeightPx,
  catalogRowInteractionClasses,
  catalogRowTone,
  catalogStockTone,
  isCatalogParentSelectorRow,
} from "./catalog-list-styles";

export type CatalogDensity = "comfortable" | "dense";

export type VirtualizedCatalogBodyProps = {
  rows: ItemSummaryRecord[];
  categoryById: Map<string, CategoryRecord>;
  variantIdsByParentId: Map<string, string[]>;
  selectedId: string | null;
  selectedIds: Set<string>;
  density: CatalogDensity;
  onRowClick: (id: string) => void;
  onToggleRowSelect: (id: string) => void | Promise<void>;
  isRowActive: (row: ItemSummaryRecord) => boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  initialLoading: boolean;
};

export function VirtualizedCatalogBody({
  rows,
  categoryById,
  variantIdsByParentId,
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
    <div className={catalogListShellClass}>
      <div
        className={cn(catalogListGridClass, catalogListHeaderRowClass)}
        role="row"
        aria-label="Catalog columns"
      >
        <span className="sr-only">Select</span>
        <span className="sr-only">Image</span>
        <span className="min-w-0 self-center text-left">Product</span>
        <span className={catalogListMetricCellClass}>Stock</span>
        <span className={cn(catalogListMetricCellClass, "hidden md:flex")}>
          Category
        </span>
        <span className="sr-only">Open</span>
      </div>

      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth"
        tabIndex={-1}
        onScroll={(event) => checkLoadMore(event.currentTarget)}
      >
        {initialLoading ? (
          <CatalogListSkeleton density={density} />
        ) : rows.length === 0 ? (
          <div className="mx-3 my-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/55 bg-muted/15 px-6 py-10 text-center sm:mx-4">
            <div className="flex size-12 items-center justify-center rounded-xl border border-border/50 bg-background/80 shadow-sm">
              <Package className="size-5 text-muted-foreground/45" aria-hidden />
            </div>
            <div className="max-w-[16rem] space-y-1">
              <p className="text-sm font-semibold text-foreground">
                No products match
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Try a broader search, change catalog scope, or reset filters in
                the sidebar.
              </p>
            </div>
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
              const stockTone = catalogStockTone(row.stockQty);
              const stock =
                row.packageVariant ||
                (row.packageUnitsPerSale != null &&
                  Number(row.packageUnitsPerSale) > 1)
                  ? {
                      ...stockTone,
                      label: formatStockLabel(row),
                    }
                  : stockTone;
              const isGroup = meta.kind === "group";
              const isVariant = meta.kind === "variant";
              const isParentRow = !isVariant;
              const variantIdsUnderParent =
                variantIdsByParentId.get(row.id) ??
                rows
                  .filter((r) => r.variantOfItemId?.trim() === row.id)
                  .map((r) => r.id);
              const thumbSize = isGroup ? "size-9" : isVariant ? "size-7" : "size-8";
              const titleInitial = row.name.trim().charAt(0).toUpperCase() || "?";
              const effectiveVariantCount = Math.max(
                meta.variantCount,
                variantIdsUnderParent.length,
              );
              const isParentSelector = isCatalogParentSelectorRow(
                row,
                effectiveVariantCount,
              );
              const displayName =
                isParentSelector && effectiveVariantCount > 0
                  ? `${row.name} (${effectiveVariantCount})`
                  : row.name;

              let checkboxChecked = selectedIds.has(row.id);
              let checkboxIndeterminate = false;
              if (isParentSelector && variantIdsUnderParent.length > 0) {
                const targetIds = isGroup ? variantIdsUnderParent : [row.id, ...variantIdsUnderParent];
                checkboxChecked =
                  targetIds.length > 0 && targetIds.every((tid) => selectedIds.has(tid));
                checkboxIndeterminate =
                  !checkboxChecked && targetIds.some((tid) => selectedIds.has(tid));
              }
              const rowBulkSelected =
                (isParentSelector &&
                  variantIdsUnderParent.length > 0 &&
                  variantIdsUnderParent.some((vid) => selectedIds.has(vid)) &&
                  !checkboxChecked) ||
                (checkboxChecked && !isParentSelector);
              const rowInteraction = {
                isDetailActive: active,
                isBulkSelected: rowBulkSelected,
                isCheckboxChecked: checkboxChecked && !active,
              };

              return (
                <div
                  key={row.id}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 flex w-full min-w-0 max-w-full flex-col"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  {meta.startsParentBlock ? (
                    <div
                      className={cn("shrink-0", density === "dense" ? "h-2.5" : "h-4")}
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
                      catalogListGridClass,
                      "group relative min-w-0 max-w-full border-b border-border/20 px-2.5 text-left",
                      density === "dense" ? "py-1.5" : "py-2",
                      catalogRowInteractionClasses(tone, rowInteraction),
                      row.active === false && "opacity-50",
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
                      "pointer-events-none absolute bottom-0 left-0 top-0 w-0.5 rounded-r-full opacity-0 transition-opacity",
                      tone.accent,
                      active && "opacity-100",
                    )}
                    aria-hidden
                  />

                  {isVariant ? (
                    <span
                      className="pointer-events-none absolute bottom-1 top-1 w-px bg-border/60"
                      style={{ left: "1.75rem" }}
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
                      className={cn(
                        "size-3.5 rounded border-input shadow-sm transition-shadow",
                        (checkboxChecked || rowBulkSelected) &&
                          "border-primary/50 ring-1 ring-primary/20",
                      )}
                      ref={(el) => {
                        if (el) el.indeterminate = checkboxIndeterminate;
                      }}
                      checked={checkboxChecked}
                      onChange={() => void onToggleRowSelect(row.id)}
                      aria-label={
                        isParentSelector && variantIdsUnderParent.length > 0
                          ? isGroup
                            ? `Select all variants under ${row.name}`
                            : `Select ${row.name} and all variants`
                          : `Select ${row.name}`
                      }
                    />
                  </span>

                  <span className="relative z-[1] flex items-center">
                    {isParentRow ? (
                      listThumb ? (
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
                            width={isGroup ? 36 : 32}
                            height={isGroup ? 36 : 32}
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
                      )
                    ) : listThumb ? (
                      <span
                        className={cn(
                          "relative block shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted",
                          thumbSize,
                        )}
                      >
                        <Image
                          src={listThumb}
                          alt=""
                          width={28}
                          height={28}
                          className="object-cover"
                        />
                      </span>
                    ) : (
                      <span
                        className={cn("shrink-0 rounded-md bg-muted/50", thumbSize)}
                        aria-hidden
                      />
                    )}
                  </span>

                  <div
                    className={cn(
                      "relative z-[1] min-w-0",
                      isVariant && "pl-3 md:pl-5",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      {isVariant ? (
                        <TypeIcon className={cn("size-3.5 shrink-0", tone.muted)} aria-hidden />
                      ) : null}
                      <span
                        className={cn(
                          "min-w-0 truncate leading-snug tracking-tight",
                          isGroup ? "text-[15px] font-semibold" : "text-sm",
                          isVariant ? "font-medium text-foreground" : "font-semibold",
                          !isVariant && tone.text,
                          isParentSelector && "capitalize",
                        )}
                      >
                        {displayName}
                      </span>
                      {row.packageVariant ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-primary/20 bg-primary/8 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                          <Boxes className="size-2.5" aria-hidden />
                          Pack
                        </span>
                      ) : null}
                      {isGroup ? (
                        <span
                          className={cn(
                            "hidden shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:inline",
                            tone.accentLight,
                          )}
                        >
                          Group
                        </span>
                      ) : null}
                      {row.active === false ? (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Off
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                      {isVariant && optionLabel ? (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {optionLabel}
                        </span>
                      ) : null}
                      {row.sku ? (
                        <span
                          className="min-w-0 truncate font-mono text-[11px] text-muted-foreground"
                          title={row.sku}
                        >
                          {row.sku}
                        </span>
                      ) : !isGroup ? (
                        <span className="text-[11px] text-muted-foreground/35">
                          No SKU
                        </span>
                      ) : null}
                      {categoryLabel ? (
                        <span
                          className={cn(
                            "truncate rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-snug tracking-wide md:hidden",
                            kioskCategoryPillClass(categoryLabel),
                          )}
                          title={categoryLabel}
                        >
                          {categoryLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <span className={catalogListMetricCellClass}>
                    {stock.label ? (
                      <span
                        className={cn(
                          "whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                          stock.className,
                        )}
                        title={formatStockLabel(row)}
                      >
                        {formatStockLabel(row)}
                      </span>
                    ) : (
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground/35">
                        —
                      </span>
                    )}
                  </span>

                  <span className={cn(catalogListMetricCellClass, "hidden md:flex")}>
                    {categoryLabel ? (
                      <span
                        className={cn(
                          "max-w-full truncate rounded-md px-1.5 py-0.5 text-end text-[9px] font-semibold uppercase leading-snug tracking-wide",
                          kioskCategoryPillClass(categoryLabel),
                        )}
                        title={categoryLabel}
                      >
                        {categoryLabel}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/35" aria-hidden>
                        —
                      </span>
                    )}
                  </span>

                  <span className="relative z-[1] flex items-center justify-center justify-self-end">
                    <ChevronRight
                      className={cn(
                        "pointer-events-none size-4 shrink-0 transition-all duration-150",
                        active
                          ? "translate-x-0.5 text-foreground opacity-100"
                          : "text-muted-foreground/50 opacity-0 group-hover:translate-x-0.5 group-hover:text-muted-foreground group-hover:opacity-70",
                        (checkboxChecked || rowBulkSelected) &&
                          !active &&
                          "text-primary/70 opacity-60",
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
          <div className="border-t border-border/40 bg-background/95 backdrop-blur-md">
            <CatalogListSkeleton density={density} count={4} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
