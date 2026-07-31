import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DesktopDownloadPage } from "@/components/download/desktop-download-page";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export const metadata: Metadata = {
  title: "Download Kiosk for desktop — offline POS for your shop",
  description:
    "Install Kiosk on your PC and keep selling without internet. The desktop app bundles its own database and runs entirely on the till computer.",
};

export default async function DownloadPage() {
  // Platform host only — tenant storefronts should not expose the download page.
  const slug = await resolveStorefrontSlug();
  if (slug) {
    redirect("/");
  }

  return <DesktopDownloadPage />;
}
