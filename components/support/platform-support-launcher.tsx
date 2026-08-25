"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import {
  GuestSupportLauncher,
  type GuestSupportContext,
} from "@/components/support/guest-support-chat";
import { PLATFORM_DOMAIN, STORAGE_KEYS } from "@/lib/config";

/** Paths that are never part of the public kiosk.ke site. */
const APP_PATH_PREFIXES = [
  "/super-admin",
  "/login",
  "/signup",
  "/auth",
  "/supplier-portal",
  "/_status",
  "/setup",
  "/migration",
  "/desktop",
  "/overview",
  "/sales",
  "/inventory",
  "/stock",
  "/purchases",
  "/suppliers",
  "/payments",
  "/shifts",
  "/support",
  "/settings",
  "/business",
  "/customers",
  "/reports",
  "/credits",
  "/profile",
  "/team",
  "/branches",
  "/roles",
  "/storefront",
  "/pos",
];

/**
 * Public kiosk.ke guest chat — a floating support button on the marketing /
 * help / shop pages. Talks to the platform team as an anonymous VISITOR.
 *
 * Hidden inside the signed-in apps (dashboard, super-admin, supplier portal),
 * where the in-app support chat takes over.
 */
export function PlatformSupportLauncher() {
  const pathname = usePathname();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
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
      setVisible(false);
      return;
    }
    const path = pathname ?? "/";
    const onAppPath = APP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
    // A signed-in tenant is inside the dashboard world (where the in-app
    // support chat takes over). Super-admins and visitors keep the guest chat.
    const signedInAsTenant =
      Boolean(window.localStorage.getItem(STORAGE_KEYS.accessToken)) ||
      Boolean(window.localStorage.getItem(STORAGE_KEYS.tenantId));
    setVisible(!onAppPath && !signedInAsTenant);
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
