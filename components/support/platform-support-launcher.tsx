"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

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

function computeVisible(pathname: string | null): boolean {
  if (typeof window === "undefined") {
    return false; // SSR renders nothing; the mount effect flips it after hydration
  }
  const host = window.location.hostname.toLowerCase();
  const apex = PLATFORM_DOMAIN.toLowerCase();
  const isApex =
    host === apex ||
    host === `www.${apex}` ||
    host === "palmart.co.ke" ||
    host === "www.palmart.co.ke" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1";
  if (!isApex) {
    return false; // tenant subdomains get the storefront-branded launcher
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
 */
export function PlatformSupportLauncher() {
  const pathname = usePathname();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setVisible(computeVisible(pathname));
  }, [pathname]);

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
