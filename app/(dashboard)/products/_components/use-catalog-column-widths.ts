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
      event.preventDefault();
      event.stopPropagation();

      const shell = shellRef.current;
      if (!shell) return;

      const startX = event.clientX;
      const start = { ...widthsRef.current };
      const shellLeft = shell.getBoundingClientRect().left;

      let raf = 0;
      let latest = start;
      let latestGuide = event.clientX - shellLeft;

      const guide = guideRef.current;
      if (guide) {
        guide.hidden = false;
        guide.style.transform = `translateX(${latestGuide}px)`;
      }

      shell.dataset.resizing = "true";
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

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
        const delta = moveEvent.clientX - startX;
        const next = { ...start };
        next[edge] = clampCatalogColWidth(edge, start[edge] + delta);
        latest = next;
        latestGuide = moveEvent.clientX - shellLeft;
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
