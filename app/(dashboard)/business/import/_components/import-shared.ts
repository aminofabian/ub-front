import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  CircleDollarSign,
  Download,
  FileJson,
  FileSpreadsheet,
  ListChecks,
  Package,
  Tag,
  Truck,
} from "lucide-react";

export type ImportKind =
  | "products"
  | "suppliers"
  | "buying_prices"
  | "selling_prices";

export type CsvTemplateKind = "items" | "suppliers" | "opening-stock";

export type ImportSectionId =
  | "csv-items"
  | "csv-suppliers"
  | "csv-opening-stock"
  | "legacy-products"
  | "legacy-suppliers"
  | "legacy-buying"
  | "legacy-selling"
  | "templates"
  | "export"
  | "howto";

export const CSV_TEMPLATES: {
  kind: CsvTemplateKind;
  label: string;
  hint: string;
}[] = [
  { kind: "items", label: "Items", hint: "Catalog + prices + on-hand" },
  { kind: "suppliers", label: "Suppliers", hint: "Vendors" },
  { kind: "opening-stock", label: "Opening stock", hint: "Branch + SKU + qty" },
];

export const CSV_COLUMNS: Record<CsvTemplateKind, string[]> = {
  items: [
    "sku",
    "name",
    "item_type_key",
    "barcode",
    "unit_type",
    "is_stocked",
    "is_sellable",
    "category_name",
    "aisle_code",
    "brand",
    "size",
    "buying_price",
    "selling_price",
    "on_hand",
    "min_stock_level",
    "reorder_level",
    "supplier_name",
    "supplier_code",
    "image_url",
  ],
  suppliers: ["name", "code", "supplier_type", "vat_pin", "status", "notes"],
  "opening-stock": ["branch_name", "sku", "quantity", "unit_cost", "notes"],
};

/** Async import jobs are drained by a background worker (4s poll interval). */
export const CSV_JOB_POLL_MS = 1500;
/** Give up the live progress UI after ~3 minutes; the job keeps running server-side. */
export const CSV_JOB_MAX_POLLS = 120;

export const CSV_KIND_ICONS: Record<CsvTemplateKind, LucideIcon> = {
  items: Package,
  suppliers: Truck,
  "opening-stock": Boxes,
};

export type ImportSectionNavItem = {
  id: ImportSectionId;
  label: string;
  hint: string;
  icon: LucideIcon;
  group: "csv" | "legacy" | "tools";
};

export const IMPORT_SECTIONS: ImportSectionNavItem[] = [
  {
    id: "csv-items",
    label: "CSV Items",
    hint: "Catalog + prices + on-hand",
    icon: Package,
    group: "csv",
  },
  {
    id: "csv-suppliers",
    label: "CSV Suppliers",
    hint: "Vendor rows",
    icon: Truck,
    group: "csv",
  },
  {
    id: "csv-opening-stock",
    label: "CSV Opening stock",
    hint: "Branch + SKU + qty",
    icon: Boxes,
    group: "csv",
  },
  {
    id: "legacy-products",
    label: "Legacy JSON Products",
    hint: "Old product export",
    icon: FileJson,
    group: "legacy",
  },
  {
    id: "legacy-suppliers",
    label: "Legacy JSON Suppliers",
    hint: "Old supplier export",
    icon: Truck,
    group: "legacy",
  },
  {
    id: "legacy-buying",
    label: "Legacy JSON Buying prices",
    hint: "Cost history rows",
    icon: CircleDollarSign,
    group: "legacy",
  },
  {
    id: "legacy-selling",
    label: "Legacy JSON Selling prices",
    hint: "List price rows",
    icon: Tag,
    group: "legacy",
  },
  {
    id: "templates",
    label: "Start with a template",
    hint: "Download blank CSVs",
    icon: FileSpreadsheet,
    group: "tools",
  },
  {
    id: "export",
    label: "Export current data",
    hint: "Same columns as templates",
    icon: Download,
    group: "tools",
  },
  {
    id: "howto",
    label: "How it works",
    hint: "Round-trip + background jobs",
    icon: ListChecks,
    group: "tools",
  },
];

export function sectionMeta(id: ImportSectionId): ImportSectionNavItem {
  return (
    IMPORT_SECTIONS.find((s) => s.id === id) ?? {
      id,
      label: id,
      hint: "Import tools for your catalog.",
      icon: FileSpreadsheet,
      group: "tools",
    }
  );
}

export function csvKindFromSection(
  id: ImportSectionId,
): CsvTemplateKind | null {
  switch (id) {
    case "csv-items":
      return "items";
    case "csv-suppliers":
      return "suppliers";
    case "csv-opening-stock":
      return "opening-stock";
    default:
      return null;
  }
}

export function importKindFromSection(id: ImportSectionId): ImportKind | null {
  switch (id) {
    case "legacy-products":
      return "products";
    case "legacy-suppliers":
      return "suppliers";
    case "legacy-buying":
      return "buying_prices";
    case "legacy-selling":
      return "selling_prices";
    default:
      return null;
  }
}

export function isCsvSection(id: ImportSectionId): boolean {
  return csvKindFromSection(id) != null;
}

export function isLegacySection(id: ImportSectionId): boolean {
  return importKindFromSection(id) != null;
}

export function kindIcon(kind: ImportKind): LucideIcon {
  switch (kind) {
    case "products":
      return FileJson;
    case "suppliers":
      return Truck;
    case "buying_prices":
      return CircleDollarSign;
    case "selling_prices":
      return Tag;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function csvSuccessMessage(csvKind: CsvTemplateKind): string {
  return csvKind === "items"
    ? "No blocking issues reported. Products should appear under Catalog; refresh the Products page if it was already open."
    : csvKind === "suppliers"
      ? "No blocking issues reported. Suppliers should appear under Suppliers; refresh that page if it was already open."
      : "No blocking issues reported. Opening stock is applied to the listed branch(es).";
}

export function jsonSuccessMessage(importKind: ImportKind): string {
  return importKind === "products"
    ? "No blocking issues reported. Products should appear under Catalog; refresh the Products page if it was already open."
    : importKind === "suppliers"
      ? "No blocking issues reported. Suppliers should appear under Suppliers; refresh that page if it was already open."
      : importKind === "buying_prices"
        ? "No blocking issues reported. Buying costs are stored for the item + supplier; refresh pricing views as needed."
        : "No blocking issues reported. Selling prices are applied from the effective date; refresh catalog or POS as needed.";
}
