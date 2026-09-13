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
  applyColumnWidthsToElement,
  clampColumnWidth,
  readColumnWidths,
  writeColumnWidths,
  type ColumnWidths,
  type ColumnWidthsConfig,
} from "./column-widths";

/**
 * Spreadsheet column widths — drag updates CSS vars on the shell (no React
 * re-render per frame). State + localStorage commit once on pointer up.
 *
 * `config` must be a module-level constant (stable identity across renders).
 */
export function useColumnWidths<K extends string>(
  config: ColumnWidthsConfig<K>,
  shellRef: RefObject<HTMLElement | null>,
) {
  const isXl = useMediaXl();
  const isXlRef = useRef(isXl);
  isXlRef.current = isXl;

  const [widths, setWidths] = useState<ColumnWidths<K>>(config.defaults);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const draggingRef = useRef(false);
  const guideRef = useRef<HTMLDivElement | null>(null);

  const paint = useCallback(
    (next: ColumnWidths<K>) => {
      const el = shellRef.current;
      if (!el) return;
      applyColumnWidthsToElement(el, config, next, isXlRef.current);
    },
    [config, shellRef],
  );

  useEffect(() => {
    const stored = readColumnWidths(config);
    setWidths(stored);
    widthsRef.current = stored;
    paint(stored);
  }, [config, paint]);

  useEffect(() => {
    paint(widthsRef.current);
  }, [isXl, paint]);

  const persist = useCallback(
    (next: ColumnWidths<K>) => {
      widthsRef.current = next;
      setWidths(next);
      paint(next);
      writeColumnWidths(config, next);
    },
    [config, paint],
  );

  const resetColumn = useCallback(
    (col: K) => {
      persist({
        ...widthsRef.current,
        [col]: config.defaults[col],
      });
    },
    [config, persist],
  );

  const beginResize = useCallback(
    (edge: K, event: ReactPointerEvent<HTMLElement>) => {
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
        applyColumnWidthsToElement(shell, config, latest, isXlRef.current);
        if (guide) {
          guide.style.transform = `translateX(${latestGuide}px)`;
        }
      };

      const onMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        const next = { ...start };
        // Clamped delta — guide hard-stops at min/max, Excel-style.
        next[edge] = clampColumnWidth(
          config,
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
        applyColumnWidthsToElement(shell, config, latest, isXlRef.current);
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
        writeColumnWidths(config, latest);
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [config, shellRef],
  );

  return {
    widths,
    guideRef,
    beginResize,
    resetColumn,
  };
}
