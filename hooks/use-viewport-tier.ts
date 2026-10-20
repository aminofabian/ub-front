"use client";

import { useEffect, useState } from "react";

/**
 * Which shell layout is on screen, matching the shell's Tailwind breakpoints:
 * phone = below `sm` (640), tablet = `sm`–`xl`, wide = `xl`–`2xl` (1280–1535),
 * desktop = `2xl` (1536) and up.
 *
 * `wide` exists because the business hub swaps its layout at `xl` while the
 * app chrome swaps at `2xl`.
 */
export type ViewportTier = "phone" | "tablet" | "wide" | "desktop";

const DESKTOP_QUERY = "(min-width: 1536px)";
const WIDE_QUERY = "(min-width: 1280px)";
const TABLET_QUERY = "(min-width: 640px)";

function readTier(): ViewportTier {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia(DESKTOP_QUERY).matches) return "desktop";
  if (window.matchMedia(WIDE_QUERY).matches) return "wide";
  if (window.matchMedia(TABLET_QUERY).matches) return "tablet";
  return "phone";
}

/**
 * The viewport tier, or `null` until it has been measured.
 *
 * The shell mounts every responsive layout and hides the inactive ones with
 * CSS. Callers that render one instance per layout (a header bell, a hub quick
 * action board) use `null` to keep their server markup intact for the first
 * render, then drop the layouts that can never be seen — no hydration mismatch,
 * and no flash in the visible layer.
 */
export function useViewportTier(): ViewportTier | null {
  const [tier, setTier] = useState<ViewportTier | null>(null);

  useEffect(() => {
    const queries = [
      window.matchMedia(DESKTOP_QUERY),
      window.matchMedia(WIDE_QUERY),
      window.matchMedia(TABLET_QUERY),
    ];
    const update = () => setTier(readTier());
    update();
    for (const query of queries) {
      query.addEventListener("change", update);
    }
    return () => {
      for (const query of queries) {
        query.removeEventListener("change", update);
      }
    };
  }, []);

  return tier;
}
