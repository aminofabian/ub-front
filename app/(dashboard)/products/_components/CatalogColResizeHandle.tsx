"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

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
  edge,
  label,
  onResizeStart,
  onReset,
  className,
}: CatalogColResizeHandleProps) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      title={`${label} — drag to resize${onReset ? ", double-click to reset" : ""}`}
      tabIndex={0}
      className={cn(catalogColResizeHandleClass, className)}
      onPointerDown={(event) => onResizeStart(edge, event)}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onReset?.();
      }}
      onKeyDown={(event) => {
        if (!onReset) return;
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          onReset();
        }
      }}
    />
  );
}
