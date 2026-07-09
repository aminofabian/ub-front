import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { APP_BASE_URL } from "@/lib/config";
import { tryFetchMarketplaceProductBySlug } from "@/lib/marketplace-api";
import {
  findMarketplaceProduct,
  marketplaceProductDescription,
  marketplaceProductPath,
  marketplaceProductSlugIsCanonical,
  marketplaceSupplierSlugIsCanonical,
} from "@/lib/marketplace-url";

import { MarketplaceOrderWorkspace } from "../../../_components/marketplace-order-panel";
import {
  MarketplaceProductJsonLd,
  MarketplaceSeoSummary,
  marketplaceProductTitle,
} from "../../../_components/marketplace-json-ld";
import { MarketplacePageFrame } from "../../../_components/marketplace-page-frame";

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
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

  const canonical = `${base}${marketplaceProductPath(detail, product)}`;
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
      ...(product.imageUrl ? { images: [{ url: product.imageUrl, alt: product.name }] } : {}),
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

export default async function MarketplaceProductSlugPage({ params }: PageProps) {
  const { slug, productSlug } = await params;
  const detail = await tryFetchMarketplaceProductBySlug(slug, productSlug);
  if (!detail) notFound();

  const product = findMarketplaceProduct(detail, productSlug);
  if (!product) notFound();

  if (!marketplaceSupplierSlugIsCanonical(slug, detail)) {
    permanentRedirect(marketplaceProductPath(detail, product));
  }
  if (!marketplaceProductSlugIsCanonical(productSlug, product)) {
    permanentRedirect(marketplaceProductPath(detail, product));
  }

  const description = marketplaceProductDescription(detail, product);
  const heading = marketplaceProductTitle(detail, product);

  return (
    <>
      <MarketplaceProductJsonLd detail={detail} product={product} />
      <MarketplacePageFrame>
        <MarketplaceSeoSummary title={heading} description={description} />
        <MarketplaceOrderWorkspace
          detail={detail}
          selectedProductSlug={product.slug ?? productSlug}
        />
      </MarketplacePageFrame>
    </>
  );
}
