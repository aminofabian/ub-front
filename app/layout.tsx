import type { Metadata, Viewport } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import type { ReactNode } from "react";

import { TenantProvider } from "@/components/providers/tenant-provider";
import { TenantHostSync } from "@/components/tenant-host-sync";
import { TenantStatusPage } from "@/components/storefront/tenant-status-page";
import type { TenantContext } from "@/lib/public-storefront";
import { resolveTenantContext } from "@/lib/storefront-slug";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#171717",
};

export const metadata: Metadata = {
  title: "UB Admin — Phase 1",
  description: "Tenant admin: business, users, and catalog (Slice 6 scaffold).",
  appleWebApp: {
    capable: true,
    title: "UB Cashier",
  },
};

function renderBody(tenant: TenantContext | null, children: ReactNode): ReactNode {
  if (tenant && tenant.status !== "ACTIVE") {
    return <TenantStatusPage status={tenant.status} />;
  }
  return children;
}

function withTenantProvider(tenant: TenantContext | null, children: ReactNode): ReactNode {
  if (!tenant) {
    return children;
  }
  return <TenantProvider value={tenant}>{children}</TenantProvider>;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const tenant = await resolveTenantContext();
  const body = renderBody(tenant, children);

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TenantHostSync />
        {withTenantProvider(tenant, body)}
      </body>
    </html>
  );
}
