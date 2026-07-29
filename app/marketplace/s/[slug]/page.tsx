import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { APP_BASE_URL } from "@/lib/config";
import { tryFetchMarketplaceSupplierBySlug } from "@/lib/marketplace-api";
import {
  marketplaceSupplierDescription,
  marketplaceSupplierPath,
  marketplaceSupplierSlugIsCanonical,
} from "@/lib/marketplace-url";
import {
  marketplaceWholesaleSupplierTitle,
  supplierPassportKeywords,
} from "@/lib/supplier-passport-seo";

import { MarketplaceOrderWorkspace } from "../../_components/marketplace-order-panel";
import {
  MarketplaceSeoSummary,
  MarketplaceSupplierJsonLd,
} from "../../_components/marketplace-json-ld";
import { MarketplacePageFrame } from "../../_components/marketplace-page-frame";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ p?: string | string[] }>;
};

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
  const title = marketplaceWholesaleSupplierTitle(detail);
  const description = marketplaceSupplierDescription(detail);

  return {
    title,
    description,
    keywords: supplierPassportKeywords({
      username: detail.slug?.split("--")[0] || detail.name,
      displayName: detail.name,
      detail,
    }),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Kiosk",
      type: "website",
      locale: "en_KE",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function MarketplaceSupplierSlugPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const selectedProductSlug = Array.isArray(query.p) ? query.p[0] : query.p;
  const detail = await tryFetchMarketplaceSupplierBySlug(slug);
  if (!detail) notFound();

  if (!marketplaceSupplierSlugIsCanonical(slug, detail)) {
    permanentRedirect(
      marketplaceSupplierPath(detail, selectedProductSlug ?? null),
    );
  }

  const description = marketplaceSupplierDescription(detail);

  return (
    <>
      <MarketplaceSupplierJsonLd detail={detail} />
      <MarketplacePageFrame>
        <MarketplaceSeoSummary title={detail.name} description={description} />
        <div className="mx-auto w-full max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
          <MarketplaceOrderWorkspace
            detail={detail}
            layout="shelf"
            selectedProductSlug={selectedProductSlug ?? null}
          />
        </div>
      </MarketplacePageFrame>
    </>
  );
}
