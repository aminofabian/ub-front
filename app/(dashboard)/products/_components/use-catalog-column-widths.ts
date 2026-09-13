"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useMediaXl } from "@/hooks/use-media-xl";

import {
  CATALOG_COL_WIDTH_DEFAULTS,
  buildCatalogGridTemplateColumns,
  clampCatalogColWidth,
  readCatalogColumnWidths,
  writeCatalogColumnWidths,
  type CatalogColumnWidths,
  type CatalogResizableCol,
} from "./catalog-column-widths";

export type CatalogResizeEdge = CatalogResizableCol | "product";

/**
 * Spreadsheet column widths for the catalog list.
 * Product stays `1fr` (fills leftover); dragging its right edge shrinks/grows Qty.
 * Every row shares the same `gridTemplateColumns` so the whole sheet moves together.
 */
export function useCatalogColumnWidths() {
  const isXl = useMediaXl();
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
    (edge: CatalogResizeEdge, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const start = { ...widthsRef.current };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
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

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        writeCatalogColumnWidths(widthsRef.current);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [],
  );

  const gridTemplateColumns = useMemo(
    () =>
      buildCatalogGridTemplateColumns(widths, { showCategory: isXl }),
    [widths, isXl],
  );

  const gridStyle = useMemo(
    (): CSSProperties => ({ gridTemplateColumns }),
    [gridTemplateColumns],
  );

  return {
    widths,
    gridStyle,
    gridTemplateColumns,
    beginResize,
    resetColumn,
  };
}
