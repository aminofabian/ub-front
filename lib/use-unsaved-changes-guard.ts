"use client";

import { useEffect } from "react";

/**
 * Warn before leaving with unsaved edits — covers browser close/refresh
 * (`beforeunload`) and in-app anchor navigation (capture-phase click).
 * Use the `UnsavedChangesGuard` component so hook order stays safe.
 */
export function useUnsavedChangesGuard(
  active: boolean,
  message = "You have unsaved changes. Leave this page and lose them?",
) {
  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const onClickCapture = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.getAttribute("target") === "_blank") return;
      let next: URL;
      try {
        next = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (next.origin !== window.location.origin) return;
      if (
        next.pathname === window.location.pathname &&
        next.search === window.location.search
      ) {
        return;
      }
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [active, message]);
}

/** Renders nothing; mounts the guard when `active`. Safe to place anywhere in JSX. */
export function UnsavedChangesGuard({
  active = true,
  message,
}: {
  active?: boolean;
  message?: string;
}) {
  useUnsavedChangesGuard(active, message);
  return null;
}
