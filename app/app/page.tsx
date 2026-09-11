import { notFound, redirect } from "next/navigation";

import { IS_DESKTOP } from "@/lib/runtime";
import { shopperPwaPath } from "@/lib/shopper-pwa";
import { resolveTenantContext } from "@/lib/storefront-slug";

export const dynamic = "force-dynamic";

/** Shortcut on a tenant host: `/app` → that shop's install page. */
export default async function TenantAppShortcutPage() {
  if (IS_DESKTOP) notFound();
  const tenant = await resolveTenantContext();
  const slug = tenant?.slug?.trim();
  if (!slug) notFound();
  redirect(shopperPwaPath(slug));
}
