import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
import { APP_BASE_URL } from "@/lib/config";
import {
  marketplaceProductPath,
  marketplaceSupplierPath,
} from "@/lib/marketplace-url";
import { formatMoney } from "@/lib/utils";

const BASE = APP_BASE_URL.replace(/\/+$/, "");

export function MarketplaceSupplierJsonLd({
  detail,
}: {
  detail: MarketplaceSupplierDetail;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: detail.name,
    url: `${BASE}${marketplaceSupplierPath(detail)}`,
    ...(detail.location ? { address: { "@type": "PostalAddress", addressLocality: detail.location } } : {}),
    ...(detail.contactPhone ? { telephone: detail.contactPhone } : {}),
    ...(detail.contactEmail ? { email: detail.contactEmail } : {}),
    ...(detail.description ? { description: detail.description } : {}),
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
