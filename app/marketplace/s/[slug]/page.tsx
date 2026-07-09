import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { APP_BASE_URL } from "@/lib/config";
import { tryFetchMarketplaceSupplierBySlug } from "@/lib/marketplace-api";
import {
  marketplaceSupplierDescription,
  marketplaceSupplierPath,
  marketplaceSupplierSlugIsCanonical,
} from "@/lib/marketplace-url";

import { MarketplaceOrderWorkspace } from "../../_components/marketplace-order-panel";
import {
  MarketplaceSeoSummary,
  MarketplaceSupplierJsonLd,
} from "../../_components/marketplace-json-ld";
import { MarketplacePageFrame } from "../../_components/marketplace-page-frame";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = await tryFetchMarketplaceSupplierBySlug(slug);
  const base = APP_BASE_URL.replace(/\/+$/, "");

  if (!detail) {
    return {
      title: "Supplier not found · Marketplace · Kiosk",
      robots: { index: false, follow: false },
    };
  }

  const canonical = `${base}${marketplaceSupplierPath(detail)}`;
  const title = `${detail.name} · Marketplace · Kiosk`;
  const description = marketplaceSupplierDescription(detail);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${detail.name} · Kiosk Marketplace`,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${detail.name} · Kiosk Marketplace`,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function MarketplaceSupplierSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const detail = await tryFetchMarketplaceSupplierBySlug(slug);
  if (!detail) notFound();

  if (!marketplaceSupplierSlugIsCanonical(slug, detail)) {
    permanentRedirect(marketplaceSupplierPath(detail));
  }

  const description = marketplaceSupplierDescription(detail);

  return (
    <>
      <MarketplaceSupplierJsonLd detail={detail} />
      <MarketplacePageFrame>
        <MarketplaceSeoSummary title={detail.name} description={description} />
        <MarketplaceOrderWorkspace detail={detail} />
      </MarketplacePageFrame>
    </>
  );
}
