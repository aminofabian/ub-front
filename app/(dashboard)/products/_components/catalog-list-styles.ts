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
  /** Starts a new parent / standalone block (gap before this row). */
  startsParentBlock: boolean;
};

/** Extra vertical space between one parent product and the next. */
export const CATALOG_PARENT_BLOCK_GAP_PX = {
  comfortable: 16,
  dense: 10,
} as const;

/** Shared grid for header + rows (checkbox · thumb · product · stock · category). */
export const catalogListGridClass =
  "grid w-full items-center gap-x-3 gap-y-0 grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_auto] md:grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_4.75rem_minmax(0,min(12rem,26vw))]";

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
    "cursor-pointer transition-[background-color,box-shadow,ring-width,ring-color] duration-150 ease-out",
    tone.gradient,
    !isDetailActive && !showBulk && !showChecked && tone.rowHover,
    !isDetailActive && "hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
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
    const startsParentBlock = i > 0 && kind !== "variant";
    meta.set(row.id, {
      kind,
      variantCount,
      opensVariantGroup,
      continuesVariantGroup,
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
      rowChecked: "bg-amber-500/12 ring-1 ring-inset ring-amber-500/30",
      rowBulk: "bg-amber-500/10 ring-1 ring-inset ring-amber-500/25",
      rowDetailActive:
        "z-[2] bg-amber-500/14 shadow-sm ring-2 ring-inset ring-amber-500/40 dark:bg-amber-500/18 dark:ring-amber-400/35",
    };
  }
  if (kind === "variant") {
    return {
      label: "Variant",
      icon: CornerDownRight,
      accent: "bg-violet-500",
      accentLight: "bg-violet-500/12 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100",
      border: "border-violet-500/30",
      text: "text-violet-950 dark:text-violet-50",
      muted: "text-violet-800/65 dark:text-violet-300/65",
      gradient: "bg-violet-500/[0.05] dark:bg-violet-500/[0.07]",
      rowHover: "hover:bg-violet-500/10 dark:hover:bg-violet-500/12",
      rowChecked: "bg-violet-500/12 ring-1 ring-inset ring-violet-500/30",
      rowBulk: "bg-violet-500/10 ring-1 ring-inset ring-violet-400/25",
      rowDetailActive:
        "z-[2] bg-violet-500/14 shadow-sm ring-2 ring-inset ring-violet-500/40 dark:bg-violet-500/18 dark:ring-violet-400/35",
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
      ? "bg-teal-500/12 ring-1 ring-inset ring-teal-500/30"
      : "bg-emerald-500/12 ring-1 ring-inset ring-emerald-500/30",
    rowBulk: parentish
      ? "bg-teal-500/10 ring-1 ring-inset ring-teal-500/25"
      : "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/25",
    rowDetailActive: parentish
      ? "z-[2] bg-teal-500/14 shadow-sm ring-2 ring-inset ring-teal-500/40 dark:bg-teal-500/18 dark:ring-teal-400/35"
      : "z-[2] bg-emerald-500/14 shadow-sm ring-2 ring-inset ring-emerald-500/40 dark:bg-emerald-500/18 dark:ring-emerald-400/35",
  };
}

export function catalogRowHeightPx(
  kind: CatalogRowKind,
  density: "comfortable" | "dense",
  startsParentBlock = false,
): number {
  const gap =
    startsParentBlock ? CATALOG_PARENT_BLOCK_GAP_PX[density] : 0;
  if (density === "dense") {
    if (kind === "group") return 50 + gap;
    if (kind === "variant") return 36;
    return 38 + gap;
  }
  if (kind === "group") return 62 + gap;
  if (kind === "variant") return 46;
  return 48 + gap;
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
