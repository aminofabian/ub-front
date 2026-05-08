import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ShopCheckoutForm from "@/components/storefront/shop-checkout-form";
import { APP_ROUTES } from "@/lib/config";
import { fetchPublicStorefront } from "@/lib/public-storefront";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export async function generateMetadata(): Promise<Metadata> {
  const slug = await resolveStorefrontSlug();
  const storefront = slug ? await fetchPublicStorefront(slug) : null;
  const label = storefront?.label?.trim() || storefront?.businessName || "Shop";
  return { title: `Checkout · ${label}` };
}

export default async function ShopCheckoutPage() {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-background to-muted/30 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <nav
          className="flex items-center gap-2 text-sm text-muted-foreground"
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

        <div className="mt-6">
          <ShopCheckoutForm slug={slug} />
        </div>
      </div>
    </div>
  );
}
