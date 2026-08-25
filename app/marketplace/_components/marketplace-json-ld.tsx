import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
import { APP_BASE_URL } from "@/lib/config";
import {
  marketplaceProductPath,
  marketplaceSupplierPath,
} from "@/lib/marketplace-url";
import { supplierPassportJsonLd } from "@/lib/supplier-passport-seo";
import { formatMoney } from "@/lib/utils";

const BASE = APP_BASE_URL.replace(/\/+$/, "");

export function MarketplaceSupplierJsonLd({
  detail,
}: {
  detail: MarketplaceSupplierDetail;
}) {
  const passport = supplierPassportJsonLd({
    username: detail.slug?.split("--")[0] || detail.name,
    displayName: detail.name,
    detail,
  });
  const data = {
    ...passport,
    url: `${BASE}${marketplaceSupplierPath(detail)}`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function MarketplaceProductJsonLd({
  detail,
  product,
}: {
  detail: MarketplaceSupplierDetail;
  product: MarketplaceCatalogProductPreview;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: `${BASE}${marketplaceProductPath(detail, product)}`,
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.barcode ? { gtin13: product.barcode } : {}),
    ...(product.categoryName ? { category: product.categoryName } : {}),
    brand: {
      "@type": "Organization",
      name: detail.name,
    },
    ...(product.unitPrice != null
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: product.currency ?? "KES",
            price: product.unitPrice,
            availability: product.available
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            seller: {
              "@type": "Organization",
              name: detail.name,
            },
          },
        }
      : {}),
    description:
      product.categoryName
        ? `${product.name} — ${product.categoryName} from ${detail.name}.`
        : `${product.name} from ${detail.name}.`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Visible only to crawlers that skip JSON-LD; keeps a text fallback in the document. */
export function MarketplaceSeoSummary({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="sr-only">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

/** Breadcrumb trail: Kiosk.ke → Wholesale Suppliers → this supplier. */
export function SupplierBreadcrumbJsonLd({
  supplierName,
  url,
}: {
  supplierName: string;
  url: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Kiosk.ke", item: BASE },
      {
        "@type": "ListItem",
        position: 2,
        name: "Wholesale Suppliers",
        item: `${BASE}/marketplace`,
      },
      { "@type": "ListItem", position: 3, name: supplierName, item: url },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function marketplaceProductTitle(
  detail: MarketplaceSupplierDetail,
  product: MarketplaceCatalogProductPreview,
): string {
  const price =
    product.unitPrice != null
      ? formatMoney(product.unitPrice, product.currency ?? "KES")
      : null;
  return price ? `${product.name} — ${price}` : product.name;
}
