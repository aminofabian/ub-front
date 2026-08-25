"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { useOptionalTenant } from "@/components/providers/tenant-provider";
import {
  GuestSupportLauncher,
  type GuestSupportContext,
} from "@/components/support/guest-support-chat";
import { PLATFORM_DOMAIN } from "@/lib/config";

/**
 * Paths that are never part of the public kiosk.ke site. Pure URL gating — the
 * launcher shows on every public page of the apex domain, for everyone
 * (signed-in or not). In-app support chats live in their own layouts and take
 * over there.
 */
const APP_PATH_PREFIXES = [
  // Consoles & auth
  "/super-admin",
  "/supplier-portal",
  "/auth",
  "/login",
  "/signup",
  // Ops / install
  "/_status",
  "/setup",
  "/migration",
  "/desktop",
  // Tenant dashboard route groups
  "/analytics",
  "/branches",
  "/business",
  "/categories",
  "/credits",
  "/customers",
  "/discounts",
  "/inventory",
  "/item-types",
  "/messages",
  "/order",
  "/overview",
  "/payments",
  "/payroll",
  "/pricing",
  "/products",
  "/purchasing",
  "/purchases",
  "/reports",
  "/roles",
  "/sales",
  "/settings",
  "/shifts",
  "/stock",
  "/storefront",
  "/suppliers",
  "/supplies",
  "/support",
  "/sync-conflicts",
  "/team",
  "/users",
  "/pos",
  // Apex-dev storefront (the storefront launcher owns those pages)
  "/shop",
];

/**
 * True only for the platform marketing apex — never for a host-mapped tenant
 * shop (custom domains like palmart.co.ke, or `{slug}.kiosk.ke`).
 */
function isPlatformApexHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const apex = PLATFORM_DOMAIN.toLowerCase();
  return (
    host === apex ||
    host === `www.${apex}` ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1"
  );
}

function computeVisible(pathname: string | null, hasTenant: boolean): boolean {
  if (typeof window === "undefined") {
    return false; // SSR renders nothing; the mount effect flips it after hydration
  }
  // Host-mapped storefronts own their own STOREFRONT chat — never VISITOR→SA.
  if (hasTenant) {
    return false;
  }
  if (!isPlatformApexHost(window.location.hostname)) {
    return false;
  }
  const path = (pathname ?? window.location.pathname ?? "/").toLowerCase();
  if (APP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return false;
  }
  return true;
}

/**
 * Public kiosk.ke guest chat — a floating support button on the marketing,
 * help, blog, and product pages. Talks to the platform team as an anonymous
 * VISITOR (name + phone captured in the chat).
 *
 * Must not render on tenant storefronts (custom domain or subdomain) — those
 * use {@link StorefrontSupportLauncher} so buyers reach the shop's staff.
 */
export function PlatformSupportLauncher() {
  const pathname = usePathname();
  const tenant = useOptionalTenant();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setVisible(computeVisible(pathname, Boolean(tenant)));
  }, [pathname, tenant]);

  if (!visible) return null;

  const context: GuestSupportContext = {
    ns: "platform",
    type: "VISITOR",
    title: "Kiosk Support",
    teamName: "Kiosk team",
    blurb: "Questions about Kiosk, billing, your shop, or a product? We're here.",
    quickPrompts: [
      "How do I set up my shop?",
      "I need help with billing",
      "Something isn't working",
    ],
  };

  return <GuestSupportLauncher context={context} />;
}
