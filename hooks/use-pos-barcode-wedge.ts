"use client";

import { useEffect, useRef, type RefObject } from "react";

const MAX_INTER_KEY_MS = 45;
const MIN_CODE_LEN = 4;
const BUFFER_IDLE_CLEAR_MS = 120;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

/**
 * Captures USB / Bluetooth HID barcode wedge keystrokes when focus is not in
 * another text field, so cashiers can scan without clicking the search box.
 *
 * Scanners type characters very quickly and usually finish with Enter.
 */
export function usePosBarcodeWedge(options: {
  enabled?: boolean;
  onScan: (code: string) => void;
  /** Native typing into this input is left alone. */
  searchInputRef?: RefObject<HTMLInputElement | null>;
}) {
  const { enabled = true, onScan, searchInputRef } = options;
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let buffer = "";
    let lastKeyAt = 0;
    let idleTimer: number | null = null;

    const clearIdle = () => {
      if (idleTimer != null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const resetBuffer = () => {
      buffer = "";
      lastKeyAt = 0;
      clearIdle();
    };

    const scheduleIdleClear = () => {
      clearIdle();
      idleTimer = window.setTimeout(() => {
        buffer = "";
        lastKeyAt = 0;
        idleTimer = null;
      }, BUFFER_IDLE_CLEAR_MS);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const searchEl = searchInputRef?.current ?? null;
      const target = e.target;
      if (searchEl && (target === searchEl || searchEl.contains(target as Node))) {
        return;
      }
      if (isEditableTarget(target)) return;

      const now = performance.now();

      if (e.key === "Enter") {
        if (buffer.length >= MIN_CODE_LEN) {
          e.preventDefault();
          e.stopPropagation();
          const code = buffer;
          resetBuffer();
          onScanRef.current(code);
        } else {
          resetBuffer();
        }
        return;
      }

      if (e.key === "Escape" || e.key === "Tab") {
        resetBuffer();
        return;
      }

      if (e.key === "Backspace") {
        if (buffer.length > 0) {
          e.preventDefault();
          buffer = buffer.slice(0, -1);
          lastKeyAt = now;
          scheduleIdleClear();
        }
        return;
      }

      if (e.key.length !== 1) return;

      if (buffer.length > 0 && now - lastKeyAt > MAX_INTER_KEY_MS) {
        buffer = "";
      }

      buffer += e.key;
      lastKeyAt = now;
      e.preventDefault();
      scheduleIdleClear();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      clearIdle();
    };
  }, [enabled, searchInputRef]);
}
