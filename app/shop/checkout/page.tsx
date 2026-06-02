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
  const storefront = slug ? await fetchPublicStorefront(slug) : null;
  const storeLabel =
    storefront?.label?.trim() || storefront?.businessName || "Shop";
  const name = metaTitle || storeLabel;

  return {
    title: `Checkout · ${name}`,
    description: `Place your pickup request, then pay with M-Pesa or the store's payment details at ${storeLabel}.`,
  };
}

export default async function ShopCheckoutPage() {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ShopCheckoutForm slug={slug} />
    </div>
  );
}
