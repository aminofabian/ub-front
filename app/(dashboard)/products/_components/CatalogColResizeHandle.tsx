"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

import { ColumnResizeHandle } from "@/lib/column-resize-handle";
import { cn } from "@/lib/utils";

import { catalogColResizeHandleClass } from "./catalog-list-styles";
import type { CatalogResizeEdge } from "./use-catalog-column-widths";

type CatalogColResizeHandleProps = {
  edge: CatalogResizeEdge;
  label: string;
  onResizeStart: (
    edge: CatalogResizeEdge,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onReset?: () => void;
  className?: string;
};

/** Spreadsheet-style column edge — drag to resize, double-click to reset. */
export function CatalogColResizeHandle({
  className,
  ...props
}: CatalogColResizeHandleProps) {
  return (
    <ColumnResizeHandle
      {...props}
      className={cn(catalogColResizeHandleClass, className)}
    />
  );
}
