/**
 * Public mobile distribution config (`GET /api/v1/public/businesses/{slug}/mobile`).
 */

import { apiUrl, getServerApiOrigin } from "@/lib/config";
import { sanitizeStorefrontSlug } from "@/lib/public-storefront";

export type PublicMobileBranding = {
  displayName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  metaKeywords: string | null;
  heroBannerUrls: string[] | null;
};

export type PublicMobileDeepLinks = {
  shopper: string;
  cashier: string;
  grocery: string;
  admin: string;
  stock: string;
  tenant: string;
  universalShop: string;
  universalApp: string;
};

export type PublicMobileStoreLinks = {
  ios: string | null;
  android: string | null;
};

export type PublicMobileApp = {
  role: string;
  name: string;
  bundleId: string;
  whiteLabel: boolean;
  embeddedTenantSlug: string;
  storeLinks: PublicMobileStoreLinks;
};

export type PublicMobileConfig = {
  tenantId: string;
  slug: string;
  displayName: string;
  tenantHost: string;
  tenantStatus: string;
  storefrontEnabled: boolean;
  apiBaseUrl: string;
  branding: PublicMobileBranding;
  deepLinks: PublicMobileDeepLinks;
  platformStoreLinks: PublicMobileStoreLinks;
  apps: PublicMobileApp[];
};

export type MobileAppRole = "shopper" | "cashier" | "grocery" | "admin" | "stock";

export const MOBILE_APP_ROLES: readonly MobileAppRole[] = [
  "shopper",
  "cashier",
  "grocery",
  "admin",
  "stock",
] as const;

export const MOBILE_APP_ROLE_LABELS: Record<
  MobileAppRole,
  { label: string; blurb: string }
> = {
  shopper: { label: "Shopper", blurb: "Browse catalog and place orders" },
  cashier: { label: "Cashier", blurb: "Point of sale on the floor" },
  grocery: { label: "Grocery", blurb: "Invoices and grocery desk" },
  admin: { label: "Admin", blurb: "Owner and manager tools" },
  stock: { label: "Stock", blurb: "Inventory counts and receiving" },
};

const MOBILE_FETCH_INIT = {
  headers: { Accept: "application/json" },
  next: { revalidate: 60 },
} as const;

function mobileConfigPath(slug: string): string | null {
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return null;
  }
  return `/api/v1/public/businesses/${encodeURIComponent(s)}/mobile`;
}

export async function fetchPublicMobileConfig(
  slug: string,
): Promise<PublicMobileConfig | null> {
  const path = mobileConfigPath(slug);
  if (!path) {
    return null;
  }
  const url = `${getServerApiOrigin()}${path}`;
  try {
    const res = await fetch(url, MOBILE_FETCH_INIT);
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicMobileConfig;
  } catch {
    return null;
  }
}

export async function fetchPublicMobileConfigBrowser(
  slug: string,
): Promise<PublicMobileConfig | null> {
  const path = mobileConfigPath(slug);
  if (!path) {
    return null;
  }
  try {
    const res = await fetch(apiUrl(path), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicMobileConfig;
  } catch {
    return null;
  }
}

export function deepLinkForRole(
  config: PublicMobileConfig,
  role: MobileAppRole,
): string {
  return config.deepLinks[role];
}

export function appForRole(
  config: PublicMobileConfig,
  role: MobileAppRole,
): PublicMobileApp | undefined {
  return config.apps.find((app) => app.role === role);
}

export type MobileTenantAppProfileExport = {
  name: string;
  expoSlug: string;
  bundleId: string;
};

export type MobileTenantProfileExport = {
  slug: string;
  displayName: string;
  tenantHostSuffix: string | null;
  apiBaseURL: string;
  splashBackgroundColor: string;
  primaryColor: string;
  scheme: string;
  apps: Record<string, MobileTenantAppProfileExport>;
  assets: {
    icon: string;
    splashImage: string;
    adaptiveIcon: string;
    favicon: string;
  };
};

export type MyMobileConfigResponse = {
  config: PublicMobileConfig;
  tenantProfile: MobileTenantProfileExport;
  newlyProvisioned: boolean;
};

export type MobilePublishStatus = {
  status: "idle" | "requested" | "building" | "submitted" | "failed";
  requestedAt: string | null;
  app: string;
  platform: string;
  workflowUrl: string | null;
  lastError: string | null;
  completedAt: string | null;
  automationConfigured: boolean;
  manualCommand: string;
};
