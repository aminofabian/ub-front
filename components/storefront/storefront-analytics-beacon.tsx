"use client";

import { useEffect } from "react";

/**
 * Emits a lightweight page-view signal with template ids for analytics hooks.
 * No third-party SDK required — dispatches a CustomEvent and sets dataLayer when present.
 */
export function StorefrontAnalyticsBeacon({
  storeThemeId,
  landingTemplateId,
  surface,
  slug,
}: {
  storeThemeId?: string | null;
  landingTemplateId?: string | null;
  surface: "store" | "landing";
  slug?: string | null;
}) {
  useEffect(() => {
    const detail = {
      event: "storefront_template_view",
      surface,
      storeThemeId: storeThemeId ?? null,
      landingTemplateId: landingTemplateId ?? null,
      slug: slug ?? null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
    };
    window.dispatchEvent(
      new CustomEvent("kiosk:storefront-template-view", { detail }),
    );
    const w = window as Window & { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(detail);
  }, [storeThemeId, landingTemplateId, surface, slug]);

  return null;
}
