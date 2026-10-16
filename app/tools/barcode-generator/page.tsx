import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BarcodeGeneratorPage } from "@/components/tools/barcode-generator-page";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export const metadata: Metadata = {
  title: "Barcode generator",
  description:
    "Make a Code 128 barcode from a product code and download it as an SVG for a shelf label.",
};

export default async function Page() {
  const slug = await resolveStorefrontSlug();
  if (slug) {
    redirect("/");
  }

  return <BarcodeGeneratorPage />;
}
