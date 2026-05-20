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
    <div className="min-h-screen bg-linear-to-b from-background via-background to-muted/20 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <nav
          className="flex items-center gap-2 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link href={APP_ROUTES.shop} className="transition-colors hover:text-foreground">
            Shop
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-foreground">Cart</span>
        </nav>

        <header className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your cart</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Adjust quantities here, then checkout when you&apos;re ready. Prices reflect your
              storefront branch catalog.
            </p>
          </div>
        </header>

        <div className="mt-8">
          <ShopCartView slug={slug} />
        </div>
      </div>
    </div>
  );
}
