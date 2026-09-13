"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import { useMediaXl } from "@/hooks/use-media-xl";

import {
  CATALOG_COL_WIDTH_DEFAULTS,
  applyCatalogColumnWidthsToElement,
  clampCatalogColWidth,
  readCatalogColumnWidths,
  writeCatalogColumnWidths,
  type CatalogColumnWidths,
  type CatalogResizableCol,
} from "./catalog-column-widths";

export type CatalogResizeEdge = CatalogResizableCol;

/**
 * Spreadsheet column widths — drag updates CSS vars on the shell (no React
 * re-render per frame). State + localStorage commit once on pointer up.
 */
export function useCatalogColumnWidths(
  shellRef: RefObject<HTMLElement | null>,
) {
  const isXl = useMediaXl();
  const isXlRef = useRef(isXl);
  isXlRef.current = isXl;

  const [widths, setWidths] = useState<CatalogColumnWidths>(
    CATALOG_COL_WIDTH_DEFAULTS,
  );
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const draggingRef = useRef(false);
  const guideRef = useRef<HTMLDivElement | null>(null);

  const paint = useCallback(
    (next: CatalogColumnWidths) => {
      const el = shellRef.current;
      if (!el) return;
      applyCatalogColumnWidthsToElement(el, next, isXlRef.current);
    },
    [shellRef],
  );

  useEffect(() => {
    const stored = readCatalogColumnWidths();
    setWidths(stored);
    widthsRef.current = stored;
    paint(stored);
  }, [paint]);

  useEffect(() => {
    paint(widthsRef.current);
  }, [isXl, paint]);

  const persist = useCallback(
    (next: CatalogColumnWidths) => {
      widthsRef.current = next;
      setWidths(next);
      paint(next);
      writeCatalogColumnWidths(next);
    },
    [paint],
  );

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
      if (draggingRef.current) return;

      const shell = shellRef.current;
      if (!shell) return;

      event.preventDefault();
      event.stopPropagation();

      const handle = event.currentTarget;
      const cell = handle.parentElement;

      // Excel anchors the guide to the column boundary, not the pointer —
      // the grab point inside the hit area must not offset the line.
      const shellRect = shell.getBoundingClientRect();
      const startBoundary = cell
        ? cell.getBoundingClientRect().right - shellRect.left
        : event.clientX - shellRect.left;

      // Sheet's horizontal scroller, so the guide stays on the boundary if
      // the sheet is scrolled mid-drag.
      let scroller: HTMLElement | null = handle;
      while (scroller && scroller.parentElement !== shell) {
        scroller = scroller.parentElement;
      }
      const startScrollLeft = scroller?.scrollLeft ?? 0;

      const startX = event.clientX;
      const start = { ...widthsRef.current };

      let raf = 0;
      let latest = start;
      let latestGuide = startBoundary;

      const guide = guideRef.current;
      if (guide) {
        guide.style.transform = `translateX(${latestGuide}px)`;
        guide.hidden = false;
      }

      draggingRef.current = true;
      shell.dataset.resizing = "true";
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      // Keep receiving events if the pointer leaves the window mid-drag.
      try {
        handle.setPointerCapture(event.pointerId);
      } catch {
        // window listeners below still drive the drag
      }

      const flush = () => {
        raf = 0;
        widthsRef.current = latest;
        applyCatalogColumnWidthsToElement(shell, latest, isXlRef.current);
        if (guide) {
          guide.style.transform = `translateX(${latestGuide}px)`;
        }
      };

      const onMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        const next = { ...start };
        // Clamped delta — guide hard-stops at min/max, Excel-style.
        next[edge] = clampCatalogColWidth(
          edge,
          start[edge] + (moveEvent.clientX - startX),
        );
        latest = next;
        const scrollDelta = (scroller?.scrollLeft ?? 0) - startScrollLeft;
        latestGuide = startBoundary + (next[edge] - start[edge]) - scrollDelta;
        if (!raf) raf = requestAnimationFrame(flush);
      };

      const onUp = () => {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        applyCatalogColumnWidthsToElement(shell, latest, isXlRef.current);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        try {
          handle.releasePointerCapture(event.pointerId);
        } catch {
          // capture is released implicitly on pointerup/pointercancel
        }
        draggingRef.current = false;
        delete shell.dataset.resizing;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (guide) guide.hidden = true;
        setWidths(latest);
        widthsRef.current = latest;
        writeCatalogColumnWidths(latest);
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [shellRef],
  );

  return {
    widths,
    guideRef,
    beginResize,
    resetColumn,
  };
}
