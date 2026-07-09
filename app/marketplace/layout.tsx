import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardToaster } from "@/components/dashboard-sonner";
import { APP_BASE_URL } from "@/lib/config";

const TITLE = "Supplier Marketplace — Products & Vendors | Kiosk";
const DESCRIPTION =
  "Browse products listed by marketplace suppliers across the Kiosk platform. Search by name or barcode, preview catalogues, and connect vendors to your business.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${APP_BASE_URL.replace(/\/+$/, "")}/marketplace`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketplaceLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      {children}
      <DashboardToaster />
    </>
  );
}
