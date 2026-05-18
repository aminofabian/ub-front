import type { Metadata, Viewport } from "next";
import {
  DM_Sans,
  DM_Serif_Display,
  Geist_Mono,
  Manrope,
  Outfit,
} from "next/font/google";
import type { ReactNode } from "react";

import { TenantProvider } from "@/components/providers/tenant-provider";
import { TenantHostSync } from "@/components/tenant-host-sync";
import { TenantStatusPage } from "@/components/storefront/tenant-status-page";
import type { TenantContext } from "@/lib/public-storefront";
import {
  metadataFromTenantAndHost,
  themeColorFromTenant,
} from "@/lib/tenant-metadata";
import {
  getRequestHostname,
  resolveTenantContext,
} from "@/lib/storefront-slug";
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

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  style: ["normal", "italic"],
});

export async function generateViewport(): Promise<Viewport> {
  const tenant = await resolveTenantContext();
  const fromBrand = themeColorFromTenant(tenant);
  return {
    themeColor: fromBrand ?? "#171717",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const [tenant, host] = await Promise.all([
    resolveTenantContext(),
    getRequestHostname(),
  ]);
  return metadataFromTenantAndHost(tenant, host);
}

function renderBody(
  tenant: TenantContext | null,
  children: ReactNode,
): ReactNode {
  if (tenant && tenant.status !== "ACTIVE") {
    return <TenantStatusPage status={tenant.status} />;
  }
  return children;
}

function withTenantProvider(
  tenant: TenantContext | null,
  children: ReactNode,
): ReactNode {
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
      className={`${outfit.variable} ${manrope.variable} ${geistMono.variable} ${dmSans.variable} ${dmSerifDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <TenantHostSync />
        {withTenantProvider(tenant, body)}
      </body>
    </html>
  );
}
