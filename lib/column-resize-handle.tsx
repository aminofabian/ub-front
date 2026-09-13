"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

type ColumnResizeHandleProps<K extends string> = {
  edge: K;
  label: string;
  onResizeStart: (edge: K, event: ReactPointerEvent<HTMLElement>) => void;
  onReset?: () => void;
  className?: string;
};

/**
 * Spreadsheet-style column edge — drag to resize, double-click to reset.
 * Position it at the right edge of a header cell (`relative`/sticky parent);
 * visual styling comes via `className` so each sheet owns its hover group.
 */
export function ColumnResizeHandle<K extends string>({
  edge,
  label,
  onResizeStart,
  onReset,
  className,
}: ColumnResizeHandleProps<K>) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      title={`${label} — drag to resize${onReset ? ", double-click to reset" : ""}`}
      tabIndex={0}
      className={className}
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
