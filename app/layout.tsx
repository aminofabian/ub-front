import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope, Outfit } from "next/font/google";
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

const manrope = Manrope({
  variable: "--font-manrope",
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

const BASE_METADATA: Metadata = {
  title: "UB Admin — Phase 1",
  description: "Tenant admin: business, users, and catalog (Slice 6 scaffold).",
  appleWebApp: {
    capable: true,
    title: "UB Cashier",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await resolveTenantContext();
  const favicon = tenant?.branding?.faviconUrl?.trim();
  if (!favicon) {
    return BASE_METADATA;
  }
  return {
    ...BASE_METADATA,
    icons: {
      icon: [{ url: favicon }],
      shortcut: [{ url: favicon }],
      apple: [{ url: favicon }],
    },
  };
}

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
      className={`${outfit.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TenantHostSync />
        {withTenantProvider(tenant, body)}
      </body>
    </html>
  );
}
