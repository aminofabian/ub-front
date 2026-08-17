import "server-only";

import { headers } from "next/headers";

import {
  parseStorefrontPreview,
  STOREFRONT_PREVIEW_LANDING_HEADER,
  STOREFRONT_PREVIEW_THEME_HEADER,
  type StorefrontPreview,
} from "@/lib/storefront-preview";

/**
 * Reads merchant theme/landing preview overrides forwarded by middleware.
 * Desktop SKU never calls {@link headers}.
 */
export async function readStorefrontPreviewFromHeaders(): Promise<StorefrontPreview> {
  if (process.env.NEXT_PUBLIC_RUNTIME === "desktop") {
    return { themeId: null, landingId: null };
  }
  const h = await headers();
  return parseStorefrontPreview(
    h.get(STOREFRONT_PREVIEW_THEME_HEADER),
    h.get(STOREFRONT_PREVIEW_LANDING_HEADER),
  );
}
