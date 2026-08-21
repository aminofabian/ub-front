import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DesktopDownloadPage } from "@/components/download/desktop-download-page";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export const metadata: Metadata = {
  title: "Download Kiosk — desktop POS and mobile apps",
  description:
    "Install Kiosk on your till PC for fully offline selling, or get the mobile apps for Android and iPhone to run your shop from anywhere.",
};

export default async function DownloadPage() {
  // Platform host only — tenant storefronts should not expose the download page.
  const slug = await resolveStorefrontSlug();
  if (slug) {
    redirect("/");
  }

  return <DesktopDownloadPage />;
}
