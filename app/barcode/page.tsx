import type { Metadata } from "next";

import { BarcodeLookup } from "@/components/storefront/barcode-lookup";
import { APP_BASE_URL } from "@/lib/config";

export function generateMetadata(): Metadata {
  const base = APP_BASE_URL.replace(/\/+$/, "");

  return {
    title: "Barcode Lookup",
    description:
      "Enter a barcode to instantly find product details, prices, and availability.",
    alternates: { canonical: `${base}/barcode` },
    openGraph: {
      title: "Barcode Lookup",
      description:
        "Enter a barcode to instantly find product details, prices, and availability.",
      url: `${base}/barcode`,
    },
  };
}

export default function BarcodePage() {
  return (
    <div className="min-h-screen bg-[#f6f6f6] py-4 sm:py-6">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <BarcodeLookup />
      </div>
    </div>
  );
}
