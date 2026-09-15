"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Shared gesture + chrome for phone sheets (bottom drawers).
 *
 * Every cashier drawer on a phone is a bottom sheet, so they should all behave
 * like the platform ones: grab the handle, drag down, and the sheet follows your
 * finger; let go past a third of its height (or flick) and it closes. The drag
 * writes `transform` onto the sheet element, so the exit animation starts from
 * wherever the finger left it instead of snapping back first.
 */

/** Fraction of the sheet height that commits a dismiss on release. */
const DISMISS_FRACTION = 0.3;
/** Downward flick speed (px/ms) that commits a dismiss regardless of distance. */
const DISMISS_VELOCITY = 0.5;
/** Minimum travel before a flick counts — stops accidental taps from closing. */
const FLICK_MIN_TRAVEL = 24;
/** Rubber-band resistance when the guest drags the sheet upward. */
const UPWARD_RESISTANCE = 0.32;
/** Snap-back duration; matches the sheet open/close easing. */
const SNAP_BACK_MS = 240;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type SheetDragHandlers = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
};

export function useSheetDragDismiss({
  enabled,
  onDismiss,
}: {
  /** Off for edge/center panels — only bottom sheets can be dragged away. */
  enabled: boolean;
  onDismiss: () => void;
}): {
  /** Attach to the sheet element (the node the open/close animation targets). */
  panelRef: RefObject<HTMLDivElement | null>;
  grabberProps: SheetDragHandlers;
  dragging: boolean;
} {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef({
    active: false,
    startY: 0,
    dy: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0,
    height: 1,
  });

  const clearDragStyles = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.transition = "";
    panel.style.transform = "";
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (!event.isPrimary) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const panel = panelRef.current;
      if (!panel) return;
      const next = gesture.current;
      next.active = true;
      next.startY = event.clientY;
      next.lastY = event.clientY;
      next.lastT = event.timeStamp;
      next.dy = 0;
      next.velocity = 0;
      next.height = Math.max(1, panel.getBoundingClientRect().height);
      // Drop any snap-back still running from the previous gesture.
      clearDragStyles();
      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [clearDragStyles, enabled],
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const next = gesture.current;
    if (!next.active) return;
    const travel = event.clientY - next.startY;
    const elapsed = Math.max(1, event.timeStamp - next.lastT);
    next.velocity = (event.clientY - next.lastY) / elapsed;
    next.lastY = event.clientY;
    next.lastT = event.timeStamp;
    next.dy = travel > 0 ? travel : travel * UPWARD_RESISTANCE;
    const panel = panelRef.current;
    if (panel) panel.style.transform = `translate3d(0, ${next.dy}px, 0)`;
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const next = gesture.current;
      if (!next.active) return;
      next.active = false;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const panel = panelRef.current;
      if (!panel) return;
      const dismissed =
        next.dy > next.height * DISMISS_FRACTION ||
        (next.velocity > DISMISS_VELOCITY && next.dy > FLICK_MIN_TRAVEL);
      if (dismissed) {
        // Leave the drag offset in place so the close animation continues from
        // the finger instead of jumping back to the top first.
        panel.style.transition = "";
        onDismiss();
        return;
      }
      if (prefersReducedMotion()) {
        clearDragStyles();
        return;
      }
      panel.style.transition = `transform ${SNAP_BACK_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      panel.style.transform = "translate3d(0, 0, 0)";
      window.setTimeout(clearDragStyles, SNAP_BACK_MS + 20);
    },
    [clearDragStyles, onDismiss],
  );

  /**
   * A cancelled gesture (OS took over, pointer lost) is never a dismissal —
   * snap the sheet back so the guest can try again.
   */
  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      gesture.current.active = false;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      clearDragStyles();
    },
    [clearDragStyles],
  );

  const grabberProps = useMemo<SheetDragHandlers>(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel],
  );

  return { panelRef, grabberProps, dragging };
}

/**
 * The handle at the top of a phone sheet. Its hit area spans the sheet width so
 * a swipe anywhere along the top edge starts the drag, while the visible pill
 * stays small.
 */
export function SheetGrabber({
  dragging = false,
  className,
  ...handlers
}: SheetDragHandlers & {
  dragging?: boolean;
  className?: string;
}) {
  return (
    <div
      {...handlers}
      aria-hidden
      className={cn(
        "flex h-6 shrink-0 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-12 rounded-full transition-colors duration-150",
          "bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] dark:bg-white/20",
          dragging &&
            "bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_38%,transparent)] dark:bg-white/35",
        )}
      />
    </div>
  );
}
