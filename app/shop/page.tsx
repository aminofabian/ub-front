import { notFound } from "next/navigation";

import { StorefrontCatalogHome } from "@/components/storefront/storefront-catalog-home";
import { redirectLegacyShopCategoryQuery } from "@/lib/shop-legacy-category-redirect";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

type PageProps = {
  searchParams: Promise<{ q?: string; categoryId?: string; typeId?: string; departmentId?: string }>;
};

export default async function ShopPage({ searchParams }: PageProps) {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }

  const sp = await searchParams;
  const legacy = sp.categoryId?.trim();
  if (legacy) {
    await redirectLegacyShopCategoryQuery({
      storefrontSlug: slug,
      categoryId: legacy,
      q: sp.q?.trim(),
    });
  }

  return (
    <StorefrontCatalogHome
      q={sp.q?.trim() || undefined}
      categoryId={legacy || undefined}
      typeId={
        sp.typeId?.trim() || sp.departmentId?.trim() || undefined
      }
    />
  );
}
