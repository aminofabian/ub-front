"use client";

import type { RefObject } from "react";

import { useColumnWidths } from "@/lib/use-column-widths";

import { TX_COLUMN_WIDTHS_CONFIG } from "./transactions-column-widths";

/**
 * Spreadsheet column widths for the transactions list — thin wrapper over
 * the shared `useColumnWidths` engine with the transactions config.
 */
export function useTxColumnWidths(shellRef: RefObject<HTMLElement | null>) {
  return useColumnWidths(TX_COLUMN_WIDTHS_CONFIG, shellRef);
}
