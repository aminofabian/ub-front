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
  branches: "/branches",
  users: "/users",
  products: "/products",
  categories: "/categories",
  suppliers: "/suppliers",
  purchasingIntelligence: "/purchasing/intelligence",
  purchasingApAging: "/purchasing/ap-aging",
  purchasingRecordPayment: "/purchasing/record-payment",
  inventoryValuation: "/inventory/valuation",
  inventoryTransfers: "/inventory/transfers",
  inventoryStockTake: "/inventory/stock-take",
  pricing: "/pricing",
  shifts: "/shifts",
  salesQuick: "/sales/quick",
} as const;

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

/**
 * Browser API origin. Empty → same-origin `/api/...` (proxied by Next.js when `BACKEND_ORIGIN` is set).
 * Set `NEXT_PUBLIC_API_BASE_URL` only for direct browser→API calls (needs CORS on the API).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "";

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
