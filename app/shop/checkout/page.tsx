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
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link
          href={APP_ROUTES.shopCart}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to cart
        </Link>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Place your pickup request. Payment on the web is coming next — staff may confirm via phone or WhatsApp.
        </p>

        <div className="mt-8">
          <ShopCheckoutForm slug={slug} />
        </div>
      </div>
    </div>
  );
}
