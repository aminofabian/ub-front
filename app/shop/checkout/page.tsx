import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ShopCheckoutForm from "@/components/storefront/shop-checkout-form";
import { fetchPublicStorefront } from "@/lib/public-storefront";
import {
  resolveStorefrontSlug,
  resolveTenantContext,
} from "@/lib/storefront-slug";

export async function generateMetadata(): Promise<Metadata> {
  const [slug, tenant] = await Promise.all([
    resolveStorefrontSlug(),
    resolveTenantContext(),
  ]);
  const metaTitle = tenant?.branding?.metaTitle?.trim();
  if (metaTitle) {
    return { title: `Checkout · ${metaTitle}` };
  }
  if (!slug) {
    return { title: "Checkout · Shop" };
  }
  const storefront = await fetchPublicStorefront(slug);
  const label = storefront?.label?.trim() || storefront?.businessName || "Shop";
  return { title: `Checkout · ${label}` };
}

export default async function ShopCheckoutPage() {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-linear-to-b from-background via-background to-muted/30 px-3 py-2 sm:px-4 sm:py-3">
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-7xl flex-1 flex-col overflow-hidden">
        <ShopCheckoutForm slug={slug} />
      </div>
    </div>
  );
}
