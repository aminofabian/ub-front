import type { LucideIcon } from "lucide-react";
import { CornerDownRight, Package, Tag } from "lucide-react";

import type { ItemSummaryRecord } from "@/lib/api";

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
  comfortable: 14,
  dense: 8,
} as const;

export type CatalogRowTone = {
  label: string;
  icon: LucideIcon;
  accent: string;
  accentLight: string;
  border: string;
  text: string;
  muted: string;
  rowBg: string;
  rowActive: string;
  gradient: string;
};

export function catalogRowKind(row: ItemSummaryRecord): CatalogRowKind {
  if (row.groupLabelOnly === true) return "group";
  if (row.variantOfItemId) return "variant";
  return "standalone";
}

export function buildCatalogRowMeta(rows: ItemSummaryRecord[]): Map<string, CatalogRowMeta> {
  const variantCountByParent = new Map<string, number>();
  for (const row of rows) {
    const parentId = row.variantOfItemId?.trim();
    if (!parentId) continue;
    variantCountByParent.set(parentId, (variantCountByParent.get(parentId) ?? 0) + 1);
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
      rowBg: "hover:bg-amber-500/[0.05]",
      rowActive: "bg-amber-500/[0.09] ring-amber-500/25",
      gradient:
        "bg-gradient-to-r from-amber-500/[0.14] via-amber-500/[0.06] to-transparent dark:from-amber-500/[0.16] dark:via-amber-950/30",
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
      rowBg: "hover:bg-violet-500/[0.04]",
      rowActive: "bg-violet-500/[0.08] ring-violet-500/20",
      gradient:
        "bg-gradient-to-r from-violet-500/[0.1] via-violet-500/[0.03] to-transparent dark:from-violet-500/[0.12] dark:via-violet-950/25",
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
    rowBg: parentish ? "hover:bg-teal-500/[0.04]" : "hover:bg-emerald-500/[0.04]",
    rowActive: parentish
      ? "bg-teal-500/[0.08] ring-teal-500/20"
      : "bg-emerald-500/[0.08] ring-emerald-500/20",
    gradient: parentish
      ? "bg-gradient-to-r from-teal-500/[0.1] via-teal-500/[0.04] to-transparent dark:from-teal-500/[0.12] dark:via-teal-950/25"
      : "bg-gradient-to-r from-emerald-500/[0.08] via-emerald-500/[0.03] to-transparent dark:from-emerald-500/[0.1] dark:via-emerald-950/20",
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
    if (kind === "group") return 46 + gap;
    if (kind === "variant") return 30;
    return 34 + gap;
  }
  if (kind === "group") return 58 + gap;
  if (kind === "variant") return 40;
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
