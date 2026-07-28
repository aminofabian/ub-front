"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Package, PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { itemListThumbnailUrl, type CategoryRecord, type ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { formatAmount, formatStockLabel, toNumber } from "../_utils";
import {
  CATALOG_FIX_NAME_LABEL,
  findDuplicateCatalogRowIds,
  resolveCatalogCategoryLabel,
  resolveCatalogItemName,
  resolveCatalogListSubtitle,
  resolveCatalogVariantListTitle,
} from "@/lib/catalog-display";
import { CatalogListSkeleton } from "./CatalogListSkeleton";
import { CatalogListThumb } from "./CatalogListThumb";
import {
  buildCatalogRowMeta,
  catalogListCategoryTagClass,
  catalogListGridClass,
  catalogListHeaderRowClass,
  catalogListMetricCellClass,
  catalogListMetricHeaderClass,
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
  catalogSheetRowHeaderClass,
  catalogStockTone,
  isCatalogParentSelectorRow,
} from "./catalog-list-styles";

export type CatalogDensity = "comfortable" | "dense";

export type VirtualizedCatalogBodyHandle = {
  scrollToIndex: (index: number) => void;
};

export type VirtualizedCatalogBodyProps = {
  rows: ItemSummaryRecord[];
  categoryById: Map<string, CategoryRecord>;
  variantIdsByParentId: Map<string, string[]>;
  selectedId: string | null;
  selectedIds: Set<string>;
  density: CatalogDensity;
  onRowClick: (id: string) => void;
  onToggleRowSelect: (id: string) => void | Promise<void>;
  onToggleSelectAllLoaded?: () => void;
  isRowActive: (row: ItemSummaryRecord) => boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  initialLoading: boolean;
  catalogEmpty?: boolean;
  onAddFromCatalog?: () => void;
  canAddFromCatalog?: boolean;
};

function FixNamePill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-none border border-amber-600/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
      {CATALOG_FIX_NAME_LABEL}
    </span>
  );
}

function NoPricePill() {
  return (
    <span
      className="text-[11px] tabular-nums text-foreground/25"
      title="No sell price set"
    >
      –
    </span>
  );
}

/** Compact sheet price — drop trailing .00 when whole. */
function compactListPrice(value: number): string {
  const whole = Math.abs(value - Math.round(value)) < 0.005;
  if (whole) return Math.round(value).toLocaleString();
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const label = compactListPrice(price);
  return { kind: "price", label, title: formatAmount(price) };
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

export const VirtualizedCatalogBody = forwardRef<
  VirtualizedCatalogBodyHandle,
  VirtualizedCatalogBodyProps
>(function VirtualizedCatalogBody(
  {
    rows,
    categoryById,
    variantIdsByParentId,
    selectedId,
    selectedIds,
    density,
    onRowClick,
    onToggleRowSelect,
    onToggleSelectAllLoaded,
    isRowActive,
    loadingMore,
    hasMore,
    onLoadMore,
    initialLoading,
    catalogEmpty = false,
    onAddFromCatalog,
    canAddFromCatalog = false,
  },
  ref,
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowMetaById = useMemo(() => buildCatalogRowMeta(rows), [rows]);
  const duplicateRowIds = useMemo(() => findDuplicateCatalogRowIds(rows), [rows]);
  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const allLoadedSelected =
    rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someLoadedSelected =
    !allLoadedSelected && rows.some((row) => selectedIds.has(row.id));

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

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex: (index: number) => {
        if (index < 0 || index >= rows.length) return;
        virtualizer.scrollToIndex(index, { align: "start", behavior: "smooth" });
      },
    }),
    [rows.length, virtualizer],
  );

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
        <span className={catalogGridCol.check}>
          {onToggleSelectAllLoaded && rows.length > 0 ? (
            <button
              type="button"
              onClick={onToggleSelectAllLoaded}
              className={cn(
                catalogSheetRowHeaderClass,
                "text-[9px] font-semibold uppercase tracking-wide",
                allLoadedSelected && "bg-foreground text-background hover:bg-foreground",
                someLoadedSelected &&
                  !allLoadedSelected &&
                  "bg-muted text-foreground",
              )}
              aria-label={
                allLoadedSelected
                  ? "Clear selection of loaded products"
                  : "Select all loaded products"
              }
              title={allLoadedSelected ? "Clear selection" : "Select all"}
            >
              {allLoadedSelected ? "✓" : someLoadedSelected ? "−" : "#"}
            </button>
          ) : (
            <span className="text-[9px] font-semibold text-muted-foreground/60">
              #
            </span>
          )}
        </span>
        <span
          className={cn(
            catalogGridCol.product,
            "text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/40",
          )}
        >
          Product
        </span>
        <span className={cn(catalogListMetricHeaderClass, catalogGridCol.stock)}>
          Qty
        </span>
        <span className={cn(catalogListMetricHeaderClass, catalogGridCol.sell, "pr-2.5")}>
          Price
        </span>
        <span className={cn(catalogListMetricHeaderClass, catalogGridCol.category)}>
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
          <div className="mx-3 my-10 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/50 bg-muted/10 px-5 py-8 text-center sm:mx-4">
            <div className="flex size-10 items-center justify-center rounded-lg border border-border/45 bg-background/80">
              <Package className="size-4 text-muted-foreground/45" aria-hidden />
            </div>
            <div className="max-w-[18rem] space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {catalogEmpty ? "Your catalog is empty" : "No products match"}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {catalogEmpty
                  ? "Get started quickly by importing common products from the shared catalog, or add your first product manually."
                  : "Broaden search or reset filters in the sidebar."}
              </p>
            </div>
            {catalogEmpty && canAddFromCatalog && onAddFromCatalog ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  onClick={onAddFromCatalog}
                >
                  <PackagePlus className="size-4" aria-hidden />
                  Add from catalog
                </Button>
              </div>
            ) : null}
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
              const parentRow = row.variantOfItemId
                ? rowById.get(row.variantOfItemId.trim())
                : undefined;
              const parentInList = parentRow != null;
              const variantTitle = isVariant
                ? resolveCatalogVariantListTitle(row, { parentInList, parentRow })
                : null;
              const nameResolution = isVariant
                ? {
                    label: variantTitle!.combined,
                    needsNameFix: variantTitle!.needsNameFix,
                  }
                : resolveCatalogItemName(row);
              const titleInitial =
                (nameResolution.needsNameFix &&
                nameResolution.label === CATALOG_FIX_NAME_LABEL
                  ? "?"
                  : (variantTitle?.family ?? nameResolution.label).charAt(0)
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
              const primaryName = nameResolution.label;
              const secondaryLine = resolveCatalogListSubtitle(row, {
                isVariant,
                isGroup,
                variantCount: effectiveVariantCount,
                primaryName: variantTitle?.option ?? primaryName,
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
                zebra: vi.index % 2 === 1,
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
                        ? `Variant ${variantTitle?.combined ?? primaryName}`
                        : isGroup
                          ? `Parent group: ${primaryName}`
                          : effectiveVariantCount > 0
                            ? `Parent product: ${primaryName}, ${effectiveVariantCount} variants`
                            : `Product: ${primaryName}`
                    }
                    className={cn(
                      catalogListGridClass,
                      "group relative min-w-0 max-w-full text-left",
                      density === "dense"
                        ? "min-h-[1.85rem] sm:min-h-[2rem]"
                        : "min-h-9 sm:min-h-[2.25rem]",
                      catalogRowHierarchyClass(meta, tone),
                      catalogRowAccentClass(tone, active),
                      catalogRowInteractionClasses(tone, rowInteraction),
                      row.active === false && "opacity-50",
                      isVariant && catalogVariantRowIndentClass(density),
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
                      <button
                        type="button"
                        className={cn(
                          catalogSheetRowHeaderClass,
                          checkboxChecked &&
                            "bg-foreground font-semibold text-background hover:bg-foreground hover:text-background",
                          checkboxIndeterminate &&
                            !checkboxChecked &&
                            "bg-muted font-semibold text-foreground",
                        )}
                        onClick={() => void onToggleRowSelect(row.id)}
                        aria-pressed={checkboxChecked}
                        aria-label={
                          isParentSelector && variantIdsUnderParent.length > 0
                            ? isGroup
                              ? `Select all variants under ${primaryName}`
                              : `Select ${primaryName} and all variants`
                            : `Select ${primaryName}`
                        }
                      >
                        {checkboxChecked
                          ? "✓"
                          : checkboxIndeterminate
                            ? "−"
                            : vi.index + 1}
                      </button>
                    </span>

                    <div
                      className={cn(
                        catalogListProductCellClass,
                        catalogGridCol.product,
                        "gap-1.5 sm:gap-2",
                      )}
                    >
                      {!isVariant && listThumb ? (
                        <span className="hidden sm:inline-flex">
                          <CatalogListThumb
                            src={listThumb}
                            titleInitial={titleInitial}
                            kind={meta.kind}
                            tone={tone}
                            isActive={active}
                            isInactive={row.active === false}
                          />
                        </span>
                      ) : null}

                      <div className="min-w-0 flex-1 py-0.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {isVariant ? (
                            <span
                              className="hidden w-2 shrink-0 text-[10px] text-foreground/25 sm:inline"
                              aria-hidden
                            >
                              └
                            </span>
                          ) : null}
                          {nameResolution.needsNameFix ? (
                            <>
                              {nameResolution.label !== CATALOG_FIX_NAME_LABEL ? (
                                <span className="min-w-0 truncate text-[13px] font-medium tracking-tight text-foreground">
                                  {nameResolution.label}
                                </span>
                              ) : null}
                              <FixNamePill />
                            </>
                          ) : isVariant && variantTitle?.family ? (
                            <span
                              className="min-w-0 truncate text-[13px] tracking-tight"
                              title={variantTitle.combined}
                            >
                              <span className="font-medium text-foreground/70">
                                {variantTitle.family}
                              </span>
                              <span className="mx-1 text-foreground/25" aria-hidden>
                                ·
                              </span>
                              <span className="font-medium text-foreground">
                                {variantTitle.option}
                              </span>
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "min-w-0 truncate tracking-tight",
                                isParentSelector
                                  ? "text-[12px] font-semibold text-foreground/70"
                                  : isVariant
                                    ? "text-[13px] font-medium text-foreground"
                                    : "text-[13px] font-medium text-foreground",
                              )}
                              title={
                                isVariant
                                  ? (variantTitle?.option ?? primaryName)
                                  : primaryName
                              }
                            >
                              {isVariant
                                ? (variantTitle?.option ?? primaryName)
                                : primaryName}
                            </span>
                          )}
                          {row.packageVariant ? (
                            <span className="hidden shrink-0 rounded-none border border-border bg-muted/40 px-1 py-px text-[9px] font-medium uppercase tracking-[0.08em] text-foreground/55 sm:inline-flex">
                              Pack
                            </span>
                          ) : null}
                          {isDuplicateName ? (
                            <span className="hidden shrink-0 rounded-none border border-red-500/30 bg-red-500/10 px-1 py-px text-[9px] font-medium text-red-800 dark:text-red-300 sm:inline-flex">
                              Duplicate
                            </span>
                          ) : null}
                          {row.active === false ? (
                            <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.08em] text-foreground/40">
                              Off
                            </span>
                          ) : null}
                        </div>

                        {isParentSelector && effectiveVariantCount > 0 ? (
                          <div className="mt-0.5 truncate text-[10px] font-medium tracking-tight text-foreground/40">
                            {effectiveVariantCount.toLocaleString()}{" "}
                            {effectiveVariantCount === 1 ? "variant" : "variants"}
                          </div>
                        ) : !isParentSelector && secondaryLine ? (
                          <div className="mt-0.5 hidden min-w-0 truncate font-mono text-[10px] tracking-tight text-foreground/35 sm:block">
                            {secondaryLine}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <span className={cn(catalogListMetricCellClass, catalogGridCol.stock)}>
                      {isParentSelector ? (
                        <span
                          className="text-[11px] tabular-nums text-foreground/20"
                          title="In-store stock on variants"
                        >
                          –
                        </span>
                      ) : stock.label !== "—" ? (
                        <span
                          className={cn(
                            "text-[12px] font-medium tabular-nums tracking-tight",
                            stock.className.includes("red")
                              ? "text-red-600 dark:text-red-400"
                              : stock.className.includes("amber")
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-foreground",
                          )}
                          title={stock.title}
                        >
                          {stock.label}
                        </span>
                      ) : (
                        <span className="text-[11px] tabular-nums text-foreground/20">
                          –
                        </span>
                      )}
                    </span>

                    <span
                      className={cn(
                        catalogListMetricCellClass,
                        catalogGridCol.sell,
                        "pr-2.5",
                      )}
                    >
                      {isParentSelector ? (
                        <span className="text-[11px] tabular-nums text-foreground/20">
                          –
                        </span>
                      ) : sell.kind === "empty" ? (
                        <NoPricePill />
                      ) : sell.kind === "price" ? (
                        <span
                          className="text-[12px] font-semibold tabular-nums tracking-tight text-foreground"
                          title={sell.title}
                        >
                          {sell.label}
                        </span>
                      ) : (
                        <span className="text-[11px] tabular-nums text-foreground/20">
                          –
                        </span>
                      )}
                    </span>

                    <span className={cn(catalogListMetricCellClass, catalogGridCol.category)}>
                      {!isParentSelector && categoryLabel ? (
                        <span
                          className={catalogListCategoryTagClass()}
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
});
