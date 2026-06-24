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
  "border-y border-r border-border bg-card",
);

export const catalogListToolbarClass = cn(
  "flex flex-wrap items-center justify-between gap-2 border-y border-r border-border",
  "bg-muted/30 px-2.5 py-1.5",
);

export const catalogListToolbarMetaClass =
  "text-xs text-muted-foreground";

/** Left filter column — shares borders with {@link catalogListShellClass}. */
export const catalogFilterColumnClass =
  "hidden min-h-0 w-[12rem] shrink-0 flex-col lg:flex";

export const catalogFilterToolbarClass = cn(
  "flex shrink-0 items-center justify-between gap-2",
  "border-y border-l border-r border-border bg-muted/30",
  "px-2.5 py-1.5",
);

export const catalogFilterToolbarTitleClass =
  "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

export const catalogFilterBodyClass = cn(
  "flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden",
  "border-b border-l border-r border-border bg-card px-2.5 py-2",
);

export const catalogFilterSectionClass = "flex min-w-0 flex-col gap-1";

export const catalogFilterLabelClass =
  "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

export const catalogFilterInputClass = cn(
  "h-7 w-full min-w-0 border border-border bg-background px-2 text-xs shadow-none",
  "placeholder:text-muted-foreground/60",
  "focus-visible:border-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30",
  "disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground",
);

export const catalogFilterSelectClass = cn(
  catalogFilterInputClass,
  "cursor-pointer py-0",
);

export const catalogFilterHintClass =
  "text-[10px] leading-snug text-muted-foreground";

export const catalogFilterOptionClass =
  "flex w-full cursor-pointer items-center gap-1.5 text-[11px] leading-tight text-foreground";

export const catalogFilterOptionCountClass =
  "ml-auto shrink-0 tabular-nums text-[10px] font-semibold text-muted-foreground";

export const catalogFilterCheckboxClass = cn(
  "size-3 shrink-0 border border-border accent-foreground",
);

export const catalogListHeaderRowClass = cn(
  "shrink-0 bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
);

/** checkbox · product · stock · sell · category */
export const catalogListGridClass =
  "grid w-full min-w-0 max-w-full items-stretch gap-0 " +
  "grid-cols-[2.25rem_minmax(0,1fr)_3.25rem_0px_0px] " +
  "sm:grid-cols-[2.25rem_minmax(0,1fr)_3.25rem_4.25rem_0px] " +
  "xl:grid-cols-[2.25rem_minmax(0,1fr)_3.25rem_4.25rem_4.5rem]";

const catalogColRowBorder = "border-b border-border";
const catalogCellPad = "px-3 py-1";
const catalogMetricPad = "px-1.5 py-1";

/** Whole-row inset for variant SKUs (checkbox through metrics). */
export const catalogVariantRowIndentClass = "pl-14";

export const catalogGridCol = {
  check: cn(
    "col-start-1 self-stretch",
    "flex items-center justify-center px-1 py-1",
  ),
  product: cn(
    "col-start-2 min-w-0 self-stretch",
    catalogColRowBorder,
    catalogCellPad,
    "flex items-center",
  ),
  stock: cn("col-start-3 self-stretch", catalogColRowBorder),
  sell: cn(
    "col-start-4 self-stretch",
    catalogColRowBorder,
    "max-sm:invisible max-sm:pointer-events-none",
  ),
  category: cn(
    "col-start-5 self-stretch",
    catalogColRowBorder,
    "max-xl:invisible max-xl:pointer-events-none",
  ),
} as const;

/** Active-row left accent — pseudo-element so it does not consume a grid column. */
export function catalogRowAccentClass(
  tone: CatalogRowTone,
  active: boolean,
): string {
  const beforeBg = tone.accent.replace(/^bg-/, "before:bg-");
  return cn(
    "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-0 before:w-0.5 before:opacity-0 before:transition-opacity",
    beforeBg,
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
  "justify-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
);

/** Checkbox cell — variant rows align left inside indented track */
export function catalogListCheckboxCellClass(isVariant: boolean): string {
  return cn(
    "relative z-[1] flex w-full items-center",
    isVariant ? "justify-start" : "justify-center",
  );
}

/** Left rail — disabled; hierarchy is indent + tone only. */
export function catalogRowHierarchyClass(
  _meta: Pick<CatalogRowMeta, "kind">,
  _tone: CatalogRowTone,
): string {
  return "";
}

export function catalogTypeChipClass(
  kind: CatalogRowKind,
  variantCount: number,
): string {
  if (kind === "group") {
    return "border border-amber-500/25 bg-amber-500/12 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100";
  }
  if (kind === "variant") {
    return "border border-border bg-muted/50 text-foreground";
  }
  if (variantCount > 0) {
    return "border border-teal-500/25 bg-teal-500/12 text-teal-900 dark:bg-teal-500/15 dark:text-teal-100";
  }
  return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:bg-emerald-500/12 dark:text-emerald-100";
}

export function catalogTypeChipLabel(
  kind: CatalogRowKind,
  variantCount: number,
): string | null {
  if (kind === "group") return null;
  if (kind === "variant") return null;
  if (variantCount > 0) return `Parent · ${variantCount}`;
  return null;
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
      "border-amber-400/45",
      "checked:border-amber-600 checked:bg-amber-600",
      "indeterminate:border-amber-600 indeterminate:bg-amber-600",
      "dark:checked:border-amber-500 dark:checked:bg-amber-500",
      "dark:indeterminate:border-amber-500 dark:indeterminate:bg-amber-500",
    );
  }
  const parentish = variantCount > 0;
  if (parentish) {
    return cn(
      catalogListCheckboxBaseClass,
      "border-teal-400/45",
      "checked:border-teal-600 checked:bg-teal-600",
      "indeterminate:border-teal-600 indeterminate:bg-teal-600",
      "dark:checked:border-teal-500 dark:checked:bg-teal-500",
      "dark:indeterminate:border-teal-500 dark:indeterminate:bg-teal-500",
    );
  }
  return cn(
    catalogListCheckboxBaseClass,
    "border-emerald-400/45",
    "checked:border-emerald-600 checked:bg-emerald-600",
    "indeterminate:border-emerald-600 indeterminate:bg-emerald-600",
    "dark:checked:border-emerald-500 dark:checked:bg-emerald-500",
    "dark:indeterminate:border-emerald-500 dark:indeterminate:bg-emerald-500",
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
  "relative z-[1] flex min-w-0 flex-1 items-center gap-2";

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
    "relative block shrink-0 overflow-hidden border border-border bg-muted/70",
    "transition-[border-color,opacity] duration-150",
    kind === "group" && "size-7 border-amber-500/25",
    kind === "variant" && "size-5",
    kind === "standalone" && "size-6",
    state?.active && "z-[1] border-primary/40",
    state?.inactive && "opacity-55 saturate-[0.65]",
  );
}

export const catalogListThumbImageClass = cn(
  "object-cover transition-transform duration-200 ease-out",
  "group-hover:scale-[1.04]",
);

export const catalogListThumbPlaceholderClass = cn(
  "flex h-full w-full items-center justify-center",
  "bg-gradient-to-br from-muted/90 via-muted/50 to-background/80",
);

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
  tone: CatalogRowTone,
  state: {
    isDetailActive: boolean;
    isBulkSelected: boolean;
    isCheckboxChecked: boolean;
  },
): string {
  const { isDetailActive, isBulkSelected, isCheckboxChecked } = state;
  const showChecked = isCheckboxChecked && !isDetailActive && !isBulkSelected;
  const showBulk = isBulkSelected && !isDetailActive;

  return cn(
    "cursor-pointer transition-colors duration-100 ease-out",
    tone.gradient,
    !isDetailActive && !showBulk && !showChecked && tone.rowHover,
    showChecked && tone.rowChecked,
    showBulk && tone.rowBulk,
    isDetailActive && tone.rowDetailActive,
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
      accent: "bg-amber-500",
      accentLight: "bg-amber-500/12 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100",
      border: "border-amber-500/35",
      text: "text-amber-950 dark:text-amber-50",
      muted: "text-amber-800/70 dark:text-amber-300/70",
      gradient: "bg-amber-500/[0.06] dark:bg-amber-500/[0.08]",
      rowHover: "hover:bg-amber-500/10 dark:hover:bg-amber-500/12",
      rowChecked: "bg-amber-500/12",
      rowBulk: "bg-amber-500/10",
      rowDetailActive: "z-[2] bg-amber-500/14",
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
  return {
    label: parentish ? "Parent product" : "Product",
    icon: Package,
    accent: parentish ? "bg-teal-500" : "bg-emerald-500",
    accentLight: parentish
      ? "bg-teal-500/12 text-teal-900 dark:bg-teal-500/15 dark:text-teal-100"
      : "bg-emerald-500/12 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100",
    border: parentish ? "border-teal-500/30" : "border-emerald-500/30",
    text: parentish
      ? "text-teal-950 dark:text-teal-50"
      : "text-emerald-950 dark:text-emerald-50",
    muted: parentish
      ? "text-teal-800/70 dark:text-teal-300/70"
      : "text-emerald-800/70 dark:text-emerald-300/70",
    gradient: parentish
      ? "bg-teal-500/[0.05] dark:bg-teal-500/[0.07]"
      : "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06]",
    rowHover: parentish
      ? "hover:bg-teal-500/10 dark:hover:bg-teal-500/12"
      : "hover:bg-emerald-500/10 dark:hover:bg-emerald-500/12",
    rowChecked: parentish
      ? "bg-teal-500/12"
      : "bg-emerald-500/12",
    rowBulk: parentish
      ? "bg-teal-500/10"
      : "bg-emerald-500/10",
    rowDetailActive: parentish
      ? "z-[2] bg-teal-500/14"
      : "z-[2] bg-emerald-500/14",
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
    if (kind === "group") return 40 + gap;
    if (kind === "variant") return 32 + groupEndGap;
    return 36 + gap;
  }
  if (kind === "group") return 48 + gap;
  if (kind === "variant") return 40 + groupEndGap;
  return 44 + gap;
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
