"use client";

import {
  API_BASE_URL,
  API_ROUTES,
  DEFAULT_PAGE_QUERY,
  ERROR_CODES,
  PROBLEM_TITLES,
  PUBLIC_TENANT_ID,
  STORAGE_KEYS,
} from "@/lib/config";
import {
  clearSessionTokens,
  getSessionTokens,
  setSessionTokens,
  signOutClientAndRedirectToLogin,
} from "@/lib/auth";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { extractPageContent, extractSpringPageMeta } from "@/lib/page-content";
import { parseProblem, formatApiProblemMessage } from "@/lib/problem";
import { toast } from "sonner";

type RequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type RequestOptions = {
  method?: RequestMethod;
  body?: unknown;
  requiresAuth?: boolean;
  /** Overrides auto-generated Idempotency-Key for POST/PATCH (e.g. POS sale retries). */
  idempotencyKey?: string;
};

/** Thrown for non-OK API responses; message includes validation field errors when present. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

function notifyHttpErrorToast(message: string) {
  if (typeof window === "undefined" || !message.trim()) {
    return;
  }
  const lines = message.split("\n");
  const title = lines[0] ?? message;
  const description = lines.length > 1 ? lines.slice(1).join("\n") : undefined;
  toast.error(title, {
    duration: 12_000,
    description,
    classNames: {
      description: "whitespace-pre-wrap text-sm opacity-90",
    },
  });
}

function failRequest(status: number, payload: unknown, options?: { toast?: boolean }): never {
  const message = formatApiProblemMessage(payload);
  if (options?.toast !== false) {
    notifyHttpErrorToast(message);
  }
  throw new ApiRequestError(message, status, payload);
}

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

const PUBLIC_HOST_RESOLVE_PATH = "/api/v1/public/host/resolve";

/**
 * Maps a storefront hostname (or full shop URL) to the tenant UUID via the public host resolve API.
 * No auth or tenant headers required.
 */
export async function fetchTenantIdForHost(host: string): Promise<string | null> {
  const h = host.trim();
  if (!h) {
    return null;
  }
  const url = `${API_BASE_URL}${PUBLIC_HOST_RESOLVE_PATH}?host=${encodeURIComponent(h)}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { tenantId?: unknown };
    const id = typeof payload.tenantId === "string" ? payload.tenantId.trim() : "";
    return id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

export type RoleSummary = {
  id?: string;
  key?: string;
  name?: string;
};

export type MeResponse = {
  id: string;
  name: string;
  email: string;
  status: string;
  branchId?: string;
  role?: RoleSummary;
  permissions?: string[];
};

export type UserRecord = MeResponse;

export type RoleRecord = {
  id: string;
  key: string;
  name: string;
};

export type ItemSummaryRecord = {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  variantName?: string;
  variantOfItemId?: string;
  categoryId?: string | null;
  /** Display name for {@link categoryId} when provided by the list endpoint. */
  categoryName?: string | null;
  imageKey?: string | null;
  /** HTTPS URL for list thumbnails (from API: cover or first gallery image). */
  thumbnailUrl?: string | null;
  active?: boolean;
  /** When true, row only groups option SKUs (full-tree catalog). Omitted when listing with catalogScope SKUS_ONLY. */
  groupLabelOnly?: boolean;
  /** When true, item may appear in the public storefront catalog (Phase 15). */
  webPublished?: boolean;
  /**
   * On-hand at the branch when `branchId` was sent with the list request; otherwise omitted.
   */
  stockQty?: number | string | null;
};

/** Resolved HTTPS URL for catalog lists / quick sale (prefers {@link ItemSummaryRecord.thumbnailUrl}). */
export function itemListThumbnailUrl(row: ItemSummaryRecord): string | null {
  const thumb = row.thumbnailUrl?.trim();
  if (thumb) {
    return thumb;
  }
  const key = row.imageKey?.trim();
  if (key?.startsWith("http")) {
    return key;
  }
  return null;
}

export type ItemImageRecord = {
  id: string;
  s3Key?: string | null;
  secureUrl?: string | null;
  publicId?: string | null;
  provider?: string | null;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
  contentType?: string | null;
  altText?: string | null;
  bytes?: number | null;
  format?: string | null;
  assetSignature?: string | null;
  predominantColorHex?: string | null;
  phash?: string | null;
  createdAt?: string;
};

export type ItemDetailRecord = ItemSummaryRecord & {
  description?: string;
  itemTypeId?: string;
  categoryId?: string;
  unitType?: string;
  isWeighed?: boolean;
  isSellable?: boolean;
  isStocked?: boolean;
  /** On-hand quantity when returned by item detail API (Phase 1+). */
  currentStock?: number | string | null;
  bundleQty?: number | null;
  bundlePrice?: number | string | null;
  buyingPrice?: number | string | null;
  bundleName?: string | null;
  minStockLevel?: number | string | null;
  reorderLevel?: number | string | null;
  reorderQty?: number | string | null;
  imageKey?: string | null;
  images?: ItemImageRecord[];
  variants?: ItemSummaryRecord[];
};

export type ItemTypeRecord = {
  id: string;
  key: string;
  label: string;
};

export type CategorySupplierSummaryRecord = {
  supplierId: string;
  supplierName: string;
  sortOrder: number;
  primary?: boolean;
};

export type CategoryTaxSummaryRecord = {
  id: string;
  name: string;
  ratePercent: number | string;
  inclusive: boolean;
};

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  position: number;
  icon: string | null;
  parentId: string | null;
  active: boolean;
  description?: string | null;
  defaultMarkupPct?: number | string | null;
  defaultTaxRateId?: string | null;
  defaultTaxRate?: CategoryTaxSummaryRecord | null;
  imageKey: string | null;
  thumbnailUrl: string | null;
  linkedSuppliers: CategorySupplierSummaryRecord[];
};

export type CategoryTreeNodeRecord = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
  depth: number;
  active: boolean;
  thumbnailUrl: string | null;
  description: string;
  childCount: number;
  children: CategoryTreeNodeRecord[];
};

export type CategoryLinkedPriceRuleRecord = {
  ruleId: string;
  ruleName: string;
  precedence: number;
};

export type CreateCategoryPayload = {
  name: string;
  parentId?: string;
  icon?: string;
  position?: number;
  description?: string;
  defaultMarkupPct?: number | string;
  defaultTaxRateId?: string;
};

export type PatchCategoryPayload = {
  name?: string;
  slug?: string;
  parentId?: string;
  /** Clears parent (top-level category). Takes precedence over {@link parentId}. */
  root?: boolean;
  active?: boolean;
  position?: number;
  icon?: string;
  description?: string;
  clearDescription?: boolean;
  defaultMarkupPct?: number | string;
  clearDefaultMarkup?: boolean;
  defaultTaxRateId?: string;
  clearDefaultTaxRate?: boolean;
};

export type StorefrontSettingsRecord = {
  enabled: boolean;
  catalogBranchId?: string | null;
  label?: string | null;
  announcement?: string | null;
  featuredItemIds: string[];
};

export type BrandingRecord = {
  displayName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
};

export type BusinessRecord = {
  id?: string;
  name: string;
  slug?: string;
  currency?: string;
  countryCode?: string;
  timezone?: string;
  active?: boolean;
  subscriptionTier?: string;
  storefront?: StorefrontSettingsRecord;
  branding?: BrandingRecord;
  /**
   * Hostname of the active primary domain mapping, when one is set. The login
   * page prefers this for cross-origin handoff so a tenant lands on its chosen
   * primary host instead of the slug-derived `{slug}.{platform}` fallback.
   */
  primaryDomain?: string | null;
};

export type BranchRecord = {
  id: string;
  businessId: string;
  name: string;
  address?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateBranchPayload = {
  name: string;
  address?: string;
};

export type PatchBranchPayload = {
  name?: string;
  address?: string;
  active?: boolean;
};

export type UserListFilters = {
  status?: string;
  roleId?: string;
  branchId?: string;
};

export type StorefrontPatchPayload = {
  enabled?: boolean;
  catalogBranchId?: string | null;
  label?: string | null;
  announcement?: string | null;
  featuredItemIds?: string[] | null;
};

export type PatchBusinessPayload = {
  name?: string;
  subscriptionTier?: string;
  active?: boolean;
  storefront?: StorefrontPatchPayload;
};

export type BrandingPatchPayload = {
  displayName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  roleId: string;
  pin?: string;
  password?: string;
  status?: string;
  branchId?: string;
  phone?: string;
};

export type PatchUserPayload = {
  name?: string;
  phone?: string;
  branchId?: string;
  status?: string;
};

export type CreateItemPayload = {
  name: string;
  /** Omit or leave empty to let the server assign the next numeric SKU. */
  sku?: string;
  itemTypeId: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
};

export type SuggestedSkuResponse = {
  suggestedSku: string;
};

/** Body returned from POST /api/v1/items (201). */
export type ItemCreateResponse = {
  id: string;
  name: string;
  sku: string;
  active?: boolean;
};

export type AddItemSupplierLinkPayload = {
  supplierId: string;
  supplierSku?: string;
  defaultCostPrice?: number;
  setPrimary?: boolean;
};

export type PatchItemPayload = {
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  active?: boolean;
  webPublished?: boolean;
  bundlePrice?: number;
  bundleQty?: number;
  buyingPrice?: number;
  bundleName?: string;
  imageKey?: string;
  categoryId?: string;
  minStockLevel?: number;
  reorderLevel?: number;
  reorderQty?: number;
};

/** Response from GET /api/v1/items/{id}/supplier-links */
export type ItemSupplierLinkRecord = {
  id: string;
  supplierId: string;
  supplierName: string;
  primary: boolean;
  supplierSku?: string | null;
  defaultCostPrice?: number | string | null;
  active: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};

/** Response from GET /api/v1/suppliers/{id}/item-links */
export type SupplierItemLinkRecord = {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  barcode?: string | null;
  currentStock?: number | string | null;
  primary: boolean;
  supplierSku?: string | null;
  defaultCostPrice?: number | string | null;
  active: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateVariantPayload = {
  /** Omit or leave empty to let the server assign the next numeric SKU. */
  sku?: string;
  variantName: string;
  name?: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  aisleId?: string;
  unitType?: string;
  isWeighed?: boolean;
  isSellable?: boolean;
  isStocked?: boolean;
  minStockLevel?: number;
  reorderLevel?: number;
  reorderQty?: number;
  imageKey?: string;
};

export type InventoryMutationResponseRecord = {
  journalEntryId?: string | null;
  stockMovementId?: string | null;
  inventoryBatchId?: string | null;
};

const IDEMPOTENCY_METHODS: RequestMethod[] = ["POST", "PATCH"];

function defaultTenantIdReader(): string | null {
  if (typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem(STORAGE_KEYS.tenantId);
    if (stored?.trim()) {
      return stored.trim();
    }
  }
  if (PUBLIC_TENANT_ID.length > 0) {
    return PUBLIC_TENANT_ID;
  }
  return null;
}

export function buildRequestHeaders(
  requiresAuth: boolean,
  accessToken?: string,
  method: RequestMethod = "GET",
  idempotencyKeyFactory: () => string = nextIdempotencyKey,
  tenantHostReader: () => string | null = () => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.sessionStorage.getItem(STORAGE_KEYS.tenantHost);
  },
  tenantIdReader: () => string | null = defaultTenantIdReader,
): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (requiresAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (IDEMPOTENCY_METHODS.includes(method)) {
    headers["Idempotency-Key"] = idempotencyKeyFactory();
  }

  const tenantHost = tenantHostReader();
  if (tenantHost) {
    headers["X-Tenant-Host"] = tenantHost;
  }

  const tenantId = tenantIdReader();
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }

  return headers;
}

export function shouldAttemptRefresh(problemCode?: string): boolean {
  return problemCode === ERROR_CODES.tokenExpired;
}

function getNetworkErrorMessage(): string {
  const via =
    API_BASE_URL.length > 0
      ? API_BASE_URL
      : "this app’s origin (configure BACKEND_ORIGIN for the Next.js proxy)";
  return `Cannot reach API at ${via}. Start the backend, set BACKEND_ORIGIN on Next.js, or set NEXT_PUBLIC_API_BROWSER_DIRECT=true with NEXT_PUBLIC_API_BASE_URL for direct (CORS) API calls.`;
}

async function tryRefreshToken(): Promise<boolean> {
  const session = getSessionTokens();
  if (!session) {
    return false;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_ROUTES.refresh}`, {
      method: "POST",
      headers: buildRequestHeaders(false, undefined, "POST"),
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
  } catch {
    throw new Error(getNetworkErrorMessage());
  }

  if (!response.ok) {
    clearSessionTokens();
    return false;
  }

  const payload = (await response.json()) as LoginResponse;
  if (!payload.accessToken || !payload.refreshToken) {
    clearSessionTokens();
    return false;
  }

  setSessionTokens({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  });

  return true;
}

function parseList<T>(payload: unknown): T[] {
  return extractPageContent<T>(payload);
}

async function request<T>(
  path: string,
  {
    method = "GET",
    body,
    requiresAuth = true,
    idempotencyKey: explicitIdempotencyKey,
  }: RequestOptions = {},
): Promise<T> {
  const execute = async () => {
    const session = requiresAuth ? getSessionTokens() : null;
    const headersInit = buildRequestHeaders(requiresAuth, session?.accessToken, method);
    const headers = new Headers(headersInit);
    const idem = explicitIdempotencyKey?.trim();
    if (idem && IDEMPOTENCY_METHODS.includes(method)) {
      headers.set("Idempotency-Key", idem);
    }
    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error(getNetworkErrorMessage());
    }
  };

  let response = await execute();
  if (requiresAuth && response.status === 401) {
    const payload = await response.clone().json().catch(() => ({}));
    const problem = parseProblem(payload);
    const shouldRefresh = shouldAttemptRefresh(problem?.code);
    if (!shouldRefresh) {
      const message = formatApiProblemMessage(payload);
      if (problem?.title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
        signOutClientAndRedirectToLogin();
        throw new ApiRequestError(message, response.status, payload);
      }
      failRequest(response.status, payload);
    }
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await execute();
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const problem = parseProblem(payload);
    if (
      requiresAuth &&
      response.status === 401 &&
      problem?.title === PROBLEM_TITLES.invalidOrExpiredAccessToken
    ) {
      signOutClientAndRedirectToLogin();
      throw new ApiRequestError(formatApiProblemMessage(payload), response.status, payload);
    }
    failRequest(response.status, payload);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

async function requestMultipartJson<T>(path: string, form: FormData): Promise<T> {
  const execute = async () => {
    const session = getSessionTokens();
    const headersInit = buildRequestHeaders(true, session?.accessToken, "POST");
    const headers = new Headers(headersInit);
    headers.delete("Content-Type");
    return fetch(`${API_BASE_URL}${path}`, { method: "POST", headers, body: form });
  };

  let response = await execute();
  if (response.status === 401) {
    const payload = await response.clone().json().catch(() => ({}));
    const problem = parseProblem(payload);
    if (shouldAttemptRefresh(problem?.code) && (await tryRefreshToken())) {
      response = await execute();
    } else {
      const message = formatApiProblemMessage(payload);
      if (problem?.title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
        signOutClientAndRedirectToLogin();
        throw new ApiRequestError(message, response.status, payload);
      }
      failRequest(response.status, payload);
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const problem = parseProblem(payload);
    if (problem?.title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
      signOutClientAndRedirectToLogin();
      throw new ApiRequestError(formatApiProblemMessage(payload), response.status, payload);
    }
    failRequest(response.status, payload);
  }

  return (await response.json()) as T;
}

export type CsvImportLineErrorRecord = { line: number; message: string };

export type JsonImportResponse = {
  dryRun: boolean;
  rowsParsed: number;
  errors: CsvImportLineErrorRecord[];
  rowsCommitted: number | null;
};

/** @deprecated Use JsonImportResponse; kept for callers that still reference the old name. */
export type LegacyProductImportResponse = JsonImportResponse;

function isJsonImportPayload(v: unknown): v is JsonImportResponse {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v as Record<string, unknown>;
  return typeof o.rowsParsed === "number" && Array.isArray(o.errors);
}

async function postIntegrationsJsonImport(
  relativePath: string,
  file: File,
  dryRun: boolean,
  extraFields?: Record<string, string | undefined>,
): Promise<JsonImportResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("dryRun", String(dryRun));
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      if (v != null && String(v).trim() !== "") {
        form.append(k, String(v).trim());
      }
    }
  }

  const execute = async () => {
    const session = getSessionTokens();
    const headersInit = buildRequestHeaders(true, session?.accessToken, "POST");
    const headers = new Headers(headersInit);
    headers.delete("Content-Type");
    return fetch(`${API_BASE_URL}/api/v1/integrations/imports/${relativePath}`, {
      method: "POST",
      headers,
      body: form,
    });
  };

  let response = await execute();
  if (response.status === 401) {
    const payload = await response.clone().json().catch(() => ({}));
    const problem = parseProblem(payload);
    if (shouldAttemptRefresh(problem?.code) && (await tryRefreshToken())) {
      response = await execute();
    } else {
      const message = formatApiProblemMessage(payload);
      if (problem?.title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
        signOutClientAndRedirectToLogin();
        throw new ApiRequestError(message, response.status, payload);
      }
      failRequest(response.status, payload);
    }
  }

  const payload: unknown = await response.json().catch(() => null);
  if (isJsonImportPayload(payload)) {
    return payload;
  }
  if (!response.ok) {
    failRequest(response.status, payload ?? {});
  }
  throw new ApiRequestError("Unexpected response from import endpoint", response.status, payload);
}

/**
 * Multipart JSON product import (legacy export schema). Returns validation errors in the body even on HTTP 400.
 */
export async function postLegacyProductJsonImport(
  file: File,
  opts: { dryRun: boolean; branchId?: string },
): Promise<JsonImportResponse> {
  return postIntegrationsJsonImport("legacy-products", file, opts.dryRun, {
    branchId: opts.branchId?.trim() || undefined,
  });
}

/**
 * Multipart JSON supplier import (legacy export). Same response shape as {@link postLegacyProductJsonImport}.
 */
export async function postLegacySupplierJsonImport(
  file: File,
  opts: { dryRun: boolean },
): Promise<JsonImportResponse> {
  return postIntegrationsJsonImport("legacy-suppliers", file, opts.dryRun);
}

/**
 * Legacy buying prices: `item_id`, nullable `supplier_id`, `price`, `effective_from`, optional `notes`.
 * Export fields `id`, `set_by`, `created_at` are ignored (setter = signed-in user).
 */
export async function postLegacyBuyingPriceJsonImport(
  file: File,
  opts: { dryRun: boolean },
): Promise<JsonImportResponse> {
  return postIntegrationsJsonImport("legacy-buying-prices", file, opts.dryRun);
}

/** Legacy selling price rows: `item_id`, `price`, `effective_from`, optional `branch_id`. */
export async function postLegacySellingPriceJsonImport(
  file: File,
  opts: { dryRun: boolean },
): Promise<JsonImportResponse> {
  return postIntegrationsJsonImport("legacy-selling-prices", file, opts.dryRun);
}

async function requestBinary(path: string): Promise<Blob> {
  const execute = async () => {
    const session = getSessionTokens();
    const headersInit = buildRequestHeaders(true, session?.accessToken, "GET");
    return fetch(`${API_BASE_URL}${path}`, { method: "GET", headers: headersInit });
  };

  let response = await execute();
  if (response.status === 401) {
    const payload = await response.clone().json().catch(() => ({}));
    const problem = parseProblem(payload);
    if (shouldAttemptRefresh(problem?.code) && (await tryRefreshToken())) {
      response = await execute();
    } else {
      const message = formatApiProblemMessage(payload);
      if (problem?.title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
        signOutClientAndRedirectToLogin();
        throw new ApiRequestError(message, response.status, payload);
      }
      failRequest(response.status, payload);
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const problem = parseProblem(payload);
    if (problem?.title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
      signOutClientAndRedirectToLogin();
      throw new ApiRequestError(formatApiProblemMessage(payload), response.status, payload);
    }
    failRequest(response.status, payload);
  }

  return response.blob();
}

export async function fetchSaleReceiptPdf(saleId: string): Promise<Blob> {
  return requestBinary(`/api/v1/sales/${encodeURIComponent(saleId.trim())}/receipt.pdf`);
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<void> {
  const payload = await request<LoginResponse>(API_ROUTES.login, {
    method: "POST",
    body: { email, password },
    requiresAuth: false,
  });
  setSessionTokens({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  });
}

export async function loginWithPin(
  email: string,
  pin: string,
  branchId: string,
): Promise<void> {
  const payload = await request<LoginResponse>(API_ROUTES.loginPin, {
    method: "POST",
    body: { email, pin, branchId },
    requiresAuth: false,
  });
  setSessionTokens({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  });
}

export type RegisterResponse = {
  userId: string;
  email: string;
  status: string;
  /** Present when backend sets APP_AUTH_RETURN_VERIFICATION_LINK=true (invited signups only). */
  verificationUrl?: string | null;
};

export type ResendVerificationResult = {
  verificationUrl?: string;
};

export async function registerAccount(
  name: string,
  email: string,
  password: string,
  opts?: { staffInviteToken?: string },
): Promise<RegisterResponse> {
  const body: Record<string, unknown> = { name, email, password };
  const token = opts?.staffInviteToken?.trim();
  if (token) {
    body.staffInviteToken = token;
  }
  return request<RegisterResponse>(API_ROUTES.register, {
    method: "POST",
    body,
    requiresAuth: false,
  });
}

export async function verifyEmailAddress(token: string): Promise<void> {
  await request(API_ROUTES.verifyEmail, {
    method: "POST",
    body: { token },
    requiresAuth: false,
  });
}

export async function resendVerificationEmail(email: string): Promise<ResendVerificationResult> {
  const headersInit = buildRequestHeaders(false, undefined, "POST");
  const headers = new Headers(headersInit);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_ROUTES.resendVerification}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email }),
    });
  } catch {
    throw new Error(getNetworkErrorMessage());
  }
  if (response.status === 204) {
    return {};
  }
  if (response.ok && response.status === 200) {
    const payload = (await response.json()) as { verificationUrl?: unknown };
    const verificationUrl =
      typeof payload.verificationUrl === "string" ? payload.verificationUrl : undefined;
    return { verificationUrl };
  }
  const payload = await response.json().catch(() => ({}));
  throw new Error(formatApiProblemMessage(payload));
}

export async function requestPasswordReset(email: string): Promise<void> {
  await request(API_ROUTES.passwordForgot, {
    method: "POST",
    body: { email },
    requiresAuth: false,
  });
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  await request(API_ROUTES.passwordReset, {
    method: "POST",
    body: { token, newPassword },
    requiresAuth: false,
  });
}

/**
 * Revokes the current refresh session server-side when possible, then clears local tokens.
 */
export async function logoutRemote(): Promise<void> {
  const session = getSessionTokens();
  if (session) {
    try {
      await fetch(`${API_BASE_URL}${API_ROUTES.logout}`, {
        method: "POST",
        headers: buildRequestHeaders(true, session.accessToken, "POST"),
      });
    } catch {
      /* network errors — still clear client */
    }
  }
  clearSessionTokens();
}

export async function fetchMe(): Promise<MeResponse> {
  return request<MeResponse>(API_ROUTES.me);
}

export type ShopperBalancesPayload = {
  walletBalance?: number | string | null;
  balanceOwed?: number | string | null;
  creditLimit?: number | string | null;
  creditAvailable?: number | string | null;
  loyaltyPoints?: number;
};

export type ShopperPickupOrderRow = {
  id: string;
  status?: string;
  grandTotal?: number | string | null;
  currency?: string;
  customerName?: string;
  customerPhone?: string;
  catalogBranchId?: string;
  catalogBranchName?: string;
  createdAt?: string;
};

export type ShopperLedgerRow = {
  occurredAt?: string;
  kind?: string;
  memo?: string;
  debit?: number | string | null;
  credit?: number | string | null;
};

export type ShopperAccountOverview = {
  email: string;
  linkedStorefrontProfile: boolean;
  customerDirectoryName: string;
  balances: ShopperBalancesPayload;
  pickupOrders: ShopperPickupOrderRow[];
  pickupOrdersTotal?: number;
  pickupOrdersPage?: number;
  pickupOrdersPageSize?: number;
  pickupOrdersTotalPages?: number;
  recentLedgerLines: ShopperLedgerRow[];
  ledgerLinesTotal?: number;
  ledgerTruncated?: boolean;
  loyaltyKesPerPoint?: number | string | null;
};

export type ShopperPickupOrderDetail = {
  id: string;
  cartId?: string;
  status?: string;
  grandTotal?: number | string | null;
  currency?: string;
  catalogBranchId?: string;
  catalogBranchName?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  notes?: string | null;
  createdAt?: string;
  lines?: {
    itemId?: string;
    itemName?: string;
    variantName?: string | null;
    quantity?: number | string;
    unitPrice?: number | string | null;
    lineTotal?: number | string | null;
    lineIndex?: number;
  }[];
};

export async function fetchShopperAccountOverview(
  page = 0,
  size = 24,
): Promise<ShopperAccountOverview> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  return request<ShopperAccountOverview>(`${API_ROUTES.shopperHub}?${qs.toString()}`, {
    requiresAuth: true,
  });
}

export async function fetchShopperPickupOrderDetail(orderId: string): Promise<ShopperPickupOrderDetail> {
  const id = encodeURIComponent(orderId.trim());
  return request<ShopperPickupOrderDetail>(`${API_ROUTES.shopperHub}/orders/${id}`, {
    requiresAuth: true,
  });
}

export async function fetchBusiness(): Promise<BusinessRecord> {
  return request<BusinessRecord>(API_ROUTES.businessMe);
}

export async function updateBusiness(body: PatchBusinessPayload): Promise<void> {
  await request(API_ROUTES.businessMe, { method: "PATCH", body });
}

const MY_BRANDING_PATH = "/api/v1/businesses/me/branding";

export async function updateMyBranding(
  body: BrandingPatchPayload,
): Promise<BusinessRecord> {
  return request<BusinessRecord>(MY_BRANDING_PATH, { method: "PATCH", body });
}

export async function uploadMyBrandingLogo(
  file: File,
): Promise<BusinessRecord> {
  const form = new FormData();
  form.append("file", file);
  return requestMultipartJson<BusinessRecord>(`${MY_BRANDING_PATH}/logo`, form);
}

export async function clearMyBrandingLogo(): Promise<BusinessRecord> {
  return request<BusinessRecord>(`${MY_BRANDING_PATH}/logo`, {
    method: "DELETE",
  });
}

export async function uploadMyBrandingFavicon(file: File): Promise<BusinessRecord> {
  const form = new FormData();
  form.append("file", file);
  return requestMultipartJson<BusinessRecord>(`${MY_BRANDING_PATH}/favicon`, form);
}

export async function clearMyBrandingFavicon(): Promise<BusinessRecord> {
  return request<BusinessRecord>(`${MY_BRANDING_PATH}/favicon`, {
    method: "DELETE",
  });
}

export type DomainRecord = {
  id: string;
  businessId: string;
  domain: string;
  primary: boolean;
  active: boolean;
};

const MY_DOMAINS_PATH = "/api/v1/businesses/me/domains";

export async function fetchMyDomains(): Promise<DomainRecord[]> {
  return request<DomainRecord[]>(MY_DOMAINS_PATH);
}

export async function addMyDomain(domain: string): Promise<DomainRecord> {
  return request<DomainRecord>(MY_DOMAINS_PATH, {
    method: "POST",
    body: { domain },
  });
}

export async function setMyPrimaryDomain(domainId: string): Promise<DomainRecord> {
  return request<DomainRecord>(
    `${MY_DOMAINS_PATH}/${encodeURIComponent(domainId.trim())}/primary`,
    { method: "POST" },
  );
}

export async function deleteMyDomain(domainId: string): Promise<void> {
  await request(`${MY_DOMAINS_PATH}/${encodeURIComponent(domainId.trim())}`, {
    method: "DELETE",
  });
}

function usersListQuery(filters?: UserListFilters): string {
  const params = new URLSearchParams(DEFAULT_PAGE_QUERY);
  const status = filters?.status?.trim();
  if (status) {
    params.set("status", status);
  }
  const roleId = filters?.roleId?.trim();
  if (roleId) {
    params.set("roleId", roleId);
  }
  const branchId = filters?.branchId?.trim();
  if (branchId) {
    params.set("branchId", branchId);
  }
  return params.toString();
}

export async function fetchUsers(filters?: UserListFilters): Promise<UserRecord[]> {
  const path = `${API_ROUTES.users}?${usersListQuery(filters)}`;
  const payload = await request<unknown>(path);
  return parseList(payload);
}

export async function fetchBranches(): Promise<BranchRecord[]> {
  const path = `${API_ROUTES.branches}?${DEFAULT_PAGE_QUERY}`;
  const payload = await request<unknown>(path);
  return parseList(payload);
}

export async function createBranch(body: CreateBranchPayload): Promise<void> {
  await request(API_ROUTES.branches, { method: "POST", body });
}

export async function patchBranch(
  branchId: string,
  body: PatchBranchPayload,
): Promise<void> {
  await request(`${API_ROUTES.branches}/${branchId}`, { method: "PATCH", body });
}

export async function fetchRoles(): Promise<RoleRecord[]> {
  const payload = await request<unknown>(API_ROUTES.roles);
  return parseList(payload);
}

export async function fetchItemTypes(): Promise<ItemTypeRecord[]> {
  return request<ItemTypeRecord[]>(API_ROUTES.itemTypes);
}

export async function fetchCategories(): Promise<CategoryRecord[]> {
  return request<CategoryRecord[]>(API_ROUTES.categories);
}

export async function fetchCategoryTree(): Promise<CategoryTreeNodeRecord[]> {
  return request<CategoryTreeNodeRecord[]>(`${API_ROUTES.categories}/tree`);
}

export async function fetchCategoryChildren(categoryId: string): Promise<CategoryRecord[]> {
  return request<CategoryRecord[]>(
    `${API_ROUTES.categories}/${encodeURIComponent(categoryId.trim())}/children`,
  );
}

export async function fetchCategoryPriceRules(categoryId: string): Promise<CategoryLinkedPriceRuleRecord[]> {
  return request<CategoryLinkedPriceRuleRecord[]>(
    `/api/v1/categories/${encodeURIComponent(categoryId.trim())}/price-rules`,
  );
}

export async function postCategoryPriceRule(
  categoryId: string,
  body: { ruleId: string; precedence?: number },
): Promise<CategoryLinkedPriceRuleRecord> {
  return request<CategoryLinkedPriceRuleRecord>(
    `/api/v1/categories/${encodeURIComponent(categoryId.trim())}/price-rules`,
    { method: "POST", body },
  );
}

export async function deleteCategoryPriceRule(categoryId: string, ruleId: string): Promise<void> {
  await request(
    `/api/v1/categories/${encodeURIComponent(categoryId.trim())}/price-rules/${encodeURIComponent(ruleId.trim())}`,
    { method: "DELETE" },
  );
}

export async function createCategory(
  payload: CreateCategoryPayload,
): Promise<CategoryRecord> {
  return request<CategoryRecord>(API_ROUTES.categories, { method: "POST", body: payload });
}

export async function patchCategory(
  categoryId: string,
  body: PatchCategoryPayload,
): Promise<CategoryRecord> {
  return request<CategoryRecord>(`${API_ROUTES.categories}/${categoryId}`, {
    method: "PATCH",
    body,
  });
}

export async function fetchCategoryImages(categoryId: string): Promise<ItemImageRecord[]> {
  return request<ItemImageRecord[]>(
    `/api/v1/categories/${encodeURIComponent(categoryId.trim())}/images`,
  );
}

export async function uploadCategoryImageToCloudinary(
  categoryId: string,
  file: File,
  opts?: { altText?: string; primary?: boolean },
): Promise<ItemImageRecord> {
  const form = new FormData();
  form.append("file", file);
  if (opts?.altText?.trim()) {
    form.append("altText", opts.altText.trim());
  }
  if (opts?.primary === false) {
    form.append("primary", "false");
  }
  return requestMultipartJson<ItemImageRecord>(
    `/api/v1/categories/${encodeURIComponent(categoryId.trim())}/images/upload`,
    form,
  );
}

export async function deleteCategoryImage(categoryId: string, imageId: string): Promise<void> {
  await request(
    `/api/v1/categories/${encodeURIComponent(categoryId.trim())}/images/${encodeURIComponent(imageId.trim())}`,
    { method: "DELETE" },
  );
}

export async function postCategorySupplierLink(
  categoryId: string,
  body: { supplierId: string; sortOrder?: number; primary?: boolean },
): Promise<CategorySupplierSummaryRecord> {
  return request<CategorySupplierSummaryRecord>(
    `/api/v1/categories/${encodeURIComponent(categoryId.trim())}/supplier-links`,
    { method: "POST", body },
  );
}

export async function patchCategorySupplierLink(
  categoryId: string,
  supplierId: string,
  body: { primary: boolean },
): Promise<CategorySupplierSummaryRecord> {
  return request<CategorySupplierSummaryRecord>(
    `/api/v1/categories/${encodeURIComponent(categoryId.trim())}/supplier-links/${encodeURIComponent(supplierId.trim())}`,
    { method: "PATCH", body },
  );
}

export async function deleteCategorySupplierLink(categoryId: string, supplierId: string): Promise<void> {
  await request(
    `/api/v1/categories/${encodeURIComponent(categoryId.trim())}/supplier-links/${encodeURIComponent(supplierId.trim())}`,
    { method: "DELETE" },
  );
}

export async function createUser(payload: CreateUserPayload): Promise<void> {
  await request(API_ROUTES.users, { method: "POST", body: payload });
}

export async function updateUser(
  userId: string,
  body: PatchUserPayload,
): Promise<void> {
  await request(`${API_ROUTES.users}/${userId}`, { method: "PATCH", body });
}

export async function assignUserRole(userId: string, roleId: string): Promise<void> {
  await request(`${API_ROUTES.users}/${userId}/role`, {
    method: "POST",
    body: { roleId },
  });
}

export async function deactivateUser(userId: string): Promise<void> {
  await request(`${API_ROUTES.users}/${userId}/deactivate`, { method: "POST" });
}

export type CatalogListScope = "ALL" | "PARENTS_ONLY" | "VARIANTS_ONLY" | "SKUS_ONLY";

export type FetchItemsOpts = {
  categoryId?: string;
  includeCategoryDescendants?: boolean;
  catalogScope?: CatalogListScope;
  barcode?: string;
  noBarcode?: boolean;
  includeInactive?: boolean;
  page?: number;
  size?: number;
  /** When set, `stockQty` on each row is on-hand inventory at this branch (from active batches). */
  branchId?: string;
  /** When set, omits items that already have a non-deleted supplier link to this supplier (e.g. supplier catalog picker). */
  excludeLinkedSupplierId?: string;
  /** Spring Data sort tuples, e.g. `[{ property: 'name', direction: 'asc' }]`. */
  sort?: Array<{ property: string; direction: "asc" | "desc" }>;
};

export type ItemsPageResult<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
  first: boolean;
};

export async function fetchItemsPage(
  search: string | undefined,
  opts?: FetchItemsOpts,
): Promise<ItemsPageResult<ItemSummaryRecord>> {
  const params = new URLSearchParams();
  params.set("page", String(opts?.page ?? 0));
  params.set("size", String(opts?.size ?? 100));
  if (search?.trim()) {
    params.set("search", search.trim());
  }
  if (opts?.catalogScope && opts.catalogScope !== "ALL") {
    params.set("catalogScope", opts.catalogScope);
  }
  if (opts?.categoryId?.trim()) {
    params.set("categoryId", opts.categoryId.trim());
    if (opts.includeCategoryDescendants) {
      params.set("includeCategoryDescendants", "true");
    }
  }
  if (opts?.barcode?.trim()) {
    params.set("barcode", opts.barcode.trim());
  }
  if (opts?.noBarcode) {
    params.set("noBarcode", "true");
  }
  if (opts?.includeInactive) {
    params.set("includeInactive", "true");
  }
  const exSup = opts?.excludeLinkedSupplierId?.trim();
  if (exSup) {
    params.set("excludeLinkedSupplierId", exSup);
  }
  const stockBr = opts?.branchId?.trim();
  if (stockBr) {
    params.set("branchId", stockBr);
  }
  for (const s of opts?.sort ?? []) {
    const p = s.property?.trim();
    if (!p) {
      continue;
    }
    const d = s.direction === "desc" ? "desc" : "asc";
    params.append("sort", `${p},${d}`);
  }
  const path = `${API_ROUTES.items}?${params.toString()}`;
  const raw = await request<unknown>(path);
  const content = extractPageContent<ItemSummaryRecord>(raw);
  const meta = extractSpringPageMeta(raw);
  if (!meta) {
    return {
      content,
      totalElements: content.length,
      totalPages: content.length > 0 ? 1 : 0,
      number: 0,
      size: content.length,
      last: true,
      first: true,
    };
  }
  return { content, ...meta };
}

export async function fetchItems(search?: string, opts?: FetchItemsOpts): Promise<ItemSummaryRecord[]> {
  const page = await fetchItemsPage(search?.trim() || undefined, { ...opts, page: 0, size: 100 });
  return page.content;
}

export async function fetchItemById(itemId: string): Promise<ItemDetailRecord> {
  return request<ItemDetailRecord>(`${API_ROUTES.items}/${itemId}`);
}

export async function fetchItemSupplierLinks(
  itemId: string,
): Promise<ItemSupplierLinkRecord[]> {
  return request<ItemSupplierLinkRecord[]>(
    `${API_ROUTES.items}/${itemId}/supplier-links`,
  );
}

export async function fetchSuggestedNextSku(opts?: {
  /** Category chosen for a new parent — drives SKU prefix from category slug. */
  categoryId?: string;
  /** Parent item when adding a variant — drives `{parentSku}-{option}` pattern. */
  parentItemId?: string;
  /** Option label for variant — included in the suggested segment. */
  variantName?: string;
}): Promise<SuggestedSkuResponse> {
  const params = new URLSearchParams();
  const categoryId = opts?.categoryId?.trim();
  const parentItemId = opts?.parentItemId?.trim();
  const variantName = opts?.variantName?.trim();
  if (categoryId) {
    params.set("categoryId", categoryId);
  }
  if (parentItemId) {
    params.set("parentItemId", parentItemId);
  }
  if (variantName) {
    params.set("variantName", variantName);
  }
  const q = params.toString();
  const path = q.length > 0 ? `${API_ROUTES.items}/next-sku?${q}` : `${API_ROUTES.items}/next-sku`;
  return request<SuggestedSkuResponse>(path);
}

/** Drop whitespace-only sku so the server treats the field as omitted and can auto-allocate. */
function createPayloadWithoutBlankSku<T extends { sku?: string }>(body: T): T {
  const next = { ...body };
  if (next.sku !== undefined && next.sku.trim().length === 0) {
    delete next.sku;
  }
  return next;
}

export async function createItem(payload: CreateItemPayload): Promise<ItemCreateResponse> {
  return request<ItemCreateResponse>(API_ROUTES.items, {
    method: "POST",
    body: createPayloadWithoutBlankSku({ ...payload }),
  });
}

export async function fetchSupplierItemLinks(
  supplierId: string,
): Promise<SupplierItemLinkRecord[]> {
  return request<SupplierItemLinkRecord[]>(
    `/api/v1/suppliers/${encodeURIComponent(supplierId.trim())}/item-links`,
  );
}

export async function addItemSupplierLink(
  itemId: string,
  body: AddItemSupplierLinkPayload,
): Promise<void> {
  await request(`${API_ROUTES.items}/${itemId}/supplier-links`, { method: "POST", body });
}

export async function deleteItemSupplierLink(itemId: string, linkId: string): Promise<void> {
  await request(`${API_ROUTES.items}/${encodeURIComponent(itemId.trim())}/supplier-links/${encodeURIComponent(linkId.trim())}`, {
    method: "DELETE",
  });
}

export async function postItemSupplierLinkSetPrimary(itemId: string, linkId: string): Promise<void> {
  await request(
    `${API_ROUTES.items}/${encodeURIComponent(itemId.trim())}/supplier-links/${encodeURIComponent(linkId.trim())}/set-primary`,
    { method: "POST" },
  );
}

export type PatchItemSupplierLinkPayload = {
  supplierSku?: string;
  defaultCostPrice?: number;
};

export async function patchItemSupplierLink(
  itemId: string,
  linkId: string,
  body: PatchItemSupplierLinkPayload,
): Promise<ItemSupplierLinkRecord> {
  return request<ItemSupplierLinkRecord>(
    `${API_ROUTES.items}/${encodeURIComponent(itemId.trim())}/supplier-links/${encodeURIComponent(linkId.trim())}`,
    { method: "PATCH", body },
  );
}

export async function patchItem(
  itemId: string,
  body: PatchItemPayload,
): Promise<void> {
  await request(`${API_ROUTES.items}/${itemId}`, { method: "PATCH", body });
}

export async function uploadItemImageToCloudinary(
  itemId: string,
  file: File,
  opts?: { altText?: string; primary?: boolean },
): Promise<ItemImageRecord> {
  const form = new FormData();
  form.append("file", file);
  if (opts?.altText?.trim()) {
    form.append("altText", opts.altText.trim());
  }
  if (opts?.primary === false) {
    form.append("primary", "false");
  }
  return requestMultipartJson<ItemImageRecord>(
    `/api/v1/items/${encodeURIComponent(itemId.trim())}/images/upload`,
    form,
  );
}

export async function deleteItemImage(itemId: string, imageId: string): Promise<void> {
  await request(
    `/api/v1/items/${encodeURIComponent(itemId.trim())}/images/${encodeURIComponent(imageId.trim())}`,
    { method: "DELETE" },
  );
}

export async function deleteItem(
  itemId: string,
  cascadeVariants = false,
): Promise<void> {
  const q = cascadeVariants ? "?cascadeVariants=true" : "";
  await request(`${API_ROUTES.items}/${itemId}${q}`, { method: "DELETE" });
}

export async function createItemVariant(
  parentItemId: string,
  body: CreateVariantPayload,
): Promise<ItemCreateResponse> {
  return request<ItemCreateResponse>(`${API_ROUTES.items}/${parentItemId}/variants`, {
    method: "POST",
    body: createPayloadWithoutBlankSku({ ...body }),
  });
}

export async function postStockIncrease(body: {
  branchId: string;
  itemId: string;
  quantity: number | string;
  unitCost: number | string;
  notes?: string | null;
}): Promise<InventoryMutationResponseRecord> {
  const payload: Record<string, unknown> = {
    branchId: body.branchId.trim(),
    itemId: body.itemId.trim(),
    quantity: body.quantity,
    unitCost: body.unitCost,
  };
  if (body.notes?.trim()) {
    payload.notes = body.notes.trim();
  }
  return request<InventoryMutationResponseRecord>("/api/v1/inventory/stock-increase", {
    method: "POST",
    body: payload,
  });
}

export type SpendBySupplierCategoryRow = {
  supplierId: string;
  supplierName: string;
  categoryId: string;
  categoryName: string;
  spendTotal: number;
};

export type PriceCompetitivenessRow = {
  supplierInvoiceLineId: string;
  supplierInvoiceId: string;
  invoicingSupplierId: string;
  itemId: string;
  itemSku: string;
  paidUnitCost: number;
  primarySupplierId: string;
  primaryLastCostPrice: number | null;
  variancePercentVsPrimary: number | null;
  purchasedFromPrimarySupplier: boolean;
};

export type SingleSourceRiskRow = {
  itemId: string;
  sku: string;
  name: string;
  soleSupplierId: string;
  soleSupplierName: string;
};

function intelligenceDateQuery(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from?.trim()) {
    params.set("from", from.trim());
  }
  if (to?.trim()) {
    params.set("to", to.trim());
  }
  const q = params.toString();
  return q ? `?${q}` : "";
}

export async function fetchSpendBySupplierCategory(
  from?: string,
  to?: string,
): Promise<SpendBySupplierCategoryRow[]> {
  return request<SpendBySupplierCategoryRow[]>(
    `/api/v1/purchasing/intelligence/spend-by-supplier-category${intelligenceDateQuery(from, to)}`,
  );
}

export async function fetchPriceCompetitiveness(
  from?: string,
  to?: string,
): Promise<PriceCompetitivenessRow[]> {
  return request<PriceCompetitivenessRow[]>(
    `/api/v1/purchasing/intelligence/price-competitiveness${intelligenceDateQuery(from, to)}`,
  );
}

export async function fetchSingleSourceRisk(): Promise<SingleSourceRiskRow[]> {
  return request<SingleSourceRiskRow[]>(
    "/api/v1/purchasing/intelligence/single-source-risk",
  );
}

export type RevenueByCategoryRow = {
  categoryId: string;
  categoryName: string;
  netRevenue: number | string;
};

export async function fetchSalesRevenueByCategory(
  from?: string,
  to?: string,
): Promise<RevenueByCategoryRow[]> {
  return request<RevenueByCategoryRow[]>(
    `/api/v1/sales/intelligence/revenue-by-category${intelligenceDateQuery(from, to)}`,
  );
}

export type WebOrderSummary = {
  id: string;
  status: string;
  grandTotal: number | string;
  currency: string;
  customerName: string;
  customerPhone: string;
  catalogBranchId: string;
  catalogBranchName: string;
  createdAt: string;
};

export type WebOrderLineSnapshot = {
  itemId: string;
  itemName: string;
  variantName: string | null;
  quantity: number | string;
  unitPrice: number | string;
  lineTotal: number | string;
  lineIndex: number;
};

export type WebOrderDetail = {
  id: string;
  cartId: string;
  status: string;
  grandTotal: number | string;
  currency: string;
  catalogBranchId: string;
  catalogBranchName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  createdAt: string;
  lines: WebOrderLineSnapshot[];
};

export async function fetchWebOrders(page = 0, size = 50): Promise<WebOrderSummary[]> {
  const payload = await request<unknown>(`/api/v1/web-orders?page=${page}&size=${size}`);
  return extractPageContent<WebOrderSummary>(payload);
}

export async function fetchWebOrderDetail(orderId: string): Promise<WebOrderDetail> {
  return request<WebOrderDetail>(`/api/v1/web-orders/${encodeURIComponent(orderId.trim())}`);
}

export type ApAgingBuckets = {
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  daysOver90: number;
};

export type ApAgingTotalsResponse = {
  asOf: string;
  buckets: ApAgingBuckets;
  totalOpen: number;
  totalSupplierPrepaymentBalance: number;
};

export type BranchValuationLineRecord = {
  branchId: string;
  branchName: string;
  extensionValue: number | string;
};

export type InventoryValuationResponseRecord = {
  businessId: string;
  byBranch: BranchValuationLineRecord[];
  totalExtensionValue: number | string;
};

export async function fetchApAging(
  asOf?: string,
  supplierId?: string,
): Promise<ApAgingTotalsResponse> {
  const params = new URLSearchParams();
  if (asOf?.trim()) {
    params.set("asOf", asOf.trim());
  }
  if (supplierId?.trim()) {
    params.set("supplierId", supplierId.trim());
  }
  const q = params.toString();
  return request<ApAgingTotalsResponse>(
    `/api/v1/purchasing/ap-aging${q ? `?${q}` : ""}`,
  );
}

export async function fetchInventoryValuation(
  branchId?: string,
): Promise<InventoryValuationResponseRecord> {
  const params = new URLSearchParams();
  if (branchId?.trim()) {
    params.set("branchId", branchId.trim());
  }
  const q = params.toString();
  return request<InventoryValuationResponseRecord>(
    `/api/v1/inventory/valuation${q ? `?${q}` : ""}`,
  );
}

export type PostStockTransferLinePayload = {
  itemId: string;
  quantity: number | string;
};

export type PostStockTransferPayload = {
  fromBranchId: string;
  toBranchId: string;
  notes?: string | null;
  lines: PostStockTransferLinePayload[];
};

export type StockTransferCreatedRecord = {
  id: string;
  status: string;
};

export async function postStockTransfer(
  body: PostStockTransferPayload,
): Promise<StockTransferCreatedRecord> {
  return request<StockTransferCreatedRecord>("/api/v1/inventory/transfers", {
    method: "POST",
    body,
  });
}

export async function postCompleteStockTransfer(transferId: string): Promise<void> {
  await request(`/api/v1/inventory/transfers/${encodeURIComponent(transferId)}/complete`, {
    method: "POST",
  });
}

export type StockTakeLineRecord = {
  id: string;
  itemId: string;
  systemQtySnapshot: number | string;
  countedQty: number | string | null;
  note: string | null;
};

export type StockAdjustmentRequestRecord = {
  id: string;
  stockTakeLineId: string;
  itemId: string;
  varianceQty: number | string;
  systemQtySnapshot: number | string;
  countedQty: number | string;
  status: string;
};

export type StockTakeSessionRecord = {
  id: string;
  branchId: string;
  status: string;
  notes: string | null;
  closedAt: string | null;
  lines: StockTakeLineRecord[];
  adjustmentRequests: StockAdjustmentRequestRecord[];
};

export async function postStockTakeStart(body: {
  branchId: string;
  notes?: string | null;
}): Promise<StockTakeSessionRecord> {
  return request<StockTakeSessionRecord>("/api/v1/inventory/stock-take/sessions", {
    method: "POST",
    body,
  });
}

export async function fetchStockTakeSession(sessionId: string): Promise<StockTakeSessionRecord> {
  return request<StockTakeSessionRecord>(
    `/api/v1/inventory/stock-take/sessions/${encodeURIComponent(sessionId)}`,
  );
}

export async function patchStockTakeCounts(
  sessionId: string,
  lines: { lineId: string; countedQty: number | string }[],
): Promise<StockTakeSessionRecord> {
  return request<StockTakeSessionRecord>(
    `/api/v1/inventory/stock-take/sessions/${encodeURIComponent(sessionId)}/lines`,
    { method: "PATCH", body: { lines } },
  );
}

export async function postStockTakeClose(sessionId: string): Promise<StockTakeSessionRecord> {
  return request<StockTakeSessionRecord>(
    `/api/v1/inventory/stock-take/sessions/${encodeURIComponent(sessionId)}/close`,
    { method: "POST" },
  );
}

export async function postApproveStockAdjustment(
  sessionId: string,
  adjustmentRequestId: string,
  body?: { unitCost?: number | string } | null,
): Promise<void> {
  const hasCost = body?.unitCost != null && String(body.unitCost).trim() !== "";
  await request(
    `/api/v1/inventory/stock-take/sessions/${encodeURIComponent(sessionId)}/adjustment-requests/${encodeURIComponent(adjustmentRequestId)}/approve`,
    {
      method: "POST",
      body: hasCost ? { unitCost: body.unitCost } : undefined,
    },
  );
}

export async function postRejectStockAdjustment(
  sessionId: string,
  adjustmentRequestId: string,
  notes?: string | null,
): Promise<void> {
  await request(
    `/api/v1/inventory/stock-take/sessions/${encodeURIComponent(sessionId)}/adjustment-requests/${encodeURIComponent(adjustmentRequestId)}/reject`,
    {
      method: "POST",
      body: notes?.trim() ? { notes: notes.trim() } : {},
    },
  );
}

export type SellPriceSuggestionRecord = {
  latestUnitCost: number | string | null;
  marginPercent: number | string | null;
  ruleName: string | null;
  suggestedSellPrice: number | string | null;
  note: string | null;
  currentSellPrice: number | string | null;
};

/** Open-ended shelf price for POS (no cost / margin fields). */
export type CurrentSellingPriceRecord = {
  price: number | string | null;
};

export type PriceRuleRecord = {
  id: string;
  name: string;
  ruleType: string;
  paramsJson: string;
  active: boolean;
};

export type SellingPriceResponseRecord = {
  id: string;
  itemId: string;
  branchId: string | null;
  price: number | string;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export async function fetchSellPriceSuggestion(
  itemId: string,
  supplierId?: string,
  branchId?: string,
  unitCost?: number | null,
): Promise<SellPriceSuggestionRecord> {
  const params = new URLSearchParams({ itemId: itemId.trim() });
  if (supplierId?.trim()) {
    params.set("supplierId", supplierId.trim());
  }
  if (branchId?.trim()) {
    params.set("branchId", branchId.trim());
  }
  if (unitCost != null && Number.isFinite(unitCost) && unitCost > 0) {
    params.set("unitCost", String(unitCost));
  }
  return request<SellPriceSuggestionRecord>(`/api/v1/pricing/suggest/sell?${params.toString()}`);
}

export async function fetchCurrentSellingPrice(
  itemId: string,
  branchId?: string,
): Promise<CurrentSellingPriceRecord> {
  const params = new URLSearchParams({ itemId: itemId.trim() });
  if (branchId?.trim()) {
    params.set("branchId", branchId.trim());
  }
  return request<CurrentSellingPriceRecord>(
    `/api/v1/pricing/current-selling-price?${params.toString()}`,
  );
}

export async function fetchPriceRules(): Promise<PriceRuleRecord[]> {
  return request<PriceRuleRecord[]>("/api/v1/pricing/price-rules");
}

export type TaxRateRecord = {
  id: string;
  name: string;
  ratePercent: number | string;
  inclusive: boolean;
};

export async function fetchTaxRates(): Promise<TaxRateRecord[]> {
  return request<TaxRateRecord[]>("/api/v1/pricing/tax-rates");
}

export async function postPriceRule(body: {
  name: string;
  ruleType: string;
  paramsJson: string;
  active: boolean;
}): Promise<PriceRuleRecord> {
  return request<PriceRuleRecord>("/api/v1/pricing/price-rules", {
    method: "POST",
    body,
  });
}

export async function putPriceRule(
  ruleId: string,
  body: {
    name: string;
    ruleType: string;
    paramsJson: string;
    active: boolean;
  },
): Promise<PriceRuleRecord> {
  return request<PriceRuleRecord>(`/api/v1/pricing/price-rules/${encodeURIComponent(ruleId)}`, {
    method: "PUT",
    body,
  });
}

export async function postTaxRate(body: {
  name: string;
  ratePercent: number | string;
  inclusive: boolean;
  active: boolean;
}): Promise<TaxRateRecord> {
  return request<TaxRateRecord>("/api/v1/pricing/tax-rates", {
    method: "POST",
    body,
  });
}

export async function postSellingPrice(body: {
  itemId: string;
  branchId?: string | null;
  price: number | string;
  effectiveFrom: string;
  notes?: string | null;
}): Promise<SellingPriceResponseRecord> {
  const payload: Record<string, unknown> = {
    itemId: body.itemId.trim(),
    price: body.price,
    effectiveFrom: body.effectiveFrom,
  };
  if (body.branchId?.trim()) {
    payload.branchId = body.branchId.trim();
  }
  if (body.notes?.trim()) {
    payload.notes = body.notes.trim();
  }
  return request<SellingPriceResponseRecord>("/api/v1/pricing/selling-prices", {
    method: "POST",
    body: payload,
  });
}

export type ShiftRecord = {
  id: string;
  branchId: string;
  status: string;
  openingCash: number | string;
  expectedClosingCash: number | string;
  countedClosingCash: number | string | null;
  closingVariance: number | string | null;
  openingNotes: string | null;
  closingNotes: string | null;
  openedBy: string;
  closedBy: string | null;
  openedAt: string;
  closedAt: string | null;
  closeJournalEntryId: string | null;
};

export async function postOpenShift(body: {
  branchId: string;
  openingCash: number | string;
  notes?: string | null;
}): Promise<ShiftRecord> {
  const payload: Record<string, unknown> = {
    branchId: body.branchId.trim(),
    openingCash: body.openingCash,
  };
  if (body.notes?.trim()) {
    payload.notes = body.notes.trim();
  }
  return request<ShiftRecord>("/api/v1/shifts/open", {
    method: "POST",
    body: payload,
  });
}

export async function fetchCurrentShift(branchId: string): Promise<ShiftRecord> {
  const params = new URLSearchParams({ branchId: branchId.trim() });
  return request<ShiftRecord>(`/api/v1/shifts/current?${params.toString()}`);
}

export async function postCloseShift(
  shiftId: string,
  body: { countedClosingCash: number | string; notes?: string | null },
): Promise<ShiftRecord> {
  const payload: Record<string, unknown> = {
    countedClosingCash: body.countedClosingCash,
  };
  if (body.notes?.trim()) {
    payload.notes = body.notes.trim();
  }
  return request<ShiftRecord>(`/api/v1/shifts/${encodeURIComponent(shiftId)}/close`, {
    method: "POST",
    body: payload,
  });
}

export type SalePaymentMethod =
  | "cash"
  | "mpesa_manual"
  | "customer_credit"
  | "customer_wallet"
  | "loyalty_redeem";

export type PostSaleLinePayload = {
  itemId: string;
  quantity: number | string;
  unitPrice: number | string;
};

export type PostSalePaymentPayload = {
  method: SalePaymentMethod;
  amount: number | string;
  reference?: string | null;
};

export type PostSalePayload = {
  branchId: string;
  /** Required when any payment uses `customer_credit` (tab / AR). */
  customerId?: string | null;
  lines: PostSaleLinePayload[];
  payments: PostSalePaymentPayload[];
  /** ISO-8601 instant when the cashier completed the sale (offline-safe; server may clamp skew). */
  clientSoldAt?: string | null;
};

export type SaleItemResponseRecord = {
  id: string;
  lineIndex: number;
  itemId: string;
  batchId: string;
  quantity: number | string;
  unitPrice: number | string;
  lineTotal: number | string;
  unitCost: number | string;
  costTotal: number | string;
  profit: number | string;
};

export type SalePaymentResponseRecord = {
  method: string;
  amount: number | string;
  reference: string | null;
};

export type SaleRecord = {
  id: string;
  branchId: string;
  customerId?: string | null;
  shiftId: string;
  status: string;
  grandTotal: number | string;
  refundedTotal: number | string;
  journalEntryId: string;
  payments: SalePaymentResponseRecord[];
  items: SaleItemResponseRecord[];
  voidedAt?: string | null;
  voidedBy?: string | null;
  voidJournalEntryId?: string | null;
  voidNotes?: string | null;
};

export type PostRefundLinePayload = {
  saleItemId: string;
  quantity: number | string;
};

export type PostRefundPaymentPayload = {
  method: SalePaymentMethod;
  amount: number | string;
  reference?: string | null;
};

export type PostRefundPayload = {
  lines: PostRefundLinePayload[];
  payments: PostRefundPaymentPayload[];
  reason: string;
};

export type RefundLineRecord = {
  saleItemId: string;
  quantity: number | string;
  amount: number | string;
};

export type RefundPaymentRecord = {
  method: string;
  amount: number | string;
  reference: string | null;
};

export type RefundRecord = {
  id: string;
  saleId: string;
  totalRefunded: number | string;
  journalEntryId: string;
  refundedAt: string;
  reason: string;
  lines: RefundLineRecord[];
  payments: RefundPaymentRecord[];
  sale: SaleRecord;
};

export type PostVoidSalePayload = {
  notes?: string | null;
};

function buildJsonPostSaleBody(body: PostSalePayload): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    branchId: body.branchId.trim(),
    lines: body.lines.map((l) => ({
      itemId: l.itemId.trim(),
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    })),
    payments: body.payments.map((p) => {
      const row: Record<string, unknown> = {
        method: p.method,
        amount: p.amount,
      };
      if (p.reference?.trim()) {
        row.reference = p.reference.trim();
      }
      return row;
    }),
  };
  const soldAt = body.clientSoldAt?.trim();
  if (soldAt) {
    payload.clientSoldAt = soldAt;
  }
  const cust = body.customerId?.trim();
  if (cust) {
    payload.customerId = cust;
  }
  return payload;
}

export type PostSaleAttemptResult =
  | { ok: true; sale: SaleRecord }
  | { ok: false; status: number; message: string };

function isTransientSaleFailure(r: PostSaleAttemptResult): boolean {
  if (r.ok) {
    return false;
  }
  return r.status === 0 || r.status >= 500;
}

const POST_SALE_RETRY_ATTEMPTS = 12;
const POST_SALE_RETRY_DELAY_MS = 400;

export async function tryPostSale(
  body: PostSalePayload,
  idempotencyKey: string,
): Promise<PostSaleAttemptResult> {
  const path = "/api/v1/sales";
  const method: RequestMethod = "POST";
  const key = idempotencyKey.trim();

  const execute = async (): Promise<
    { kind: "response"; response: Response } | { kind: "network"; message: string }
  > => {
    const session = getSessionTokens();
    if (!session) {
      return { kind: "network", message: "Not signed in." };
    }
    const headersInit = buildRequestHeaders(true, session.accessToken, method);
    const headers = new Headers(headersInit);
    headers.set("Idempotency-Key", key);
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: JSON.stringify(buildJsonPostSaleBody(body)),
      });
      return { kind: "response", response };
    } catch {
      return { kind: "network", message: getNetworkErrorMessage() };
    }
  };

  let outcome = await execute();
  if (outcome.kind === "network") {
    return { ok: false, status: 0, message: outcome.message };
  }
  let response = outcome.response;

  if (response.status === 401) {
    const payload = await response.clone().json().catch(() => ({}));
    const problem = parseProblem(payload);
    if (shouldAttemptRefresh(problem?.code) && (await tryRefreshToken())) {
      outcome = await execute();
      if (outcome.kind === "network") {
        return { ok: false, status: 0, message: outcome.message };
      }
      response = outcome.response;
    } else {
      const message = formatApiProblemMessage(payload);
      if (problem?.title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
        signOutClientAndRedirectToLogin();
      }
      return { ok: false, status: 401, message };
    }
  }

  if (response.ok) {
    return { ok: true, sale: (await response.json()) as SaleRecord };
  }

  const payload = await response.json().catch(() => ({}));
  const problem = parseProblem(payload);
  const message = formatApiProblemMessage(payload);
  if (response.status === 401 && problem?.title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
    signOutClientAndRedirectToLogin();
  }
  return { ok: false, status: response.status, message };
}

export async function tryPostSaleWithRetries(
  body: PostSalePayload,
  idempotencyKey: string,
  maxAttempts: number = POST_SALE_RETRY_ATTEMPTS,
  delayMs: number = POST_SALE_RETRY_DELAY_MS,
): Promise<PostSaleAttemptResult> {
  let last: PostSaleAttemptResult = { ok: false, status: 0, message: "unreachable" };
  for (let i = 0; i < maxAttempts; i++) {
    last = await tryPostSale(body, idempotencyKey);
    if (last.ok) {
      return last;
    }
    if (!isTransientSaleFailure(last)) {
      return last;
    }
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return last;
}

/** Requires an explicit idempotency key per attempt (retry with the same key is safe). */
export async function postSale(body: PostSalePayload, idempotencyKey: string): Promise<SaleRecord> {
  const result = await tryPostSaleWithRetries(body, idempotencyKey, 1, 0);
  if (result.ok) {
    return result.sale;
  }
  throw new Error(result.message);
}

/** Voids a completed sale on the same open shift; idempotent if already voided. */
export async function postVoidSale(
  saleId: string,
  payload?: PostVoidSalePayload,
): Promise<SaleRecord> {
  const notes = payload?.notes?.trim();
  return request<SaleRecord>(`/api/v1/sales/${encodeURIComponent(saleId.trim())}/void`, {
    method: "POST",
    body: notes ? { notes } : {},
  });
}

/** Idempotent per Idempotency-Key; requires an open shift for drawer-affecting refunds. */
export async function postSaleRefund(
  saleId: string,
  body: PostRefundPayload,
  idempotencyKey: string,
): Promise<RefundRecord> {
  const lines = body.lines.map((l) => ({
    saleItemId: l.saleItemId.trim(),
    quantity: l.quantity,
  }));
  const payments = body.payments.map((p) => {
    const row: Record<string, unknown> = {
      method: p.method,
      amount: p.amount,
    };
    if (p.reference?.trim()) {
      row.reference = p.reference.trim();
    }
    return row;
  });
  return request<RefundRecord>(`/api/v1/sales/${encodeURIComponent(saleId.trim())}/refund`, {
    method: "POST",
    body: {
      lines,
      payments,
      reason: body.reason.trim(),
    },
    idempotencyKey,
  });
}

export type OpenSupplierInvoiceRow = {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  grandTotal: number;
  openBalance: number;
};

export async function fetchOpenSupplierInvoices(
  supplierId?: string,
): Promise<OpenSupplierInvoiceRow[]> {
  const params = new URLSearchParams();
  if (supplierId?.trim()) {
    params.set("supplierId", supplierId.trim());
  }
  const q = params.toString();
  return request<OpenSupplierInvoiceRow[]>(
    `/api/v1/purchasing/open-supplier-invoices${q ? `?${q}` : ""}`,
  );
}

export type PostSupplierPaymentAllocationLine = {
  supplierInvoiceId: string;
  amount: number;
};

export type PostSupplierPaymentPayload = {
  supplierId: string;
  paidAt: string;
  paymentMethod: string;
  paymentAmount: number;
  creditApplied: number;
  reference?: string;
  notes?: string;
  allocations: PostSupplierPaymentAllocationLine[];
};

export type PostSupplierPaymentResult = {
  supplierPaymentId: string;
  journalEntryId: string;
  totalAllocated: number;
  supplierPrepaymentBalanceAfter: number;
};

export async function postSupplierPayment(
  body: PostSupplierPaymentPayload,
): Promise<PostSupplierPaymentResult> {
  return request<PostSupplierPaymentResult>("/api/v1/purchasing/supplier-payments", {
    method: "POST",
    body,
  });
}

const PATH_B_SESSIONS = "/api/v1/purchasing/path-b/sessions";

export type CreatePathBSessionPayload = {
  supplierId: string;
  branchId: string;
  /** ISO-8601 instant (e.g. from `Date.toISOString()`). */
  receivedAt: string;
  notes?: string | null;
};

export type PathBLineRecord = {
  id: string;
  sortOrder: number;
  descriptionText: string;
  amountMoney: number | string;
  suggestedItemId: string | null;
  lineStatus: string;
};

export type PathBSessionDetailRecord = {
  id: string;
  supplierId: string;
  branchId: string;
  receivedAt: string;
  notes: string | null;
  status: string;
  lines: PathBLineRecord[];
};

export type AddPathBLinePayload = {
  description: string;
  amountMoney: number | string;
  suggestedItemId?: string | null;
};

export type PostPathBLineBreakdownPayload = {
  lineId: string;
  itemId: string;
  usableQty: number | string;
  wastageQty: number | string;
  /** ISO calendar date `YYYY-MM-DD`; optional batch expiry. */
  expiryDate?: string | null;
};

export type PostPathBPayload = {
  lines: PostPathBLineBreakdownPayload[];
};

export type PostPathBResult = {
  supplierInvoiceId: string;
  invoiceNumber: string;
  journalEntryId: string;
  grandTotal: number | string;
  linesPosted: number;
};

export async function createPathBSession(
  body: CreatePathBSessionPayload,
): Promise<PathBSessionDetailRecord> {
  return request<PathBSessionDetailRecord>(PATH_B_SESSIONS, {
    method: "POST",
    body,
  });
}

export async function fetchPathBSession(sessionId: string): Promise<PathBSessionDetailRecord> {
  return request<PathBSessionDetailRecord>(
    `${PATH_B_SESSIONS}/${encodeURIComponent(sessionId.trim())}`,
  );
}

export async function addPathBLine(
  sessionId: string,
  body: AddPathBLinePayload,
): Promise<PathBLineRecord> {
  return request<PathBLineRecord>(
    `${PATH_B_SESSIONS}/${encodeURIComponent(sessionId.trim())}/lines`,
    { method: "POST", body },
  );
}

export async function patchPathBLine(
  sessionId: string,
  lineId: string,
  body: AddPathBLinePayload,
): Promise<PathBLineRecord> {
  return request<PathBLineRecord>(
    `${PATH_B_SESSIONS}/${encodeURIComponent(sessionId.trim())}/lines/${encodeURIComponent(lineId.trim())}`,
    { method: "PATCH", body },
  );
}

export async function deletePathBLine(sessionId: string, lineId: string): Promise<void> {
  await request(
    `${PATH_B_SESSIONS}/${encodeURIComponent(sessionId.trim())}/lines/${encodeURIComponent(lineId.trim())}`,
    { method: "DELETE" },
  );
}

export async function postPathBSession(sessionId: string, body: PostPathBPayload): Promise<PostPathBResult> {
  return request<PostPathBResult>(
    `${PATH_B_SESSIONS}/${encodeURIComponent(sessionId.trim())}/post`,
    {
      method: "POST",
      body,
    },
  );
}

export type PathBSupplyListRowRecord = {
  supplierInvoiceId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  createdAt: string;
  lineCount: number;
  grandTotal: number | string;
  amountPaid: number | string;
  balanceOpen: number | string;
  paymentStatus: string;
};

export type SupplyPaymentHistoryRecord = {
  supplierPaymentId: string;
  allocationId: string;
  paidAt: string;
  paymentMethod: string;
  paymentCashAmount: number | string;
  amountAppliedToInvoice: number | string;
  reference: string | null;
  notes: string | null;
};

export async function fetchPathBSupplies(): Promise<PathBSupplyListRowRecord[]> {
  return request<PathBSupplyListRowRecord[]>("/api/v1/purchasing/supplies");
}

export type PathBSupplyInvoiceLineRecord = {
  id: string;
  description: string;
  itemId: string | null;
  qty: number | string;
  unitCost: number | string;
  lineTotal: number | string;
  sortOrder: number;
  usableQty: number | string;
  wastageQty: number | string;
};

export type PatchPathBSupplyInvoiceLinePayload = {
  supplierInvoiceLineId: string;
  usableQty: number;
  wastageQty: number;
  lineTotal: number;
  description?: string | null;
};

export type PathBSupplyInvoiceDetailRecord = {
  supplierInvoiceId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  grandTotal: number | string;
  amountPaid: number | string;
  balanceOpen: number | string;
  paymentStatus: string;
  lines: PathBSupplyInvoiceLineRecord[];
};

export async function fetchPathBSupplyInvoiceDetail(invoiceId: string): Promise<PathBSupplyInvoiceDetailRecord> {
  return request<PathBSupplyInvoiceDetailRecord>(
    `/api/v1/purchasing/supplies/${encodeURIComponent(invoiceId.trim())}`,
  );
}

export async function patchPathBSupplyInvoice(
  invoiceId: string,
  body: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string | null;
    notes: string | null;
    lines?: PatchPathBSupplyInvoiceLinePayload[] | null;
  },
): Promise<PathBSupplyInvoiceDetailRecord> {
  const payload: Record<string, unknown> = {
    invoiceNumber: body.invoiceNumber.trim(),
    invoiceDate: body.invoiceDate,
    dueDate: body.dueDate,
    notes: body.notes?.trim() ? body.notes.trim() : null,
  };
  if (body.lines != null && body.lines.length > 0) {
    payload.lines = body.lines.map((ln) => ({
      supplierInvoiceLineId: ln.supplierInvoiceLineId.trim(),
      usableQty: ln.usableQty,
      wastageQty: ln.wastageQty,
      lineTotal: ln.lineTotal,
      description: ln.description?.trim() ? ln.description.trim() : null,
    }));
  }
  return request<PathBSupplyInvoiceDetailRecord>(
    `/api/v1/purchasing/supplies/${encodeURIComponent(invoiceId.trim())}`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function fetchSupplyPaymentHistory(invoiceId: string): Promise<SupplyPaymentHistoryRecord[]> {
  return request<SupplyPaymentHistoryRecord[]>(
    `/api/v1/purchasing/supplies/${encodeURIComponent(invoiceId.trim())}/payment-history`,
  );
}

export type SupplierRecord = {
  id: string;
  name: string;
  code: string | null;
  supplierType: string;
  vatPin: string | null;
  taxExempt: boolean;
  creditTermsDays: number | null;
  creditLimit: number | null;
  rating: number | null;
  status: string;
  notes: string | null;
  paymentMethodPreferred: string | null;
  paymentDetails: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SupplierContactRecord = {
  id: string;
  name: string | null;
  roleLabel: string | null;
  phone: string | null;
  email: string | null;
  primaryContact: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupplierPayload = {
  name: string;
  code?: string;
  supplierType?: string;
  status?: string;
  notes?: string;
  vatPin?: string;
  taxExempt?: boolean;
  creditTermsDays?: number;
  creditLimit?: number;
  paymentMethodPreferred?: string;
  paymentDetails?: string;
};

export type PatchSupplierPayload = {
  name?: string;
  code?: string;
  supplierType?: string;
  status?: string;
  notes?: string;
  vatPin?: string;
  taxExempt?: boolean;
  creditTermsDays?: number | null;
  creditLimit?: number | null;
  paymentMethodPreferred?: string;
  paymentDetails?: string;
};

export type CreateSupplierContactPayload = {
  name?: string;
  roleLabel?: string;
  phone?: string;
  email?: string;
  primaryContact?: boolean;
};

export type FetchSuppliersOpts = {
  search?: string;
  /** Exact match on supplier status (e.g. active, inactive, blocked). */
  status?: string;
  page?: number;
  size?: number;
};

export async function fetchSuppliersPage(opts?: FetchSuppliersOpts): Promise<ItemsPageResult<SupplierRecord>> {
  const params = new URLSearchParams();
  params.set("page", String(opts?.page ?? 0));
  params.set("size", String(opts?.size ?? 80));
  if (opts?.search?.trim()) {
    params.set("search", opts.search.trim());
  }
  if (opts?.status?.trim()) {
    params.set("status", opts.status.trim());
  }
  const path = `/api/v1/suppliers?${params.toString()}`;
  const raw = await request<unknown>(path);
  const content = extractPageContent<SupplierRecord>(raw);
  const meta = extractSpringPageMeta(raw);
  if (!meta) {
    return {
      content,
      totalElements: content.length,
      totalPages: content.length > 0 ? 1 : 0,
      number: 0,
      size: content.length,
      last: true,
      first: true,
    };
  }
  return { content, ...meta };
}

export async function fetchSuppliers(): Promise<SupplierRecord[]> {
  const page = await fetchSuppliersPage({ page: 0, size: 100 });
  return page.content;
}

export async function fetchSupplierById(supplierId: string): Promise<SupplierRecord> {
  return request<SupplierRecord>(`/api/v1/suppliers/${supplierId}`);
}

export async function createSupplier(body: CreateSupplierPayload): Promise<SupplierRecord> {
  return request<SupplierRecord>("/api/v1/suppliers", { method: "POST", body });
}

export async function patchSupplier(
  supplierId: string,
  body: PatchSupplierPayload,
): Promise<SupplierRecord> {
  return request<SupplierRecord>(`/api/v1/suppliers/${supplierId}`, {
    method: "PATCH",
    body,
  });
}

export async function fetchSupplierContacts(
  supplierId: string,
): Promise<SupplierContactRecord[]> {
  return request<SupplierContactRecord[]>(`/api/v1/suppliers/${supplierId}/contacts`);
}

export async function createSupplierContact(
  supplierId: string,
  body: CreateSupplierContactPayload,
): Promise<SupplierContactRecord> {
  return request<SupplierContactRecord>(`/api/v1/suppliers/${supplierId}/contacts`, {
    method: "POST",
    body,
  });
}

export type CustomerPhoneRecord = {
  id: string;
  phone: string;
  primary: boolean;
  createdAt: string;
};

export type CreditAccountSummaryRecord = {
  balanceOwed: number | string;
  walletBalance: number | string;
  loyaltyPoints: number;
  creditLimit: number | string | null;
  version: number;
};

export type CustomerRecord = {
  id: string;
  name: string;
  email: string | null;
  notes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  phones: CustomerPhoneRecord[];
  credit: CreditAccountSummaryRecord;
};

export type CreateCustomerPayload = {
  name: string;
  email?: string | null;
  notes?: string | null;
  creditLimit?: number | string | null;
  phones: { phone: string; primary?: boolean | null }[];
};

export async function fetchCustomers(phone?: string): Promise<CustomerRecord[]> {
  const params = new URLSearchParams({ page: "0", size: "100" });
  const q = phone?.trim();
  if (q) {
    params.set("phone", q);
  }
  const payload = await request<unknown>(`/api/v1/customers?${params}`);
  return extractPageContent<CustomerRecord>(payload);
}

export async function fetchCustomerById(customerId: string): Promise<CustomerRecord> {
  return request<CustomerRecord>(`/api/v1/customers/${customerId}`);
}

export type CreditStatementLineRecord = {
  at: string;
  kind: string;
  debit: number | string;
  credit: number | string;
  memo: string;
};

export type CreditStatementRecord = {
  customerId: string;
  customerName: string;
  balanceOwed: number | string;
  walletBalance: number | string;
  loyaltyPoints: number;
  lines: CreditStatementLineRecord[];
};

export async function fetchCustomerCreditStatement(
  customerId: string,
): Promise<CreditStatementRecord> {
  return request<CreditStatementRecord>(
    `/api/v1/customers/${encodeURIComponent(customerId)}/credit-statement`,
  );
}

export async function postCustomerWalletTopUp(
  customerId: string,
  body: { amount: number | string },
): Promise<void> {
  return request<void>(`/api/v1/customers/${encodeURIComponent(customerId)}/wallet/top-ups`, {
    method: "POST",
    body: { amount: body.amount },
  });
}

export type IssuePaymentClaimResponseRecord = {
  claimId: string;
  plaintextToken: string;
};

export async function issueCustomerPaymentClaim(
  customerId: string,
): Promise<IssuePaymentClaimResponseRecord> {
  return request<IssuePaymentClaimResponseRecord>(
    `/api/v1/customers/${encodeURIComponent(customerId)}/payment-claims`,
    { method: "POST" },
  );
}

export type PublicPaymentClaimRecord = {
  id: string;
  businessId: string;
  creditAccountId: string;
  status: string;
  submittedAmount: number | string | null;
  submittedReference: string | null;
  creditNote: string | null;
  approvedJournalId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listSubmittedPaymentClaims(): Promise<PublicPaymentClaimRecord[]> {
  return request<PublicPaymentClaimRecord[]>("/api/v1/credits/payment-claims/submitted");
}

export async function approvePaymentClaim(claimId: string): Promise<void> {
  return request<void>(`/api/v1/credits/payment-claims/${encodeURIComponent(claimId)}/approve`, {
    method: "POST",
  });
}

export async function submitPublicPaymentClaim(
  plaintextToken: string,
  body: { amount: number | string; reference?: string | null },
): Promise<void> {
  return request<void>(
    `/api/v1/public/credits/payment-claims/${encodeURIComponent(plaintextToken)}`,
    {
      method: "POST",
      body: {
        amount: body.amount,
        reference: body.reference?.trim() || null,
      },
    },
  );
}

export type MpesaStkIntentResponseRecord = {
  intentId: string;
  checkoutRequestId: string;
  status: string;
  amount: number | string;
};

export async function initiateMpesaStkIntent(
  body: { customerId: string; amount: number | string },
  idempotencyKey: string,
): Promise<MpesaStkIntentResponseRecord> {
  return request<MpesaStkIntentResponseRecord>("/api/v1/payments/mpesa/stk/intents", {
    method: "POST",
    body,
    idempotencyKey,
  });
}

export async function simulateMpesaStkComplete(body: {
  businessId: string;
  intentId: string;
  secret?: string | null;
}): Promise<void> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const secret = body.secret?.trim();
  if (secret) {
    headers.set("X-Mpesa-Simulate-Secret", secret);
  }
  try {
    const resp = await fetch(`${API_BASE_URL}/webhooks/mpesa/stk/complete`, {
      method: "POST",
      headers,
      body: JSON.stringify({ businessId: body.businessId, intentId: body.intentId }),
    });
    if (!resp.ok) {
      const payload = await resp.json().catch(() => ({}));
      throw new Error(formatApiProblemMessage(payload));
    }
  } catch (e) {
    if (e instanceof Error && /Cannot reach API/.test(e.message)) {
      throw e;
    }
    throw e instanceof Error ? e : new Error("STK simulate failed.");
  }
}

export async function createCustomer(body: CreateCustomerPayload): Promise<CustomerRecord> {
  return request<CustomerRecord>("/api/v1/customers", {
    method: "POST",
    body,
  });
}
