import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ShopCheckoutForm from "@/components/storefront/shop-checkout-form";
import { APP_ROUTES } from "@/lib/config";
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-linear-to-b from-background via-background to-muted/30 px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-7xl flex-1 flex-col overflow-hidden">
        <nav
          className="mb-2 flex shrink-0 items-center gap-2 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link
            href={APP_ROUTES.shop}
            className="transition-colors hover:text-foreground"
          >
            Shop
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={APP_ROUTES.shopCart}
            className="transition-colors hover:text-foreground"
          >
            Cart
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-foreground">Checkout</span>
        </nav>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ShopCheckoutForm slug={slug} />
        </div>
      </div>
    </div>
  );
}
