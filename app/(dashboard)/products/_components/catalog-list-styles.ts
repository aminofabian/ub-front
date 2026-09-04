import type { LucideIcon } from "lucide-react";
import { CornerDownRight, Package, Tag } from "lucide-react";

import { fetchItemById, type ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

export type CatalogRowKind = "group" | "variant" | "standalone";

export type CatalogRowMeta = {
  kind: CatalogRowKind;
  variantCount: number;
  /** Next row is a variant of this parent (visual “opens a group”). */
  opensVariantGroup: boolean;
  /** Previous row is this row’s parent (variant continuation). */
  continuesVariantGroup: boolean;
  /** Last variant row before the next parent / standalone. */
  endsVariantGroup: boolean;
  /** Starts a new parent / standalone block (gap before this row). */
  startsParentBlock: boolean;
};

/** Extra vertical space between one parent product and the next. */
export const CATALOG_PARENT_BLOCK_GAP_PX = {
  comfortable: 0,
  dense: 0,
} as const;

/** Gap after a closed variant group. */
export const CATALOG_VARIANT_GROUP_END_GAP_PX = {
  comfortable: 0,
  dense: 0,
} as const;

export const catalogListShellClass = cn(
  "flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden overflow-x-hidden",
  "bg-transparent",
);

export const catalogListToolbarClass = cn(
  "flex flex-wrap items-center justify-between gap-1",
  "bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_55%,transparent)] px-2 py-1 lg:border-b lg:border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_8%,transparent)] lg:px-2.5 lg:py-1",
);

export const catalogListToolbarMetaClass =
  "text-[10px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)]";

/** Left filter rail — same sheet language as the list + detail panel. */
export const catalogFilterColumnClass =
  "hidden min-h-0 w-[14.25rem] shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_40%,transparent)] lg:flex";

export const catalogFilterToolbarClass = cn(
  "flex shrink-0 items-center justify-between gap-1",
  "border-b border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_65%,transparent)]",
  "px-2 py-1.5",
);

export const catalogFilterToolbarTitleClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_42%,transparent)]";

export const catalogFilterBodyClass = cn(
  "flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto overflow-x-hidden",
  "divide-y divide-[color-mix(in_srgb,var(--catalog-ink,#15231f)_8%,transparent)] bg-transparent",
);

export const catalogFilterSectionClass =
  "flex min-w-0 flex-col gap-1.5 px-2 py-2";

export const catalogFilterLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_42%,transparent)]";

export const catalogFilterInputClass = cn(
  "h-7 w-full min-w-0 rounded-none border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white px-2 text-[11px] text-[var(--catalog-ink,#15231f)] shadow-none",
  "placeholder:text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_38%,transparent)]",
  "focus-visible:border-[var(--catalog-primary,#0f766e)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_20%,transparent)]",
  "disabled:cursor-not-allowed disabled:bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_80%,transparent)] disabled:text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_40%,transparent)]",
);

export const catalogFilterSelectClass = cn(
  catalogFilterInputClass,
  "cursor-pointer py-0",
);

export const catalogFilterHintClass =
  "text-[10px] font-normal leading-snug text-foreground/40";

export const catalogFilterOptionClass =
  "flex w-full cursor-pointer items-center gap-1.5 text-[11px] font-medium leading-tight text-foreground/70";

export const catalogFilterOptionCountClass =
  "ml-auto shrink-0 tabular-nums text-[10px] font-medium text-foreground/40";

export const catalogFilterCheckboxClass = cn(
  "size-3 shrink-0 rounded-none border border-border accent-foreground",
);

/** Compact attention / scope toggles — sheet cells. */
export const catalogFilterToggleClass = cn(
  "flex h-7 w-full items-center justify-between gap-1 rounded-none px-2 text-left text-[11px] font-medium tracking-tight transition-colors",
  "border-b border-border/60 bg-background text-foreground/70 last:border-b-0",
  "hover:bg-muted/30 hover:text-foreground",
);

export const catalogFilterToggleActiveClass = cn(
  "bg-muted/40 text-foreground",
);

/** Needs list — bordered sheet block matching detail metric/field rows. */
export const catalogFilterNeedsSheetClass = cn(
  "overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-white",
);

export const catalogFilterNeedsRowClass = cn(
  "flex w-full items-center justify-between gap-2 border-b border-border/60 px-2 py-1.5 text-left last:border-b-0",
  "text-[11px] font-medium tracking-tight text-foreground/70 transition-colors",
  "hover:bg-muted/30 hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/30",
);

export const catalogFilterNeedsRowActiveClass = cn(
  "bg-muted/40 text-foreground",
);

export const catalogFilterNeedsCountClass =
  "shrink-0 tabular-nums text-[11px] font-semibold tracking-tight text-foreground";

/** Scope tabs as a 2×2 sheet grid. */
export const catalogFilterScopeGridClass =
  "grid grid-cols-2 gap-px overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)]";

export const catalogFilterScopeCellClass = cn(
  "flex h-7 items-center justify-center bg-background text-[10px] font-medium tracking-tight text-foreground/55 transition-colors",
  "hover:bg-muted/30 hover:text-foreground",
);

export const catalogFilterScopeCellActiveClass = cn(
  "bg-muted/40 font-semibold text-foreground",
);

export const catalogListHeaderRowClass = cn(
  "sticky top-0 z-10 shrink-0",
  "bg-[color-mix(in_srgb,var(--catalog-ink,#15231f)_4%,transparent)] text-[9px] font-semibold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_42%,transparent)]",
  "border-b border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_8%,transparent)]",
);

/**
 * Spreadsheet grid — last column has no right border (flush to edge).
 * mobile — # · Product · Qty · Price
 * xl+    — + Category
 */
export const catalogListGridClass =
  "grid w-full min-w-0 max-w-full items-stretch gap-0 " +
  "grid-cols-[1.25rem_minmax(0,1fr)_2.25rem_3rem] " +
  "sm:grid-cols-[1.35rem_minmax(0,1fr)_2.5rem_3.5rem_0px] " +
  "xl:grid-cols-[1.35rem_minmax(0,1fr)_2.5rem_3.5rem_4.5rem]";

const sheetV = "border-r border-border/40";
const sheetH = "border-b border-border/40";
const catalogCellPad = "px-1.5 py-0";
const catalogMetricPad = "px-0.5 py-0";

/** ~7 characters of inset so variants nest under their parent / SKU column. */
export function catalogVariantRowIndentClass(
  _density: "comfortable" | "dense" = "dense",
): string {
  return "pl-[7ch]";
}

export const catalogGridCol = {
  check: cn(
    "col-start-1 self-stretch",
    sheetV,
    sheetH,
    "flex items-center justify-center bg-muted/25 px-0",
  ),
  product: cn(
    "col-start-2 min-w-0 self-stretch",
    sheetV,
    sheetH,
    catalogCellPad,
    "flex items-center",
  ),
  stock: cn("col-start-3 self-stretch", sheetV, sheetH),
  sell: cn(
    "col-start-4 self-stretch",
    sheetH,
    // Flush last column on mobile/sm — money hugs the edge
    "bg-muted/[0.12] xl:border-r xl:border-border/40 xl:bg-transparent",
  ),
  category: cn(
    "col-start-5 self-stretch",
    sheetH,
    "max-xl:invisible max-xl:pointer-events-none max-xl:border-0",
  ),
} as const;

/** Active-row selection bar. */
export function catalogRowAccentClass(
  _tone: CatalogRowTone,
  active: boolean,
): string {
  return cn(
    "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-[1] before:w-px before:bg-[var(--catalog-primary,#0f766e)] before:opacity-0",
    active && "before:opacity-100",
  );
}

/** Metric column wrapper */
export const catalogListMetricCellClass = cn(
  "relative z-[1] flex min-w-0 w-full items-center justify-end self-stretch overflow-hidden",
  catalogMetricPad,
);

export const catalogListMetricHeaderClass = cn(
  catalogListMetricCellClass,
  "justify-end text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/40",
);

/** Row-header / select gutter */
export function catalogListCheckboxCellClass(_isVariant: boolean): string {
  return "relative z-[1] flex h-full w-full items-center justify-center";
}

/** Sheet row handle — tap # to select (Excel-style, no checkbox chrome). */
export const catalogSheetRowHeaderClass = cn(
  "flex h-full min-h-[1.25rem] w-full items-center justify-center",
  "text-[8px] font-medium tabular-nums text-muted-foreground/70",
  "transition-colors hover:bg-muted/70 hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
  "active:bg-foreground/10",
);

/** Soft band for parent+variant families; standalones stay on the sheet. */
export function catalogRowHierarchyClass(
  meta: Pick<
    CatalogRowMeta,
    | "kind"
    | "variantCount"
    | "opensVariantGroup"
    | "continuesVariantGroup"
    | "endsVariantGroup"
  >,
  _tone: CatalogRowTone,
): string {
  if (meta.kind === "variant") {
    return "bg-[#f4f6f8] dark:bg-muted/20";
  }
  if (meta.kind === "group" || meta.variantCount > 0) {
    return "bg-[#e8ecf0] dark:bg-muted/35";
  }
  return "";
}

const catalogListCheckboxBaseClass = cn(
  "size-3.5 shrink-0 cursor-pointer appearance-none border-2 bg-background",
  "transition-[border-color,background-color] duration-150",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
  "bg-center bg-no-repeat [background-size:0.6rem_0.6rem]",
  "checked:[background-image:url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%223.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M5%2012l5%205L20%207%22%2F%3E%3C%2Fsvg%3E')]",
  "indeterminate:[background-image:url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%223.5%22%20stroke-linecap%3D%22round%22%3E%3Cpath%20d%3D%22M5%2012h14%22%2F%3E%3C%2Fsvg%3E')]",
);

/** Row-tone checkbox colors — no black / system blue */
export function catalogListCheckboxClass(
  kind: CatalogRowKind,
  variantCount = 0,
): string {
  if (kind === "variant") {
    return cn(
      catalogListCheckboxBaseClass,
      "size-3 border-[1.5px] [background-size:0.5rem_0.5rem]",
      "bg-white dark:bg-background",
      "border-foreground/35 dark:border-foreground/45",
      "checked:border-foreground checked:bg-foreground",
      "indeterminate:border-foreground indeterminate:bg-foreground",
    );
  }
  if (kind === "group") {
    return cn(
      catalogListCheckboxBaseClass,
      "border-foreground/30",
      "checked:border-foreground checked:bg-foreground",
      "indeterminate:border-foreground indeterminate:bg-foreground",
    );
  }
  const parentish = variantCount > 0;
  if (parentish) {
    return cn(
      catalogListCheckboxBaseClass,
      "border-foreground/30",
      "checked:border-foreground checked:bg-foreground",
      "indeterminate:border-foreground indeterminate:bg-foreground",
    );
  }
  return cn(
    catalogListCheckboxBaseClass,
    "border-foreground/30",
    "checked:border-foreground checked:bg-foreground",
    "indeterminate:border-foreground indeterminate:bg-foreground",
  );
}

/** Small filter checkbox in catalog toolbar (matches row-type tone). */
export function catalogListToolbarFilterCheckboxClass(
  type: CatalogListDisplayType,
): string {
  if (type === "parent") {
    return catalogListCheckboxClass("standalone", 1);
  }
  if (type === "variant") {
    return catalogListCheckboxClass("variant");
  }
  return catalogListCheckboxClass("standalone", 0);
}

export const catalogListProductCellClass =
  "relative z-[1] flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2";

/** Hide cell contents below a breakpoint without removing the grid track. */
export function catalogListMetricHiddenClass(breakpoint: "sm" | "xl" | "lg"): string {
  if (breakpoint === "sm") {
    return "max-sm:invisible max-sm:pointer-events-none";
  }
  if (breakpoint === "xl") {
    return "max-xl:invisible max-xl:pointer-events-none";
  }
  return "lg:invisible lg:pointer-events-none";
}

// catalogListMetricHiddenClass kept for skeleton; grid cols use catalogGridCol visibility.

/** Product photo frame in catalog rows */
export function catalogListThumbFrameClass(
  kind: CatalogRowKind,
  state?: { active?: boolean; inactive?: boolean },
): string {
  return cn(
    "relative block shrink-0 overflow-hidden rounded-none border border-border bg-muted/60",
    "transition-[border-color,opacity] duration-150",
    kind === "group" && "size-3.5",
    kind === "variant" && "size-3",
    kind === "standalone" && "size-3.5",
    state?.active && "z-[1] border-foreground/30",
    state?.inactive && "opacity-55 saturate-[0.65]",
  );
}

export const catalogListThumbImageClass = cn(
  "object-cover transition-transform duration-200 ease-out",
  "group-hover:scale-[1.04]",
);

export const catalogListThumbPlaceholderClass = cn(
  "flex h-full w-full items-center justify-center",
  "bg-muted/50 text-[10px] font-semibold uppercase tracking-tight text-foreground/40",
);

/** Quiet sheet category tag — square, even ink (no candy pills). */
export function catalogListCategoryTagClass(): string {
  return cn(
    "inline-block max-w-full truncate rounded-none border border-border bg-muted/30",
    "px-0.5 py-px text-[8px] font-medium uppercase tracking-[0.06em] text-foreground/55",
  );
}

/** Variant ids under a parent from loaded rows, then item detail when needed. */
export async function resolveVariantIdsForParent(
  parentId: string,
  listRows: ItemSummaryRecord[],
): Promise<string[]> {
  const pid = parentId.trim();
  const fromList = listRows
    .filter((r) => r.variantOfItemId?.trim() === pid)
    .map((r) => r.id);
  try {
    const detail = await fetchItemById(pid);
    const fromApi = (detail.variants ?? []).map((v) => v.id);
    return fromApi.length > 0 ? fromApi : fromList;
  } catch {
    return fromList;
  }
}

export type CatalogRowTone = {
  label: string;
  icon: LucideIcon;
  accent: string;
  accentLight: string;
  border: string;
  text: string;
  muted: string;
  gradient: string;
  rowHover: string;
  rowChecked: string;
  rowBulk: string;
  rowDetailActive: string;
};

export function catalogRowInteractionClasses(
  _tone: CatalogRowTone,
  state: {
    isDetailActive: boolean;
    isBulkSelected: boolean;
    isCheckboxChecked: boolean;
    zebra?: boolean;
    /** When set, skip zebra — hierarchy banding already paints the row. */
    sheetBanded?: boolean;
  },
): string {
  const {
    isDetailActive,
    isBulkSelected,
    isCheckboxChecked,
    zebra,
    sheetBanded,
  } = state;
  const showChecked = isCheckboxChecked && !isDetailActive && !isBulkSelected;
  const showBulk = isBulkSelected && !isDetailActive;

  return cn(
    "cursor-pointer transition-colors duration-75",
    !sheetBanded && (zebra ? "bg-[#fafafa] dark:bg-muted/15" : "bg-background"),
    !isDetailActive &&
      !showBulk &&
      !showChecked &&
      "hover:bg-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_6%,transparent)]",
    showChecked && "bg-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_10%,transparent)]",
    showBulk && "bg-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_14%,transparent)]",
    isDetailActive && "z-[2] bg-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_16%,transparent)]",
  );
}

export function catalogRowKind(row: ItemSummaryRecord): CatalogRowKind {
  if (row.groupLabelOnly === true) return "group";
  if (row.variantOfItemId) return "variant";
  return "standalone";
}

/** Flat list with each parent immediately followed by its variants (roots sorted by name). */
export function sortCatalogRowsParentFirst(
  rows: ItemSummaryRecord[],
): ItemSummaryRecord[] {
  if (rows.length <= 1) return rows;

  const childrenMap = new Map<string, ItemSummaryRecord[]>();
  for (const row of rows) {
    const parentId = row.variantOfItemId?.trim();
    if (!parentId) continue;
    const list = childrenMap.get(parentId) ?? [];
    list.push(row);
    childrenMap.set(parentId, list);
  }

  for (const [parentId, list] of childrenMap) {
    childrenMap.set(
      parentId,
      [...list].sort(
        (a, b) =>
          (a.variantName ?? a.name).localeCompare(b.variantName ?? b.name, undefined, {
            sensitivity: "base",
          }) || a.sku.localeCompare(b.sku, undefined, { sensitivity: "base" }),
      ),
    );
  }

  const visited = new Set<string>();
  const result: ItemSummaryRecord[] = [];

  const walk = (item: ItemSummaryRecord) => {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    result.push(item);
    for (const child of childrenMap.get(item.id) ?? []) {
      walk(child);
    }
  };

  const roots = rows
    .filter((row) => {
      const hasChildren = (childrenMap.get(row.id)?.length ?? 0) > 0;
      return hasChildren || !row.variantOfItemId;
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

  for (const root of roots) {
    walk(root);
  }

  for (const row of rows) {
    if (!visited.has(row.id)) {
      walk(row);
    }
  }

  return result;
}

export function buildVariantIdsByParentId(
  rows: ItemSummaryRecord[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const parentId = row.variantOfItemId?.trim();
    if (!parentId) continue;
    const list = map.get(parentId) ?? [];
    list.push(row.id);
    map.set(parentId, list);
  }
  return map;
}

export type CatalogListDisplayType = "parent" | "variant" | "standalone";

/** Toolbar / filter bucket: parent (incl. groups), variant SKU, standalone product. */
export function catalogListDisplayType(
  row: ItemSummaryRecord,
  variantCount: number,
): CatalogListDisplayType {
  if (row.variantOfItemId?.trim()) return "variant";
  if (row.groupLabelOnly === true || variantCount > 0) return "parent";
  return "standalone";
}

export function countCatalogRowsByDisplayType(
  rows: ItemSummaryRecord[],
): Record<CatalogListDisplayType, number> {
  const variantIdsByParent = buildVariantIdsByParentId(rows);
  const counts: Record<CatalogListDisplayType, number> = {
    parent: 0,
    variant: 0,
    standalone: 0,
  };
  for (const row of rows) {
    const variantCount = variantIdsByParent.get(row.id)?.length ?? 0;
    counts[catalogListDisplayType(row, variantCount)]++;
  }
  return counts;
}

export function filterCatalogRowsByDisplayType(
  rows: ItemSummaryRecord[],
  activeTypes: ReadonlySet<CatalogListDisplayType>,
): ItemSummaryRecord[] {
  if (activeTypes.size === CATALOG_LIST_DISPLAY_TYPES.length) return rows;
  if (activeTypes.size === 0) return [];
  const variantIdsByParent = buildVariantIdsByParentId(rows);
  return rows.filter((row) => {
    const variantCount = variantIdsByParent.get(row.id)?.length ?? 0;
    return activeTypes.has(catalogListDisplayType(row, variantCount));
  });
}

export const CATALOG_LIST_DISPLAY_TYPES = [
  "parent",
  "variant",
  "standalone",
] as const satisfies readonly CatalogListDisplayType[];

/** Parent group label or sellable parent that has option rows beneath it. */
export function isCatalogParentSelectorRow(
  row: ItemSummaryRecord,
  variantCount: number,
): boolean {
  return row.groupLabelOnly === true || (variantCount > 0 && !row.variantOfItemId);
}

export function buildCatalogRowMeta(rows: ItemSummaryRecord[]): Map<string, CatalogRowMeta> {
  const variantIdsByParent = buildVariantIdsByParentId(rows);
  const variantCountByParent = new Map<string, number>();
  for (const [parentId, ids] of variantIdsByParent) {
    variantCountByParent.set(parentId, ids.length);
  }

  const meta = new Map<string, CatalogRowMeta>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const kind = catalogRowKind(row);
    const variantCount = variantCountByParent.get(row.id) ?? 0;
    const next = rows[i + 1];
    const prev = rows[i - 1];
    const opensVariantGroup =
      (kind === "group" || (kind === "standalone" && variantCount > 0)) &&
      next != null &&
      next.variantOfItemId === row.id;
    const continuesVariantGroup =
      kind === "variant" &&
      prev != null &&
      (prev.id === row.variantOfItemId ||
        (prev.groupLabelOnly === true && prev.id === row.variantOfItemId));
    const endsVariantGroup =
      kind === "variant" &&
      (next == null || next.variantOfItemId !== row.variantOfItemId);
    const startsParentBlock =
      i > 0 && kind !== "variant" && !continuesVariantGroup;
    meta.set(row.id, {
      kind,
      variantCount,
      opensVariantGroup,
      continuesVariantGroup,
      endsVariantGroup,
      startsParentBlock,
    });
  }
  return meta;
}

export function catalogRowTone(kind: CatalogRowKind, variantCount: number): CatalogRowTone {
  if (kind === "group") {
    return {
      label: "Parent group",
      icon: Tag,
      accent: "bg-muted-foreground",
      accentLight: "bg-muted text-muted-foreground",
      border: "border-border",
      text: "text-foreground",
      muted: "text-muted-foreground",
      gradient: "bg-muted/45",
      rowHover: "hover:bg-muted/60",
      rowChecked: "bg-muted/55",
      rowBulk: "bg-muted/50",
      rowDetailActive: "z-[2] bg-muted/70",
    };
  }
  if (kind === "variant") {
    return {
      label: "Variant",
      icon: CornerDownRight,
      accent: "bg-foreground",
      accentLight: "border border-border bg-muted text-foreground",
      border: "border-border",
      text: "text-foreground",
      muted: "text-muted-foreground",
      gradient: "",
      rowHover: "hover:bg-muted/30",
      rowChecked: "bg-muted/40",
      rowBulk: "bg-muted/35",
      rowDetailActive: "z-[2] bg-muted/50",
    };
  }
  const parentish = variantCount > 0;
  if (parentish) {
    return {
      label: "Parent product",
      icon: Package,
      accent: "bg-muted-foreground",
      accentLight: "bg-muted text-muted-foreground",
      border: "border-border",
      text: "text-foreground",
      muted: "text-muted-foreground",
      gradient: "bg-muted/40",
      rowHover: "hover:bg-muted/55",
      rowChecked: "bg-muted/50",
      rowBulk: "bg-muted/45",
      rowDetailActive: "z-[2] bg-muted/65",
    };
  }
  return {
    label: "Product",
    icon: Package,
    accent: "bg-foreground/40",
    accentLight: "bg-muted text-muted-foreground",
    border: "border-border",
    text: "text-foreground",
    muted: "text-muted-foreground",
    gradient: "",
    rowHover: "hover:bg-muted/30",
    rowChecked: "bg-muted/35",
    rowBulk: "bg-muted/30",
    rowDetailActive: "z-[2] bg-muted/45",
  };
}

export function catalogRowHeightPx(
  kind: CatalogRowKind,
  density: "comfortable" | "dense",
  meta?: Pick<CatalogRowMeta, "startsParentBlock" | "endsVariantGroup">,
): number {
  const gap = meta?.startsParentBlock ? CATALOG_PARENT_BLOCK_GAP_PX[density] : 0;
  const groupEndGap = meta?.endsVariantGroup
    ? CATALOG_VARIANT_GROUP_END_GAP_PX[density]
    : 0;
  if (density === "dense") {
    // Single-line spreadsheet rows — pack as many products as possible.
    if (kind === "group") return 22 + gap;
    if (kind === "variant") return 20 + groupEndGap;
    return 22 + gap;
  }
  if (kind === "group") return 36 + gap;
  if (kind === "variant") return 30 + groupEndGap;
  return 34 + gap;
}

export function catalogStockTone(qty: number | string | null | undefined): {
  label: string | null;
  className: string;
} {
  const n = qty == null ? null : Number(qty);
  if (n == null || !Number.isFinite(n)) {
    return { label: null, className: "bg-muted text-muted-foreground" };
  }
  if (n <= 0) {
    return {
      label: "Out",
      className: "bg-red-500/12 text-red-700 dark:text-red-400",
    };
  }
  if (n <= 5) {
    return {
      label: "Low",
      className: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
    };
  }
  return {
    label: "OK",
    className: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  };
}
