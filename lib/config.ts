export const APP_ROUTES = {
  overview: "/overview",
  login: "/login",
  authHandoff: "/auth/handoff",
  signup: "/signup",
  signupStaff: "/signup/staff",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  superAdminLogin: "/super-admin/login",
  superAdminDashboard: "/super-admin",
  superAdminBusinesses: "/super-admin/businesses",
  superAdminSettings: "/super-admin/settings",
  superAdminPlatformIntegrations: "/super-admin/platform/integrations",
  superAdminPlatformPayments: "/super-admin/payments/platform",
  business: "/business",
  businessBranding: "/business/branding",
  businessDomains: "/business/domains",
  businessImport: "/business/import",
  branches: "/branches",
  users: "/users",
  products: "/products",
  itemTypes: "/item-types",
  categories: "/categories",
  suppliers: "/suppliers",
  customers: "/customers",
  purchasingIntelligence: "/purchasing/intelligence",
  purchasingAddSupplies: "/supplies",
  purchasingApAging: "/purchasing/ap-aging",
  purchasingRecordPayment: "/purchasing/record-payment",
  inventoryStock: "/inventory/stock",
  inventoryValuation: "/inventory/valuation",
  inventoryTransfers: "/inventory/transfers",
  inventoryStockTake: "/inventory/stock-take",
  inventoryStockTakeReconciliation: "/inventory/stock-take/reconciliation",
  inventorySupplyBatches: "/inventory/supply-batches",
  pricing: "/pricing",
  shifts: "/shifts",
  analytics: "/analytics",
  analyticsActivity: "/analytics/activity",
  sales: "/sales",
  salesTransactions: "/sales/transactions",
  salesReports: "/sales/reports",
  storefrontWebOrders: "/storefront/web-orders",
  promoCampaigns: "/business/promotions",
  salesQuick: "/sales/quick",
  cashier: "/cashier",
  shop: "/shop",
  shopAccount: "/shop/account",
  shopCart: "/shop/cart",
  shopCheckout: "/shop/checkout",
  barcode: "/barcode",
  paymentsSettings: "/payments/settings",
  tenantSuspended: "/_status/suspended",
  tenantInactive: "/_status/inactive",
} as const;

/** Public product detail (Phase 15 storefront). */
export function shopItemPath(sku: string): string {
  return `/${encodeURIComponent(sku)}`;
}

export { shopItemPathFromCard } from "./shop-item-url";

/** Dashboard category detail by slug. */
export function categorySlugPath(slug: string): string {
  return `/categories/${encodeURIComponent(slug)}`;
}

/** Dashboard category analytics by slug. */
export function categoryAnalyticsPath(slug: string): string {
  return `/categories/${encodeURIComponent(slug)}/analytics`;
}

export const API_ROUTES = {
  login: "/api/v1/auth/login",
  loginPin: "/api/v1/auth/login-pin",
  register: "/api/v1/auth/register",
  verifyEmail: "/api/v1/auth/verify-email",
  resendVerification: "/api/v1/auth/resend-verification",
  passwordForgot: "/api/v1/auth/password/forgot",
  passwordReset: "/api/v1/auth/password/reset",
  logout: "/api/v1/auth/logout",
  refresh: "/api/v1/auth/refresh",
  me: "/api/v1/me",
  shopperHub: "/api/v1/me/shopper",
  shopperNotifications: "/api/v1/me/shopper/notifications",
  notificationPreferences: "/api/v1/me/notification-preferences",
  shopperNotificationSubscriptions: "/api/v1/me/shopper/notification-subscriptions",
  businessMe: "/api/v1/businesses/me",
  branches: "/api/v1/branches",
  users: "/api/v1/users",
  roles: "/api/v1/roles",
  items: "/api/v1/items",
  itemTypes: "/api/v1/item-types",
  categories: "/api/v1/categories",
  superAdminAuthLogin: "/api/v1/super-admin/auth/login",
  superAdminBusinesses: "/api/v1/super-admin/businesses",
  superAdminPlatformPaymentGateways:
    "/api/v1/super-admin/payments/platform-gateways",
  superAdminPlatformIntegrations: "/api/v1/super-admin/platform/integrations",
  paymentGatewaysAvailable: "/api/v1/payments/gateways/available",
  paymentGateways: "/api/v1/payments/gateways",
  paymentSupplierPayout: "/api/v1/payments/supplier-payout",
  paymentDisplayInstructions: "/api/v1/payments/display-instructions",
} as const;

/** Spring Data page query (flat params). */
export const DEFAULT_PAGE_QUERY = "page=0&size=100";

export const STORAGE_KEYS = {
  accessToken: "ub.accessToken",
  refreshToken: "ub.refreshToken",
  tenantHost: "ub.tenantHost",
  tenantId: "ub.tenantId",
  superAdminAccessToken: "ub.sa.accessToken",
} as const;

export const ERROR_CODES = {
  tokenExpired: "token_expired",
} as const;

/** RFC 7807 `title` from the API (e.g. JWT filter) — keep in sync with backend. */
export const PROBLEM_TITLES = {
  invalidOrExpiredAccessToken: "Invalid or expired access token",
} as const;

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
const RAW_REALTIME_WS_ORIGIN =
  process.env.NEXT_PUBLIC_REALTIME_WS_ORIGIN?.trim() ?? "";

/** Platform apex domain — tenant shops are `{slug}.kiosk.ke`. */
export const PLATFORM_DOMAIN = "kiosk.ke";

/** Hosted Java API origin (no trailing slash). */
export const REMOTE_API_ORIGIN = "https://kiosk.zelisline.com";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

function isPlatformProductionHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "kiosk.ke" ||
    host.endsWith(".kiosk.ke") ||
    host === "palmart.co.ke" ||
    host.endsWith(".palmart.co.ke")
  );
}

/**
 * Java API origin for server-side fetches (SSR, Route Handlers, server components).
 */
export function getServerApiOrigin(): string {
  const raw =
    process.env.BACKEND_ORIGIN?.trim() ||
    process.env.API_BACKEND_ORIGIN?.trim() ||
    "";
  return normalizeOrigin(raw) || REMOTE_API_ORIGIN;
}

/**
 * Browser-visible API origin for REST calls.
 *
 * Strategy: in the browser, ALWAYS return "" so that {@link apiUrl} produces a
 * same-origin path like `/api/v1/...`. The Next.js BFF (see `next.config.ts`
 * `rewrites`) transparently forwards those to the Java backend.
 *
 * Same-origin browser traffic eliminates CORS preflights entirely — backend
 * 502/503s no longer surface as misleading "No 'Access-Control-Allow-Origin'
 * header" errors, and CORS allow-list drift in env vars cannot break the
 * storefront.
 *
 * {@code NEXT_PUBLIC_API_BASE_URL} is intentionally ignored at runtime in the
 * browser — it's only honored on the server (SSR/route handlers) where there
 * is no CORS and the BFF rewrite path is not exercised. This prevents a stale
 * Vercel env var (e.g. {@code https://kiosk.zelisline.com}) from re-introducing
 * cross-origin requests that we've worked hard to eliminate.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  const normalizedEnv = normalizeOrigin(RAW_API_BASE_URL);
  if (normalizedEnv.length > 0) {
    return normalizedEnv;
  }
  return "";
}

/** Absolute or same-origin URL for `/api/v1/...` paths. */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const browserOrigin = getApiBaseUrl();
  if (browserOrigin) {
    return `${normalizeOrigin(browserOrigin)}${normalizedPath}`;
  }
  if (typeof window === "undefined") {
    return `${getServerApiOrigin()}${normalizedPath}`;
  }
  return normalizedPath;
}

/**
 * Java API origin used for browser WebSocket connections.
 *
 * <p>Set via {@code NEXT_PUBLIC_REALTIME_WS_ORIGIN} (injected from {@code BACKEND_ORIGIN}
 * at build time in {@code next.config.ts}). Never use the Next.js page host — rewrites
 * do not upgrade WebSockets.
 */
function resolveJavaApiOriginForWebSocket(): string {
  if (RAW_REALTIME_WS_ORIGIN.length > 0) {
    return RAW_REALTIME_WS_ORIGIN;
  }
  const apiBase = normalizeOrigin(RAW_API_BASE_URL);
  if (apiBase.length > 0 && typeof window !== "undefined") {
    try {
      if (new URL(apiBase).host === window.location.host) {
        return REMOTE_API_ORIGIN;
      }
    } catch {
      /* use apiBase */
    }
    return apiBase;
  }
  return REMOTE_API_ORIGIN;
}

export function resolveRealtimeWebSocketBaseUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const pageIsHttps = window.location.protocol === "https:";

  const api = new URL(resolveJavaApiOriginForWebSocket());
  api.protocol = pageIsHttps || api.protocol === "https:" ? "wss:" : "ws:";
  return `${api.origin}/api/v1/realtime`;
}

/** This app in the browser (no trailing slash). Align with APP_PUBLIC_FRONTEND_BASE_URL on the API. */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";

/** Platform apex hostname from {@link APP_BASE_URL} (e.g. {@code palmart.co.ke}). */
export function platformApexHostname(): string {
  try {
    return new URL(APP_BASE_URL).hostname.trim().toLowerCase();
  } catch {
    return "";
  }
}

/** True when {@code host} is the platform apex or {@code www.} apex (not a tenant subdomain). */
export function isPlatformApexHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  const apex = platformApexHostname();
  if (!h || !apex) {
    return false;
  }
  return h === apex || h === `www.${apex}`;
}

/** Business UUID for local dev when Host is not a mapped tenant domain. */
export const PUBLIC_TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID?.trim() ?? "";

const BARE_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Resolves the effective base URL for slug/host derivation at runtime.
 *
 * <p>When {@code NEXT_PUBLIC_APP_BASE_URL} is unset or still points to localhost
 * (common when the env var was missed in a production deploy), this falls back
 * to the browser's current origin with the first subdomain stripped so that
 * tenant URLs like {@code barakia.palmart.co.ke} correctly derive from
 * {@code palmart.co.ke} rather than {@code localhost}.
 */
function resolveAppBaseUrl(): string {
  if (typeof window === "undefined") {
    return APP_BASE_URL;
  }
  let baseHost: string;
  try {
    baseHost = new URL(APP_BASE_URL).hostname;
  } catch {
    // NEXT_PUBLIC_APP_BASE_URL is missing a protocol (e.g. "kiosk.ke" instead
    // of "https://kiosk.ke"). Fall back to the browser's current origin.
    return window.location.origin;
  }
  if (!BARE_LOCAL_HOSTS.has(baseHost)) {
    return APP_BASE_URL; // already configured for production
  }
  // APP_BASE_URL is localhost — derive from the browser's current hostname
  const hostname = window.location.hostname.toLowerCase();
  if (BARE_LOCAL_HOSTS.has(hostname)) {
    return APP_BASE_URL; // still localhost, can't derive
  }
  // Strip the leftmost subdomain to get the platform base (e.g. barakia.palmart.co.ke → palmart.co.ke)
  const parts = hostname.split(".");
  // Common second-level ccTLDs where the effective TLD is 2 parts (e.g. .co.ke, .co.uk, .com.au)
  const ccSLDs = new Set([
    "co",
    "com",
    "org",
    "net",
    "gov",
    "edu",
    "ac",
    "or",
    "ne",
    "go",
  ]);
  const minParts = ccSLDs.has(parts[parts.length - 2]) ? 4 : 3;
  if (parts.length >= minParts) {
    const baseHostname = parts.slice(1).join(".");
    return `${window.location.protocol}//${baseHostname}`;
  }
  // Hostname is already the base (e.g. palmart.co.ke or palmart.com)
  return window.location.origin;
}

/** Browser origin for slug.{base hostname} — keep in sync with backend app.tenancy.slug-domain-suffix (hostname only, no port). */
export function slugDerivedShopUrl(slug: string): string {
  const s = slug.trim().toLowerCase();
  if (!s) {
    return "";
  }
  try {
    const base = new URL(resolveAppBaseUrl());
    const host = `${s}.${base.hostname}`;
    const port = base.port ? `:${base.port}` : "";
    return `${base.protocol}//${host}${port}`;
  } catch {
    // resolveAppBaseUrl returned something that isn't a valid URL.
    // Last resort: derive from the browser's current origin.
    if (typeof window !== "undefined") {
      try {
        const origin = new URL(window.location.origin);
        return `${origin.protocol}//${s}.${origin.hostname}${origin.port ? `:${origin.port}` : ""}`;
      } catch {
        /* give up */
      }
    }
    return "";
  }
}

/**
 * Browser origin for an explicit tenant hostname (e.g. the active primary
 * domain). Reuses the protocol+port from the resolved base URL so localhost dev
 * keeps `http://...:3000` while production hosts get the canonical https URL.
 *
 * Returns `""` when the host is blank, already an absolute URL we cannot parse,
 * or contains anything other than a hostname/port pair — callers should fall
 * back to {@link slugDerivedShopUrl} in that case.
 */
export function hostDerivedShopUrl(
  hostname: string | null | undefined,
): string {
  const raw = (hostname ?? "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  if (raw.includes("/") || raw.includes(" ")) {
    return "";
  }
  try {
    const base = new URL(resolveAppBaseUrl());
    const port = base.port ? `:${base.port}` : "";
    return `${base.protocol}//${raw}${port}`;
  } catch {
    if (typeof window !== "undefined") {
      try {
        const origin = new URL(window.location.origin);
        return `${origin.protocol}//${raw}${origin.port ? `:${origin.port}` : ""}`;
      } catch {
        /* give up */
      }
    }
    return "";
  }
}
