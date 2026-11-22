import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { APP_BASE_URL, slugDerivedShopUrl } from "@/lib/config";
import { marketplacePublicOrigin } from "@/lib/marketplace-host";
import { MarketplaceBasketAdder } from "@/app/marketplace/_components/marketplace-basket-adder";
import { tryFetchMarketplaceSupplierBySlug } from "@/lib/marketplace-api";
import {
  marketplaceSupplierDescription,
  marketplaceSupplierOrderPath,
  marketplaceSupplierPath,
  marketplaceSupplierSlugIsCanonical,
  parseMarketplaceOrderQuery,
} from "@/lib/marketplace-url";
import {
  marketplaceWholesaleSupplierTitle,
  supplierPassportKeywords,
  supplierPassportShortTitle,
} from "@/lib/supplier-passport-seo";

import { MarketplaceOrderWorkspace } from "../../_components/marketplace-order-panel";
import {
  MarketplaceSeoSummary,
  MarketplaceSupplierJsonLd,
  SupplierBreadcrumbJsonLd,
} from "../../_components/marketplace-json-ld";
import { MarketplacePageFrame } from "../../_components/marketplace-page-frame";
import { SupplierBuyerLinesBlock } from "../../_components/supplier-buyer-lines";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    p?: string | string[];
    o?: string | string[];
    r?: string | string[];
  }>;
};

function firstQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = await tryFetchMarketplaceSupplierBySlug(slug);
  const base = marketplacePublicOrigin(APP_BASE_URL);

  if (!detail) {
    return {
      title: "Supplier not found · Marketplace · Kiosk",
      robots: { index: false, follow: false },
    };
  }

  const canonical = `${base}${marketplaceSupplierPath(detail)}`;
  const title = marketplaceWholesaleSupplierTitle(detail);
  const description = marketplaceSupplierDescription(detail);
  const username = detail.slug?.split("--")[0] || detail.name;
  const ogImageUrl = `${base}/og/supplier/${encodeURIComponent(username)}`;

  return {
    title: {
      absolute: supplierPassportShortTitle({
        username,
        displayName: detail.name,
        detail,
      }),
    },
    description,
    keywords: supplierPassportKeywords({
      username,
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
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
  };
}

export default async function MarketplaceSupplierSlugPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const selectedProductSlug = firstQueryValue(query.p);
  const orderQuery = firstQueryValue(query.o);
  const roundOrderTo10 = firstQueryValue(query.r) === "10";
  const detail = await tryFetchMarketplaceSupplierBySlug(slug);
  if (!detail) notFound();

  if (!marketplaceSupplierSlugIsCanonical(slug, detail)) {
    permanentRedirect(
      marketplaceSupplierOrderPath(
        detail,
        parseMarketplaceOrderQuery(orderQuery),
        selectedProductSlug,
        roundOrderTo10,
      ),
    );
  }

  const description = marketplaceSupplierDescription(detail);
  const canonical = `${marketplacePublicOrigin(APP_BASE_URL)}${marketplaceSupplierPath(detail)}`;

  return (
    <>
      <MarketplaceSupplierJsonLd detail={detail} />
      <SupplierBreadcrumbJsonLd
        supplierName={detail.name}
        url={canonical}
      />
      <MarketplacePageFrame>
        <MarketplaceSeoSummary title={detail.name} description={description} />
        <div className="mx-auto w-full max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
          {detail.shopSlug ? (
            <p className="mb-3 border border-black/10 px-3 py-2 text-sm">
              {detail.name} has its own shop, with live stock and prices.{" "}
              <a
                href={slugDerivedShopUrl(detail.shopSlug)}
                className="font-medium underline underline-offset-4"
              >
                Order from the shop
              </a>
            </p>
          ) : null}
          <SupplierBuyerLinesBlock supplierId={detail.id} />
          <MarketplaceBasketAdder detail={detail} />
          <MarketplaceOrderWorkspace
            detail={detail}
            layout="shelf"
            selectedProductSlug={selectedProductSlug}
            orderQuery={orderQuery}
            roundOrderTo10={roundOrderTo10}
          />
        </div>
      </MarketplacePageFrame>
    </>
  );
}
