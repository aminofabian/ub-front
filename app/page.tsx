import { DesktopRootRedirect } from "@/components/desktop-root-redirect";
import { TenantConsolePage } from "@/components/tenant-console/tenant-console-page";
import { StorefrontCatalogHome } from "@/components/storefront/storefront-catalog-home";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { redirectLegacyShopCategoryQuery } from "@/lib/shop-legacy-category-redirect";
import { IS_DESKTOP } from "@/lib/runtime";
import { resolveStorefrontSlugFromHost } from "@/lib/storefront-slug";

type PageProps = {
  searchParams: Promise<{ q?: string; categoryId?: string }>;
};

export default async function HomePage({ searchParams }: PageProps) {
  // Desktop SKU is single-tenant. The root URL is the entry point the Tauri
  // shell opens, so we use it as the bootstrap router: on first run the
  // <DesktopRootRedirect> client component sends the user to /setup, otherwise
  // to /login. The cloud-only TenantConsolePage / storefront paths below are
  // dead code in the desktop bundle thanks to IS_DESKTOP tree-shaking.
  if (IS_DESKTOP) {
    return <DesktopRootRedirect />;
  }

  const hostSlug = await resolveStorefrontSlugFromHost();

  // Tenant-mapped host → render the storefront in place at `/`.
  if (hostSlug) {
    const sp = await searchParams;
    const legacy = sp.categoryId?.trim();
    if (legacy) {
      await redirectLegacyShopCategoryQuery({
        storefrontSlug: hostSlug,
        categoryId: legacy,
        q: sp.q?.trim(),
      });
    }
    return (
      <StorefrontShell>
        <StorefrontCatalogHome
          q={sp.q?.trim() || undefined}
          categoryId={legacy || undefined}
        />
      </StorefrontShell>
    );
  }

  // Platform/admin host (no tenant mapping) → tenant console landing.
  return <TenantConsolePage />;
}
