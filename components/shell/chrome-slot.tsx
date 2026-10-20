"use client";

import type { ReactNode } from "react";

import { useViewportTier, type ViewportTier } from "@/hooks/use-viewport-tier";

/**
 * Renders its children only in the layout slot(s) that can be seen at the
 * current viewport.
 *
 * The shell and the business hub mount every responsive layout — desktop
 * sidebar header, tablet fascia, phone bar; the hub's phone column and its `xl`
 * rail — and hide the inactive ones with CSS. Components that fetch, subscribe
 * to realtime or render `next/link` prefetches (header chips, the notification
 * bell, quick-action boards) would then run once per layout. This drops the
 * layouts that can never be seen.
 *
 * Before the viewport is measured (server render and the first client render)
 * every slot keeps its child, so the server markup hydrates without a mismatch
 * and the visible slot never flashes.
 */
export function ChromeSlot({
  slot,
  children,
}: {
  slot: ViewportTier | ViewportTier[];
  children: ReactNode;
}) {
  const tier = useViewportTier();
  if (tier === null) return <>{children}</>;
  const allowed = Array.isArray(slot) ? slot : [slot];
  if (!allowed.includes(tier)) return null;
  return <>{children}</>;
}
