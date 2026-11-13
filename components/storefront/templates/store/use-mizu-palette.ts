"use client";

import { useEffect, useSyncExternalStore, type CSSProperties } from "react";

import { useOptionalTenant } from "@/components/providers/tenant-provider";
import { mizuPaletteStyle } from "@/components/storefront/templates/store/mizu-springs-palette";

/**
 * Sign-in, WhatsApp, bag and checkout render in portals, outside the themed
 * root, so they never inherit its custom properties. The storefront chrome
 * publishes the resolved theme here and those surfaces read it back.
 */
let published: CSSProperties | null = null;
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Call from the themed root with its resolved inline style. */
export function usePublishMizuTheme(style: CSSProperties | null) {
  const key = style ? JSON.stringify(style) : "";
  useEffect(() => {
    published = key ? (JSON.parse(key) as CSSProperties) : null;
    listeners.forEach((fn) => fn());
  }, [key]);
}

export function useMizuPaletteStyle(): CSSProperties {
  const tenant = useOptionalTenant();
  const live = useSyncExternalStore(
    subscribe,
    () => published,
    () => null,
  );
  return (
    live ??
    mizuPaletteStyle(
      tenant?.branding?.primaryColor,
      tenant?.branding?.accentColor,
    )
  );
}
