"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Boxes, Package } from "lucide-react";

import { kioskCategoryPillClass } from "@/components/cashier/kiosk-listing-styles";
import { itemListThumbnailUrl, type CategoryRecord, type ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { formatAmount, formatStockLabel, toNumber } from "../_utils";
import {
  CATALOG_FIX_NAME_LABEL,
  CATALOG_NO_PRICE_LABEL,
  findDuplicateCatalogRowIds,
  resolveCatalogCategoryLabel,
  resolveCatalogItemName,
  resolveCatalogListSubtitle,
  resolveCatalogVariantPrimaryName,
} from "@/lib/catalog-display";
import { CatalogListSkeleton } from "./CatalogListSkeleton";
import { CatalogListThumb } from "./CatalogListThumb";
import {
  buildCatalogRowMeta,
  catalogListGridClass,
  catalogListHeaderRowClass,
  catalogListMetricCellClass,
  catalogListMetricHeaderClass,
  catalogListCheckboxClass,
  catalogListCheckboxCellClass,
  catalogListProductCellClass,
  catalogListShellClass,
  catalogGridCol,
  catalogVariantRowIndentClass,
  catalogRowAccentClass,
  catalogRowHeightPx,
  catalogRowHierarchyClass,
  catalogRowInteractionClasses,
  catalogRowTone,
  catalogStockTone,
  catalogTypeChipClass,
  catalogTypeChipLabel,
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

function FixNamePill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 border border-amber-600/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:text-amber-100">
      ⚠ {CATALOG_FIX_NAME_LABEL}
    </span>
  );
}

function NoPricePill() {
  return (
    <span className="inline-flex whitespace-nowrap border border-amber-600/35 bg-amber-500/10 px-1 py-0.5 text-[9px] font-semibold leading-tight text-amber-900 dark:text-amber-100">
      {CATALOG_NO_PRICE_LABEL}
    </span>
  );
}

function formatListSellPrice(
  row: ItemSummaryRecord,
  opts: { isGroup: boolean; hasVariants: boolean },
): {
  kind: "price" | "empty" | "na";
  label?: string;
  title?: string;
} {
  if (opts.isGroup) {
    return { kind: "na", title: "Price on variants" };
  }
  const price = toNumber(row.bundlePrice);
  if (opts.hasVariants && (price == null || price <= 0)) {
    return { kind: "na", title: "Price on variants" };
  }
  if (price == null || price <= 0) {
    return { kind: "empty", title: "No sell price set" };
  }
  const formatted = formatAmount(price);
  return { kind: "price", label: formatted, title: formatted };
}

function compactStockDisplay(row: ItemSummaryRecord): {
  label: string;
  className: string;
  title: string;
} {
  const full = formatStockLabel(row);
  const tone = catalogStockTone(row.stockQty);
  if (row.packageVariant) {
    const pkgs = toNumber(row.stockQty);
    return {
      label: pkgs != null ? String(pkgs) : "—",
      className: tone.className,
      title: full,
    };
  }
  const qty = toNumber(row.stockQty);
  if (qty != null) {
    return {
      label: qty.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      className: tone.className,
      title: full,
    };
  }
  return { label: "—", className: "text-muted-foreground/35", title: full };
}

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
  const duplicateRowIds = useMemo(() => findDuplicateCatalogRowIds(rows), [rows]);
  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

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
      return catalogRowHeightPx(kind, density, meta);
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
        <span className={catalogGridCol.check} aria-hidden />
        <span className={cn(catalogGridCol.product, "border-b-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground")}>
          Product
        </span>
        <span className={cn(catalogListMetricHeaderClass, catalogGridCol.stock, "border-b-2")}>
          Stock
        </span>
        <span className={cn(catalogListMetricHeaderClass, catalogGridCol.sell, "border-b-2")}>
          Sell
        </span>
        <span className={cn(catalogListMetricHeaderClass, catalogGridCol.category, "border-b-2")}>
          Category
        </span>
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
          <div className="mx-3 my-10 flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border/50 bg-muted/10 px-5 py-8 text-center sm:mx-4">
            <div className="flex size-10 items-center justify-center rounded-lg border border-border/45 bg-background/80">
              <Package className="size-4 text-muted-foreground/45" aria-hidden />
            </div>
            <div className="max-w-[15rem] space-y-0.5">
              <p className="text-sm font-semibold text-foreground">No products match</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Broaden search or reset filters in the sidebar.
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
                endsVariantGroup: false,
                startsParentBlock: false,
              };
              const tone = catalogRowTone(meta.kind, meta.variantCount);
              const TypeIcon = tone.icon;
              const category =
                row.categoryId != null && row.categoryId !== ""
                  ? categoryById.get(row.categoryId)
                  : undefined;
              const categoryLabel = resolveCatalogCategoryLabel(
                row.categoryName?.trim() ||
                  (category != null
                    ? `${category.name}${!category.active ? " (inactive)" : ""}`
                    : row.categoryId
                      ? "Unknown"
                      : null),
              );
              const listThumb = itemListThumbnailUrl(row);
              const active = isRowActive(row);
              const stock = compactStockDisplay(row);
              const isGroup = meta.kind === "group";
              const isVariant = meta.kind === "variant";
              const variantIdsUnderParent =
                variantIdsByParentId.get(row.id) ??
                rows
                  .filter((r) => r.variantOfItemId?.trim() === row.id)
                  .map((r) => r.id);
              const nameResolution = isVariant
                ? resolveCatalogVariantPrimaryName(row)
                : resolveCatalogItemName(row);
              const titleInitial =
                (nameResolution.needsNameFix &&
                nameResolution.label === CATALOG_FIX_NAME_LABEL
                  ? "?"
                  : nameResolution.label.charAt(0)
                ).toUpperCase() || "?";
              const effectiveVariantCount = Math.max(
                meta.variantCount,
                variantIdsUnderParent.length,
              );
              const sell = formatListSellPrice(row, {
                isGroup,
                hasVariants: effectiveVariantCount > 0,
              });
              const isParentSelector = isCatalogParentSelectorRow(
                row,
                effectiveVariantCount,
              );
              const typeChip = catalogTypeChipLabel(meta.kind, effectiveVariantCount);
              const primaryName = nameResolution.label;
              const parentRow = row.variantOfItemId
                ? rowById.get(row.variantOfItemId.trim())
                : undefined;
              const secondaryLine = resolveCatalogListSubtitle(row, {
                isVariant,
                isGroup,
                variantCount: effectiveVariantCount,
                primaryName,
                parentRow,
              });
              const isDuplicateName = duplicateRowIds.has(row.id);

              let checkboxChecked = selectedIds.has(row.id);
              let checkboxIndeterminate = false;
              if (isParentSelector && variantIdsUnderParent.length > 0) {
                const targetIds = isGroup
                  ? variantIdsUnderParent
                  : [row.id, ...variantIdsUnderParent];
                checkboxChecked =
                  targetIds.length > 0 &&
                  targetIds.every((tid) => selectedIds.has(tid));
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
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={
                      isVariant
                        ? `Variant ${primaryName}`
                        : isGroup
                          ? `Parent group: ${primaryName}`
                          : effectiveVariantCount > 0
                            ? `Parent product: ${primaryName}, ${effectiveVariantCount} variants`
                            : `Product: ${primaryName}`
                    }
                    className={cn(
                      catalogListGridClass,
                      "group relative min-w-0 max-w-full text-left",
                      density === "dense" ? "min-h-[2rem]" : "min-h-[2.25rem]",
                      catalogRowHierarchyClass(meta, tone),
                      catalogRowAccentClass(tone, active),
                      catalogRowInteractionClasses(tone, rowInteraction),
                      row.active === false && "opacity-50",
                      isVariant && catalogVariantRowIndentClass,
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
                        catalogGridCol.check,
                        catalogListCheckboxCellClass(isVariant),
                      )}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className={catalogListCheckboxClass(
                          meta.kind,
                          meta.variantCount,
                        )}
                        ref={(el) => {
                          if (el) el.indeterminate = checkboxIndeterminate;
                        }}
                        checked={checkboxChecked}
                        onChange={() => void onToggleRowSelect(row.id)}
                        aria-label={
                          isParentSelector && variantIdsUnderParent.length > 0
                            ? isGroup
                              ? `Select all variants under ${primaryName}`
                              : `Select ${primaryName} and all variants`
                            : `Select ${primaryName}`
                        }
                      />
                    </span>

                    <div
                      className={cn(
                        catalogListProductCellClass,
                        catalogGridCol.product,
                      )}
                    >
                      {!isVariant ? (
                        <CatalogListThumb
                          src={listThumb}
                          titleInitial={titleInitial}
                          kind={meta.kind}
                          tone={tone}
                          isActive={active}
                          isInactive={row.active === false}
                        />
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1">
                          {!isVariant && !isGroup ? (
                            <TypeIcon
                              className={cn("size-3 shrink-0", tone.muted)}
                              aria-hidden
                            />
                          ) : null}
                          {nameResolution.needsNameFix ? (
                            <>
                              {nameResolution.label !== CATALOG_FIX_NAME_LABEL ? (
                                <span className="min-w-0 truncate text-sm font-semibold leading-tight tracking-tight">
                                  {nameResolution.label}
                                </span>
                              ) : null}
                              <FixNamePill />
                            </>
                          ) : (
                            <span
                              className={cn(
                                "min-w-0 truncate leading-tight tracking-tight",
                                isGroup
                                  ? "text-sm font-semibold"
                                  : isVariant
                                    ? "text-[13px] font-medium text-foreground"
                                    : "text-sm font-semibold",
                                !isVariant && tone.text,
                              )}
                            >
                              {primaryName}
                            </span>
                          )}
                          {typeChip ? (
                            <span
                              className={cn(
                                "hidden shrink-0 border px-1 py-px text-[9px] font-bold uppercase tracking-wide sm:inline",
                                catalogTypeChipClass(meta.kind, effectiveVariantCount),
                              )}
                            >
                              {typeChip}
                            </span>
                          ) : null}
                          {row.packageVariant ? (
                            <span className="inline-flex shrink-0 items-center gap-0.5 border border-primary/25 bg-primary/8 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
                              <Boxes className="size-2.5" aria-hidden />
                              Pack
                            </span>
                          ) : null}
                          {isDuplicateName ? (
                            <span className="inline-flex shrink-0 border border-red-500/30 bg-red-500/10 px-1 py-px text-[9px] font-semibold text-red-800 dark:text-red-300">
                              Duplicate
                            </span>
                          ) : null}
                          {row.active === false ? (
                            <span className="shrink-0 border border-border bg-muted px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Off
                            </span>
                          ) : null}
                        </div>

                        {(secondaryLine || categoryLabel) && (
                          <div className="mt-px flex min-w-0 items-center gap-1.5 truncate text-[10px] text-muted-foreground">
                            {secondaryLine ? (
                              <span
                                className={cn(
                                  "min-w-0 truncate",
                                  /^\d+ variants?$/.test(secondaryLine)
                                    ? "text-muted-foreground"
                                    : "font-mono",
                                )}
                              >
                                {secondaryLine}
                              </span>
                            ) : null}
                            {secondaryLine && categoryLabel ? (
                              <span className="text-muted-foreground/35">·</span>
                            ) : null}
                            {categoryLabel ? (
                              <span
                                className={cn(
                                  "truncate xl:hidden",
                                  !secondaryLine &&
                                    cn(
                                      "border px-1 py-px text-[9px] font-semibold uppercase tracking-wide",
                                      kioskCategoryPillClass(categoryLabel),
                                    ),
                                )}
                                title={categoryLabel}
                              >
                                {categoryLabel}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className={cn(catalogListMetricCellClass, catalogGridCol.stock)}>
                      {stock.label !== "—" ? (
                        <span
                          className={cn(
                            "whitespace-nowrap border px-1 py-px text-[10px] font-bold tabular-nums",
                            stock.className,
                          )}
                          title={stock.title}
                        >
                          {stock.label}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground/35">
                          —
                        </span>
                      )}
                    </span>

                    <span className={cn(catalogListMetricCellClass, catalogGridCol.sell)}>
                      {sell.kind === "empty" ? (
                        <NoPricePill />
                      ) : sell.kind === "price" ? (
                        <span
                          className="whitespace-nowrap text-[10px] font-bold tabular-nums text-foreground"
                          title={sell.title}
                        >
                          {sell.label}
                        </span>
                      ) : (
                        <span className="sr-only">{sell.title}</span>
                      )}
                    </span>

                    <span className={cn(catalogListMetricCellClass, catalogGridCol.category)}>
                      {categoryLabel ? (
                        <span
                          className={cn(
                            "inline-block max-w-full truncate border px-1 py-px text-[9px] font-semibold uppercase leading-snug tracking-wide",
                            kioskCategoryPillClass(categoryLabel),
                          )}
                          title={categoryLabel}
                        >
                          {categoryLabel}
                        </span>
                      ) : null}
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
