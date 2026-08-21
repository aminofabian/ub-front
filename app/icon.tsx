import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { buildTenantFaviconSvg } from "@/lib/tenant-favicon-mark";
import { resolveTenantContext } from "@/lib/storefront-slug";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

async function platformFaviconResponse(): Promise<Response> {
  const bytes = await readFile(join(process.cwd(), "public/app-icon.png"));
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

export default async function Icon() {
  const tenant = await resolveTenantContext();

  if (!tenant) {
    return platformFaviconResponse();
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
