import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ShopCartView from "@/components/storefront/shop-cart-view";
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
    return { title: `Cart · ${metaTitle}` };
  }
  if (!slug) {
    return { title: "Cart · Shop" };
  }
  const storefront = await fetchPublicStorefront(slug);
  const label = storefront?.label?.trim() || storefront?.businessName || "Shop";
  return { title: `Cart · ${label}` };
}

export default async function ShopCartPage() {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={APP_ROUTES.shop}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to shop
        </Link>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Your cart
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Branch prices from your storefront catalog.
        </p>

        <div className="mt-8">
          <ShopCartView slug={slug} />
        </div>
      </div>
    </div>
  );
}
