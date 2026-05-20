import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, Geist_Mono } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

import { TenantProvider } from "@/components/providers/tenant-provider";
import { TenantFaviconSync } from "@/components/tenant-favicon-sync";
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

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const BRAND_THEME_COLOR = "#28A745";

export async function generateViewport(): Promise<Viewport> {
  const tenant = await resolveTenantContext();
  const fromBrand = themeColorFromTenant(tenant);
  return {
    themeColor: fromBrand ?? BRAND_THEME_COLOR,
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
  return (
    <TenantProvider value={tenant}>
      <TenantFaviconSync />
      {children}
    </TenantProvider>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const tenant = await resolveTenantContext();
  const body = renderBody(tenant, children);

  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${dmSans.variable} ${cormorant.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <TenantHostSync />
        {withTenantProvider(tenant, body)}
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-QTMX2VD4Y8"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-QTMX2VD4Y8');
          `}
        </Script>
      </body>
    </html>
  );
}
