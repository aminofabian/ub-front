"use client";

import { useEffect } from "react";

import { useOptionalTenant } from "@/components/providers/tenant-provider";
import { setDocumentFavicon } from "@/lib/document-favicon";
import { resolveTenantFaviconHref } from "@/lib/tenant-favicon-path";

/**
 * Keeps the browser tab icon in sync with tenant branding on client navigations
 * (Next.js file-based icon metadata alone can lag behind host-mapped tenants).
 */
export function TenantFaviconSync() {
  const tenant = useOptionalTenant();

  useEffect(() => {
    if (!tenant) {
      return;
    }
    setDocumentFavicon(
      resolveTenantFaviconHref({
        slug: tenant.slug,
        branding: tenant.branding,
        resolvedAt: tenant.resolvedAt,
      }),
    );
  }, [tenant]);

  return null;
}
