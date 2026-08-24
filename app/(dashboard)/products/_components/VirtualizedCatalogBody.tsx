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
import Link from "next/link";
import { BookOpen, Library, PackagePlus, Plus } from "lucide-react";

import { itemListThumbnailUrl, type CategoryRecord, type ItemSummaryRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
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
  onCreateNew?: () => void;
  canCreateNew?: boolean;
};

function FixNamePill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-none border border-amber-600/35 bg-amber-500/10 px-1 py-px text-[8px] font-medium text-amber-800 dark:text-amber-200">
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
    onCreateNew,
    canCreateNew = false,
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
          <div className="mx-3 my-8 flex flex-col items-stretch sm:mx-4 sm:my-10">
            {catalogEmpty ? (
              <div className="mx-auto w-full max-w-md space-y-4">
                <div className="space-y-1 text-center">
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    Your catalog is empty
                  </p>
                  <p className="text-xs leading-relaxed text-foreground/50">
                    Pick how you want to add the first products.
                  </p>
                </div>

                <div className="overflow-hidden rounded-none border border-border bg-background shadow-none divide-y divide-border">
                  {canAddFromCatalog && onAddFromCatalog ? (
                    <button
                      type="button"
                      onClick={onAddFromCatalog}
                      className="group flex w-full items-start gap-3 bg-foreground px-3.5 py-3.5 text-left text-background transition hover:bg-foreground/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center border border-background/25 bg-background/10">
                        <Library className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold tracking-tight">
                            Browse shared catalog
                          </span>
                          <PackagePlus
                            className="size-3.5 shrink-0 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                            aria-hidden
                          />
                        </span>
                        <span className="block text-[11px] leading-snug text-background/70">
                          Import common products — names, barcodes, and prices
                          already filled in.
                        </span>
                      </span>
                    </button>
                  ) : null}

                  {canCreateNew && onCreateNew ? (
                    <button
                      type="button"
                      onClick={onCreateNew}
                      className={cn(
                        "group flex w-full items-start gap-3 px-3.5 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        canAddFromCatalog && onAddFromCatalog
                          ? "bg-background text-foreground hover:bg-muted/40"
                          : "bg-foreground text-background hover:bg-foreground/92",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-9 shrink-0 items-center justify-center border",
                          canAddFromCatalog && onAddFromCatalog
                            ? "border-border bg-muted/30 text-foreground/70"
                            : "border-background/25 bg-background/10",
                        )}
                      >
                        <Plus className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold tracking-tight">
                            {canAddFromCatalog && onAddFromCatalog
                              ? "Create from scratch"
                              : "Add your first product"}
                          </span>
                          <Plus
                            className={cn(
                              "size-3.5 shrink-0 transition group-hover:translate-x-0.5",
                              canAddFromCatalog && onAddFromCatalog
                                ? "text-foreground/40 group-hover:text-foreground/70"
                                : "opacity-70 group-hover:opacity-100",
                            )}
                            aria-hidden
                          />
                        </span>
                        <span
                          className={cn(
                            "block text-[11px] leading-snug",
                            canAddFromCatalog && onAddFromCatalog
                              ? "text-foreground/50"
                              : "text-background/70",
                          )}
                        >
                          {canAddFromCatalog && onAddFromCatalog
                            ? "Name it, set a sell price, and start selling."
                            : "Name it, set a sell price, and you are ready at the till."}
                        </span>
                      </span>
                    </button>
                  ) : null}
                </div>

                <Link
                  href={APP_ROUTES.helpAddProducts}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex w-full items-start gap-3 rounded-none border border-border bg-background px-3.5 py-3 text-left transition hover:border-primary/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center border border-border bg-muted/30 text-foreground/60">
                    <BookOpen className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold tracking-tight text-foreground">
                        Read the product guide
                      </span>
                      <BookOpen className="size-3.5 shrink-0 text-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-foreground/70" aria-hidden />
                    </span>
                    <span className="block text-[11px] leading-snug text-foreground/50">
                      Standalone vs groups, variants, and packages — with screenshots.
                    </span>
                  </span>
                </Link>

                {!canAddFromCatalog && !canCreateNew ? (
                  <p className="text-center text-xs text-foreground/45">
                    Ask a manager for permission to add products.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mx-auto flex max-w-[18rem] flex-col items-center gap-2 py-10 text-center">
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  No products match
                </p>
                <p className="text-xs leading-relaxed text-foreground/50">
                  Broaden search or reset filters in the sidebar.
                </p>
              </div>
            )}
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
                sheetBanded:
                  isVariant || isGroup || effectiveVariantCount > 0,
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
                        ? "min-h-[1.25rem] sm:min-h-[1.375rem]"
                        : "min-h-8 sm:min-h-9",
                      catalogRowHierarchyClass(meta, tone),
                      catalogRowAccentClass(tone, active),
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
                        "gap-1",
                        isVariant && catalogVariantRowIndentClass(density),
                      )}
                    >
                      {density !== "dense" && !isVariant && listThumb ? (
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

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1">
                          {nameResolution.needsNameFix ? (
                            <>
                              {nameResolution.label !== CATALOG_FIX_NAME_LABEL ? (
                                <span className="min-w-0 truncate text-[11px] font-medium tracking-tight text-foreground">
                                  {nameResolution.label}
                                </span>
                              ) : null}
                              <FixNamePill />
                            </>
                          ) : isVariant && variantTitle?.family ? (
                            <span
                              className="min-w-0 truncate text-[11px] tracking-tight"
                              title={variantTitle.combined}
                            >
                              <span className="font-normal text-foreground/45">
                                {variantTitle.family}
                              </span>
                              <span className="mx-0.5 text-foreground/25" aria-hidden>
                                /
                              </span>
                              <span className="font-medium text-foreground">
                                {variantTitle.option}
                              </span>
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "min-w-0 truncate text-[11px] tracking-tight",
                                isParentSelector
                                  ? "font-semibold text-foreground"
                                  : "font-medium text-foreground",
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
                              {isParentSelector && effectiveVariantCount > 0 ? (
                                <span className="ml-1 font-normal text-foreground/40">
                                  · {effectiveVariantCount}
                                </span>
                              ) : null}
                            </span>
                          )}
                          {row.packageVariant ? (
                            <span className="hidden shrink-0 rounded-none border border-border bg-muted/40 px-0.5 text-[8px] font-medium uppercase tracking-[0.06em] text-foreground/55 sm:inline-flex">
                              Pack
                            </span>
                          ) : null}
                          {isDuplicateName ? (
                            <span className="hidden shrink-0 rounded-none border border-red-500/30 bg-red-500/10 px-0.5 text-[8px] font-medium text-red-800 dark:text-red-300 sm:inline-flex">
                              Dup
                            </span>
                          ) : null}
                          {row.active === false ? (
                            <span className="shrink-0 text-[8px] font-medium uppercase tracking-[0.06em] text-foreground/40">
                              Off
                            </span>
                          ) : null}
                        </div>

                        {density !== "dense" &&
                        isParentSelector &&
                        effectiveVariantCount > 0 ? (
                          <div className="mt-0.5 truncate text-[10px] font-medium tracking-tight text-foreground/40">
                            {effectiveVariantCount.toLocaleString()}{" "}
                            {effectiveVariantCount === 1 ? "variant" : "variants"}
                          </div>
                        ) : density !== "dense" &&
                          !isParentSelector &&
                          secondaryLine ? (
                          <div className="mt-0.5 hidden min-w-0 truncate font-mono text-[10px] tracking-tight text-foreground/35 sm:block">
                            {secondaryLine}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <span className={cn(catalogListMetricCellClass, catalogGridCol.stock)}>
                      {isParentSelector ? (
                        <span
                          className="text-[10px] tabular-nums text-foreground/20"
                          title="In-store stock on variants"
                        >
                          –
                        </span>
                      ) : stock.label !== "—" ? (
                        <span
                          className={cn(
                            "text-[11px] font-medium tabular-nums tracking-tight",
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
                        <span className="text-[10px] tabular-nums text-foreground/20">
                          –
                        </span>
                      )}
                    </span>

                    <span
                      className={cn(
                        catalogListMetricCellClass,
                        catalogGridCol.sell,
                        "pr-1.5",
                      )}
                    >
                      {isParentSelector ? (
                        <span className="text-[10px] tabular-nums text-foreground/20">
                          –
                        </span>
                      ) : sell.kind === "empty" ? (
                        <NoPricePill />
                      ) : sell.kind === "price" ? (
                        <span
                          className="text-[11px] font-semibold tabular-nums tracking-tight text-foreground"
                          title={sell.title}
                        >
                          {sell.label}
                        </span>
                      ) : (
                        <span className="text-[10px] tabular-nums text-foreground/20">
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
