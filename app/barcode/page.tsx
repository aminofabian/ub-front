import type { Metadata } from "next";

import { BarcodeLookup } from "@/components/storefront/barcode-lookup";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { APP_BASE_URL } from "@/lib/config";
import { resolveTenantContext } from "@/lib/storefront-slug";

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export async function generateMetadata(): Promise<Metadata> {
  const base = APP_BASE_URL.replace(/\/+$/, "");
  const tenant = await resolveTenantContext();
  const metaTitle = tenant?.branding?.metaTitle?.trim();
  const title = metaTitle ? `${metaTitle} · Barcode lookup` : "Barcode lookup";

  return {
    title,
    description:
      "Enter or scan a barcode to instantly find product details, prices, and availability.",
    alternates: { canonical: `${base}/barcode` },
    openGraph: {
      title,
      description:
        "Enter or scan a barcode to instantly find product details, prices, and availability.",
      url: `${base}/barcode`,
    },
  };
}

export default async function BarcodePage() {
  const tenant = await resolveTenantContext();
  const primaryRaw = tenant?.branding?.primaryColor?.trim() ?? "";
  const accentRaw = tenant?.branding?.accentColor?.trim() ?? "";
  const primaryHex = isHexColor(primaryRaw) ? primaryRaw : null;
  const accentHex = isHexColor(accentRaw) ? accentRaw : null;

  return (
    <StorefrontShell>
      <div className="bg-[oklch(0.985_0.002_90)] dark:bg-background">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <BarcodeLookup
            variant="page"
            primaryHex={primaryHex}
            accentHex={accentHex}
          />
        </div>
      </div>
    </StorefrontShell>
  );
}
