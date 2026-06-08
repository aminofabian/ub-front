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
import { platformApexHostname, STORAGE_KEYS } from "@/lib/config";
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

/**
 * ES5-only uncaught-error reporter. Old iPad Safari (iPadOS 15.x) has no
 * accessible dev console; when a bundle throws a parse/runtime error the page
 * renders but no JS runs (dead buttons, no fetches, infinite skeleton). This
 * installs window error handlers BEFORE any other script so the real error
 * (message + source + line:col) is shown on-screen and saved to sessionStorage
 * under "ub.lastError". Keep this strictly ES5 — no arrow fns, template
 * literals, const/let, or it would crash on the very browsers it must serve.
 */
const CLIENT_ERROR_REPORTER = [
  "(function(){",
  "var KEY='ub.lastError';",
  "function fmt(m,s,l,c){return String(m||'Error')+(s?(' @ '+String(s).split('/').pop()):'')+(l?(' '+l+':'+(c||0)):'');}",
  "function show(text){",
  "try{sessionStorage.setItem(KEY,text+' | '+navigator.userAgent);}catch(e){}",
  "function paint(){",
  "if(document.getElementById('ub-err'))return;",
  "var b=document.body;if(!b){return;}",
  "var d=document.createElement('div');d.id='ub-err';",
  "d.setAttribute('style','position:fixed;left:0;right:0;top:0;z-index:2147483647;background:#7f1d1d;color:#fff;font:13px/1.4 -apple-system,system-ui,sans-serif;padding:10px 12px;box-shadow:0 2px 8px rgba(0,0,0,.3);word-break:break-word;');",
  "d.innerHTML='<strong>App error (please screenshot):</strong><br>'+text.replace(/</g,'&lt;')+'<br><button id=\"ub-err-x\" style=\"margin-top:6px;background:#fff;color:#7f1d1d;border:0;border-radius:6px;padding:4px 10px;font-weight:600;\">Dismiss</button>';",
  "b.appendChild(d);",
  "var x=document.getElementById('ub-err-x');if(x){x.onclick=function(){d.parentNode&&d.parentNode.removeChild(d);};}",
  "}",
  "if(document.body){paint();}else{document.addEventListener('DOMContentLoaded',paint);}",
  "}",
  "window.addEventListener('error',function(ev){",
  "if(ev&&ev.message){show(fmt(ev.message,ev.filename,ev.lineno,ev.colno));}",
  "},true);",
  "window.addEventListener('unhandledrejection',function(ev){",
  "var r=ev&&ev.reason;var m=r&&r.message?r.message:(r?String(r):'unhandledrejection');show('Promise: '+m);",
  "});",
  "})();",
].join("");

/**
 * ES5 runtime polyfills for old iPad Safari (iPadOS < 15.4, and some < 16
 * gaps). Next/SWC down-levels syntax but does NOT polyfill these runtime APIs,
 * so React 19 / dependencies calling them throw during hydration → dead page.
 * Each guard is no-op when the API already exists. Keep strictly ES5.
 */
const CLIENT_RUNTIME_POLYFILLS = [
  "(function(){",
  // Array.prototype.at / String.prototype.at (iOS 15.4)
  "function at(n){n=Math.trunc(n)||0;if(n<0)n+=this.length;if(n<0||n>=this.length)return undefined;return this[n];}",
  "if(!Array.prototype.at){Object.defineProperty(Array.prototype,'at',{value:at,writable:true,configurable:true});}",
  "if(!String.prototype.at){Object.defineProperty(String.prototype,'at',{value:at,writable:true,configurable:true});}",
  // Object.hasOwn (iOS 15.4)
  "if(!Object.hasOwn){Object.defineProperty(Object,'hasOwn',{value:function(o,p){return Object.prototype.hasOwnProperty.call(o,p);},writable:true,configurable:true});}",
  // String.prototype.replaceAll (iOS 13.4 — guard anyway)
  "if(!String.prototype.replaceAll){Object.defineProperty(String.prototype,'replaceAll',{value:function(s,r){if(Object.prototype.toString.call(s)==='[object RegExp]')return this.replace(s,r);return this.split(s).join(r);},writable:true,configurable:true});}",
  // Array.prototype.findLast / findLastIndex (iOS 15.4)
  "if(!Array.prototype.findLast){Object.defineProperty(Array.prototype,'findLast',{value:function(cb,t){for(var i=this.length-1;i>=0;i--){if(cb.call(t,this[i],i,this))return this[i];}return undefined;},writable:true,configurable:true});}",
  "if(!Array.prototype.findLastIndex){Object.defineProperty(Array.prototype,'findLastIndex',{value:function(cb,t){for(var i=this.length-1;i>=0;i--){if(cb.call(t,this[i],i,this))return i;}return -1;},writable:true,configurable:true});}",
  // Promise.any (iOS 14)
  "if(typeof Promise!=='undefined'&&!Promise.any){Promise.any=function(ps){return new Promise(function(res,rej){var arr=Array.prototype.slice.call(ps),n=arr.length,errs=[],c=0;if(!n){rej(new Error('All promises were rejected'));return;}arr.forEach(function(p,i){Promise.resolve(p).then(res,function(e){errs[i]=e;c++;if(c===n)rej(new Error('All promises were rejected'));});});});};}",
  // structuredClone (iOS 15.4) — JSON fallback covers plain data
  "if(typeof structuredClone==='undefined'){window.structuredClone=function(v){return v==null?v:JSON.parse(JSON.stringify(v));};}",
  // crypto.randomUUID (iOS 15.4, secure context)
  "try{if(window.crypto&&!window.crypto.randomUUID&&window.crypto.getRandomValues){window.crypto.randomUUID=function(){var b=window.crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;var h=[];for(var i=0;i<16;i++)h.push((b[i]+256).toString(16).slice(1));return h[0]+h[1]+h[2]+h[3]+'-'+h[4]+h[5]+'-'+h[6]+h[7]+'-'+h[8]+h[9]+'-'+h[10]+h[11]+h[12]+h[13]+h[14]+h[15];};}}catch(e){}",
  "})();",
].join("");

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
      lang="en"
      className={`${geistMono.variable} ${dmSans.variable} ${cormorant.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Pure-ES5 crash reporter. MUST be the first script so it captures
            parse/runtime errors thrown by later bundles (old iPad Safari has
            no dev console). Renders the real error on-screen + persists it. */}
        <script
          dangerouslySetInnerHTML={{
            __html: CLIENT_ERROR_REPORTER,
          }}
        />
        {/* Runtime polyfills — must run before the React bundle. */}
        <script
          dangerouslySetInnerHTML={{
            __html: CLIENT_RUNTIME_POLYFILLS,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <Script id="client-session-init" strategy="beforeInteractive">
          {`(function(){try{var h=location.hostname.toLowerCase();var local={"localhost":1,"127.0.0.1":1,"::1":1};if(!local[h]&&location.pathname.indexOf("/super-admin")!==0){var apex=${JSON.stringify(platformApexHostname())};if(!apex||h!==apex&&h!=="www."+apex){try{localStorage.setItem(${JSON.stringify(STORAGE_KEYS.tenantHost)},h);sessionStorage.setItem(${JSON.stringify(STORAGE_KEYS.tenantHost)},h);}catch(e){}}}}catch(e){}if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(function(r){for(var i=0;i<r.length;i++){r[i].unregister();}});}})();`}
        </Script>
      </head>
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <TenantHostSync />
        {withTenantProvider(tenant, body)}
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
