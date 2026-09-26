import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { barlowCondensed } from "@/app/fonts/barlow-condensed";
import { geistMono } from "@/app/fonts/geist-mono";
import { inter } from "@/app/fonts/inter";
import { TenantProvider } from "@/components/providers/tenant-provider";
import { PlatformSupportLauncher } from "@/components/support/platform-support-launcher";
import { TenantFaviconSync } from "@/components/tenant-favicon-sync";
import { TenantHostSync } from "@/components/tenant-host-sync";
import { TenantStatusPage } from "@/components/storefront/tenant-status-page";
import type { TenantContext } from "@/lib/public-storefront";
import {
  metadataFromTenantAndHost,
  themeColorFromTenant,
} from "@/lib/tenant-metadata";
import { platformApexHostname, STORAGE_KEYS } from "@/lib/config";
import {
  getRequestHostname,
  resolveTenantContext,
} from "@/lib/storefront-slug";
import "./globals.css";

const BRAND_THEME_COLOR = "#28A745";

export async function generateViewport(): Promise<Viewport> {
  const tenant = await resolveTenantContext();
  const fromBrand = themeColorFromTenant(tenant);
  return {
    themeColor: fromBrand ?? BRAND_THEME_COLOR,
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
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

// Desktop builds run fully offline; remote analytics scripts must not be
// referenced (CSP blocks them and a failed fetch creates a confusing console
// error during pilot demos). This guard collapses to a constant at build time
// because NEXT_PUBLIC_* env vars are inlined by Next.
const IS_DESKTOP = process.env.NEXT_PUBLIC_RUNTIME === "desktop";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const tenant = await resolveTenantContext();
  const body = renderBody(tenant, children);

  return (
    <html
      lang="en-KE"
      className={`${geistMono.variable} ${inter.variable} ${barlowCondensed.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Native <script> tags (not next/script beforeInteractive) — Next's
          beforeInteractive strategy serializes differently on SSR vs client
          (blob src vs __next_s queue) and trips a hydration warning in <head>.
          These must run before paint: error reporter, polyfills, tenant/PWA init.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- early boot; see comment above */}
        <script src="/client-error-reporter.js" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- early boot; see comment above */}
        <script src="/runtime-polyfills.js" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          id="client-session-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=location.hostname.toLowerCase();var p=location.pathname;var local={"localhost":1,"127.0.0.1":1,"::1":1};var apex=${JSON.stringify(platformApexHostname())};var tenantHost=!local[h]&&p.indexOf("/super-admin")!==0&&!!apex&&h!==apex&&h!=="www."+apex;var slug=${JSON.stringify(tenant?.slug ?? "")};if(tenantHost){try{localStorage.setItem(${JSON.stringify(STORAGE_KEYS.tenantHost)},h);sessionStorage.setItem(${JSON.stringify(STORAGE_KEYS.tenantHost)},h);}catch(e){}}if(slug){var href="/pwa/"+encodeURIComponent(slug)+"/manifest.webmanifest";var links=document.querySelectorAll('link[rel="manifest"]');var kept=false;for(var i=0;i<links.length;i++){if(!kept){links[i].setAttribute("href",href);kept=true;}else if(links[i].parentNode){links[i].parentNode.removeChild(links[i]);}}}if(slug||tenantHost||p.indexOf("/shop")===0||p.indexOf("/pwa/")===0){window.addEventListener("beforeinstallprompt",function(ev){ev.preventDefault();window.__kioskShopperPwa=window.__kioskShopperPwa||{};window.__kioskShopperPwa.prompt=ev;});window.addEventListener("appinstalled",function(){window.__kioskShopperPwa=window.__kioskShopperPwa||{};window.__kioskShopperPwa.prompt=null;window.__kioskShopperPwa.installed=true;if(slug){try{localStorage.setItem("ub.shopperPwa."+slug,"installed");}catch(e2){}}});}var keepSw=p.indexOf("/shop")===0||p.indexOf("/pwa/")===0||p==="/app"||p.indexOf("/products")===0||tenantHost;if("serviceWorker" in navigator&&!keepSw){navigator.serviceWorker.getRegistrations().then(function(r){for(var i=0;i<r.length;i++){r[i].unregister();}});}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <TenantHostSync />
        {withTenantProvider(
          tenant,
          <>
            {body}
            {/* Inside TenantProvider so host-mapped shops hide the platform VISITOR chat. */}
            {IS_DESKTOP ? null : <PlatformSupportLauncher />}
          </>,
        )}
        {IS_DESKTOP ? null : (
          <>
            {/* Google Analytics — cloud only. */}
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
          </>
        )}
      </body>
    </html>
  );
}
