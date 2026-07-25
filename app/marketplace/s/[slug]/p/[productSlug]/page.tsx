import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { APP_BASE_URL } from "@/lib/config";
import { tryFetchMarketplaceProductBySlug } from "@/lib/marketplace-api";
import {
  findMarketplaceProduct,
  marketplaceProductDescription,
  marketplaceSupplierPath,
  marketplaceProductSlugIsCanonical,
  marketplaceSupplierSlugIsCanonical,
} from "@/lib/marketplace-url";

import { marketplaceProductTitle } from "../../../../_components/marketplace-json-ld";

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const detail = await tryFetchMarketplaceProductBySlug(slug, productSlug);
  const base = APP_BASE_URL.replace(/\/+$/, "");

  if (!detail) {
    return {
      title: "Product not found · Marketplace · Kiosk",
      robots: { index: false, follow: false },
    };
  }

  const product = findMarketplaceProduct(detail, productSlug);
  if (!product) {
    return {
      title: "Product not found · Marketplace · Kiosk",
      robots: { index: false, follow: false },
    };
  }

  const canonical = `${base}${marketplaceSupplierPath(detail, product.slug)}`;
  const heading = marketplaceProductTitle(detail, product);
  const title = `${heading} · ${detail.name} · Kiosk`;
  const description = marketplaceProductDescription(detail, product);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${product.name} · ${detail.name}`,
      description,
      url: canonical,
      type: "website",
      ...(product.imageUrl
        ? { images: [{ url: product.imageUrl, alt: product.name }] }
        : {}),
    },
    twitter: {
      card: product.imageUrl ? "summary_large_image" : "summary",
      title: `${product.name} · ${detail.name}`,
      description,
      ...(product.imageUrl ? { images: [product.imageUrl] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

/**
 * Legacy `/marketplace/s/:supplier/p/:product` URLs permanently redirect to the
 * supplier passport with `?p=` so the shelf opens with that product selected.
 */
export default async function MarketplaceProductSlugPage({ params }: PageProps) {
  const { slug, productSlug } = await params;
  const detail = await tryFetchMarketplaceProductBySlug(slug, productSlug);
  if (!detail) notFound();

  const product = findMarketplaceProduct(detail, productSlug);
  if (!product) notFound();

  if (
    !marketplaceSupplierSlugIsCanonical(slug, detail) ||
    !marketplaceProductSlugIsCanonical(productSlug, product)
  ) {
    permanentRedirect(marketplaceSupplierPath(detail, product.slug));
  }

  permanentRedirect(marketplaceSupplierPath(detail, product.slug));
}
