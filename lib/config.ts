export const APP_ROUTES = {
  login: "/login",
  authHandoff: "/auth/handoff",
  signup: "/signup",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  superAdminLogin: "/super-admin/login",
  superAdminBusinesses: "/super-admin/businesses",
  business: "/business",
  businessBranding: "/business/branding",
  businessDomains: "/business/domains",
  branches: "/branches",
  users: "/users",
  products: "/products",
  categories: "/categories",
  suppliers: "/suppliers",
  customers: "/customers",
  purchasingIntelligence: "/purchasing/intelligence",
  purchasingApAging: "/purchasing/ap-aging",
  purchasingRecordPayment: "/purchasing/record-payment",
  inventoryValuation: "/inventory/valuation",
  inventoryTransfers: "/inventory/transfers",
  inventoryStockTake: "/inventory/stock-take",
  pricing: "/pricing",
  shifts: "/shifts",
  salesReports: "/sales/reports",
  storefrontWebOrders: "/storefront/web-orders",
  salesQuick: "/sales/quick",
  cashier: "/cashier",
  shop: "/shop",
  shopCart: "/shop/cart",
  shopCheckout: "/shop/checkout",
  tenantSuspended: "/_status/suspended",
  tenantInactive: "/_status/inactive",
} as const;

/** Public product detail (Phase 15 storefront). */
export function shopItemPath(itemId: string): string {
  return `/shop/items/${encodeURIComponent(itemId)}`;
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
  businessMe: "/api/v1/businesses/me",
  branches: "/api/v1/branches",
  users: "/api/v1/users",
  roles: "/api/v1/roles",
  items: "/api/v1/items",
  itemTypes: "/api/v1/item-types",
  categories: "/api/v1/categories",
  superAdminAuthLogin: "/api/v1/super-admin/auth/login",
  superAdminBusinesses: "/api/v1/super-admin/businesses",
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
const API_BROWSER_DIRECT =
  process.env.NEXT_PUBLIC_API_BROWSER_DIRECT === "true";

/**
 * Base for `fetch` to the backend. Default is empty → same-origin `/api/v1/...` handled by
 * `app/api/v1/[[...path]]` (set server-only `BACKEND_ORIGIN` to the real API).
 *
 * `NEXT_PUBLIC_API_BASE_URL` alone does nothing — avoids shipping cross-origin URLs to production
 * by mistake. For direct browser→API (needs CORS), set `NEXT_PUBLIC_API_BROWSER_DIRECT=true` too.
 */
export const API_BASE_URL =
  API_BROWSER_DIRECT && RAW_API_BASE_URL.length > 0 ? RAW_API_BASE_URL : "";

/** This app in the browser (no trailing slash). Align with APP_PUBLIC_FRONTEND_BASE_URL on the API. */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";

/** Business UUID for local dev when Host is not a mapped tenant domain. */
export const PUBLIC_TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID?.trim() ?? "";

/** Browser origin for slug.{APP_BASE_URL hostname} — keep in sync with backend app.tenancy.slug-domain-suffix (hostname only, no port). */
export function slugDerivedShopUrl(slug: string): string {
  const s = slug.trim().toLowerCase();
  if (!s) {
    return "";
  }
  const base = new URL(APP_BASE_URL);
  const host = `${s}.${base.hostname}`;
  const port = base.port ? `:${base.port}` : "";
  return `${base.protocol}//${host}${port}`;
}

/**
 * Browser origin for an explicit tenant hostname (e.g. the active primary
 * domain). Reuses the protocol+port from {@link APP_BASE_URL} so localhost dev
 * keeps `http://...:3000` while production hosts get the canonical https URL.
 *
 * Returns `""` when the host is blank, already an absolute URL we cannot parse,
 * or contains anything other than a hostname/port pair — callers should fall
 * back to {@link slugDerivedShopUrl} in that case.
 */
export function hostDerivedShopUrl(hostname: string | null | undefined): string {
  const raw = (hostname ?? "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  if (raw.includes("/") || raw.includes(" ")) {
    return "";
  }
  const base = new URL(APP_BASE_URL);
  const port = base.port ? `:${base.port}` : "";
  return `${base.protocol}//${raw}${port}`;
}
