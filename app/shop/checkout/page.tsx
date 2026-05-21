import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ShopCheckoutForm from "@/components/storefront/shop-checkout-form";
import { CHECKOUT_PAGE_SHELL } from "@/components/storefront/shop-checkout-design";
import { cn } from "@/lib/utils";
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
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 sm:pb-3 sm:pt-3",
        CHECKOUT_PAGE_SHELL,
      )}
    >
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-7xl flex-1 flex-col overflow-hidden">
        <ShopCheckoutForm slug={slug} />
      </div>
    </div>
  );
}
