"use client";

import type { RefObject } from "react";

import { useColumnWidths } from "@/lib/use-column-widths";

import { STOCK_COLUMN_WIDTHS_CONFIG } from "./stock-column-widths";

/**
 * Spreadsheet column widths for the stock levels table — thin wrapper over
 * the shared `useColumnWidths` engine with the stock config.
 */
export function useStockColumnWidths(
  shellRef: RefObject<HTMLElement | null>,
) {
  return useColumnWidths(STOCK_COLUMN_WIDTHS_CONFIG, shellRef);
}
