import {
  buildTenantFaviconSvg,
  PLATFORM_FAVICON_SVG,
} from "@/lib/tenant-favicon-mark";
import { resolveTenantContext } from "@/lib/storefront-slug";

export const size = { width: 32, height: 32 };
export const contentType = "image/svg+xml";

export default async function Icon() {
  const tenant = await resolveTenantContext();

  if (!tenant) {
    return new Response(PLATFORM_FAVICON_SVG, {
      headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
    });
  }

  const uploaded = tenant.branding.faviconUrl?.trim();
  if (uploaded) {
    try {
      const res = await fetch(uploaded, { next: { revalidate: 3600 } });
      if (res.ok) {
        const bytes = await res.arrayBuffer();
        const type = res.headers.get("content-type") ?? "image/png";
        return new Response(bytes, { headers: { "Content-Type": type } });
      }
    } catch {
      /* fall through to generated mark */
    }
  }

  const displayName =
    tenant.branding.displayName?.trim() ||
    tenant.tenantName.trim() ||
    tenant.slug;

  return new Response(
    buildTenantFaviconSvg({
      displayName,
      primaryColor: tenant.branding.primaryColor,
    }),
    { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } },
  );
}
