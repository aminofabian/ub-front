/**
 * Supplier-portal catalogue PDF — same forest / pictured sheet as
 * https://kiosk.ke/s/{username} (marketplace catalogue builders).
 */
import { buildMarketplaceCataloguePdf } from "@/app/marketplace/_lib/marketplace-catalogue-pdf";
import { buildMarketplaceCatalogueSheetPdf } from "@/app/marketplace/_lib/marketplace-catalogue-sheet-pdf";
import { downloadBlob } from "@/app/marketplace/_lib/marketplace-order-pdf";
import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";

export type SupplierPortalCatalogPdfProduct = {
  name: string;
  barcode?: string | null;
  sku?: string | null;
  categoryName?: string | null;
  packSize?: number | null;
  packUnit?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  available?: boolean;
  imageUrl?: string | null;
};

export type SupplierPortalCatalogPdfInput = {
  supplierName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  username?: string | null;
  location?: string | null;
  products: SupplierPortalCatalogPdfProduct[];
  generatedAt?: Date;
};

function toDetail(input: SupplierPortalCatalogPdfInput): MarketplaceSupplierDetail {
  const phone = input.contactPhone?.trim() || null;
  const products: MarketplaceCatalogProductPreview[] = input.products.map((p, i) => ({
    id: `portal-${i}-${p.sku || p.barcode || p.name}`,
    name: p.name,
    slug: null,
    barcode: p.barcode ?? null,
    sku: p.sku ?? null,
    categoryName: p.categoryName ?? null,
    imageUrl: p.imageUrl ?? null,
    packSize: p.packSize ?? null,
    packUnit: p.packUnit ?? null,
    minOrderQty: null,
    unitPrice: p.unitPrice ?? null,
    currency: p.currency ?? "KES",
    available: p.available !== false,
  }));

  return {
    id: "portal-catalog-pdf",
    name: input.supplierName,
    slug: input.username ?? null,
    description: null,
    supplierType: null,
    listedBy: null,
    location: input.location ?? null,
    locations: [],
    status: "ACTIVE",
    contactEmail: input.contactEmail ?? null,
    contactPhone: phone,
    contacts: phone
      ? [
          {
            name: input.supplierName,
            roleLabel: "Supplier",
            phone,
            email: input.contactEmail ?? null,
            primaryContact: true,
          },
        ]
      : [],
    paymentMethodPreferred: null,
    paymentDetails: null,
    payoutType: null,
    payoutPhone: null,
    creditTermsDays: null,
    deliveryRegions: [],
    categoryTags: [],
    products,
  };
}

export async function buildSupplierPortalCatalogPdf(
  input: SupplierPortalCatalogPdfInput,
  kind: "list" | "sheet" = "list",
): Promise<Blob> {
  const detail = toDetail(input);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://kiosk.ke";
  if (kind === "sheet") {
    return buildMarketplaceCatalogueSheetPdf({ detail, origin, includePrices: true });
  }
  return buildMarketplaceCataloguePdf({ detail, origin, includePrices: true });
}

export { downloadBlob };

export async function downloadSupplierPortalCatalogPdf(
  input: SupplierPortalCatalogPdfInput,
  filename?: string,
  kind: "list" | "sheet" = "sheet",
) {
  const blob = await buildSupplierPortalCatalogPdf(input, kind);
  const safe = (input.supplierName || "catalogue")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  downloadBlob(blob, filename ?? `${safe || "catalogue"}-lookbook.pdf`);
}
