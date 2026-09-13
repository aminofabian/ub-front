"use client";

import type { RefObject } from "react";

import { useColumnWidths } from "@/lib/use-column-widths";

import { CATALOG_COLUMN_WIDTHS_CONFIG } from "./catalog-column-widths";
import type { CatalogResizableCol } from "./catalog-column-widths";

export type CatalogResizeEdge = CatalogResizableCol;

/**
 * Spreadsheet column widths for the catalog list — thin wrapper over the
 * shared `useColumnWidths` engine with the catalog config.
 */
export function useCatalogColumnWidths(
  shellRef: RefObject<HTMLElement | null>,
) {
  return useColumnWidths(CATALOG_COLUMN_WIDTHS_CONFIG, shellRef);
}
