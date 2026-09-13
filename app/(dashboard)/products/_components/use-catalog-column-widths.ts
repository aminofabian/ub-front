"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  CATALOG_COL_WIDTH_DEFAULTS,
  catalogColumnWidthVars,
  clampCatalogColWidth,
  readCatalogColumnWidths,
  writeCatalogColumnWidths,
  type CatalogColumnWidths,
  type CatalogResizableCol,
} from "./catalog-column-widths";

type ResizeEdge = CatalogResizableCol | "product";

/**
 * Spreadsheet column widths for the catalog list.
 * Product stays `1fr` (fills leftover); dragging its right edge shrinks/grows Qty.
 */
export function useCatalogColumnWidths() {
  const [widths, setWidths] = useState<CatalogColumnWidths>(
    CATALOG_COL_WIDTH_DEFAULTS,
  );
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  useEffect(() => {
    setWidths(readCatalogColumnWidths());
  }, []);

  const persist = useCallback((next: CatalogColumnWidths) => {
    setWidths(next);
    writeCatalogColumnWidths(next);
  }, []);

  const resetColumn = useCallback(
    (col: CatalogResizableCol) => {
      persist({
        ...widthsRef.current,
        [col]: CATALOG_COL_WIDTH_DEFAULTS[col],
      });
    },
    [persist],
  );

  const beginResize = useCallback(
    (edge: ResizeEdge, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const start = { ...widthsRef.current };
      const target = event.currentTarget;
      const pointerId = event.pointerId;
      target.setPointerCapture(pointerId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        const next = { ...start };

        if (edge === "product") {
          // Dragging Product|Qty: move Qty's left edge (product is flex).
          next.stock = clampCatalogColWidth("stock", start.stock - delta);
        } else if (edge === "check") {
          next.check = clampCatalogColWidth("check", start.check + delta);
        } else {
          next[edge] = clampCatalogColWidth(edge, start[edge] + delta);
        }

        setWidths(next);
        widthsRef.current = next;
      };

      const onUp = (upEvent: PointerEvent) => {
        target.releasePointerCapture(pointerId);
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        target.removeEventListener("pointercancel", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        writeCatalogColumnWidths(widthsRef.current);
        void upEvent;
      };

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
      target.addEventListener("pointercancel", onUp);
    },
    [],
  );

  const gridStyle = {
    ...catalogColumnWidthVars(widths),
  } as CSSProperties;

  return {
    widths,
    gridStyle,
    beginResize,
    resetColumn,
  };
}
