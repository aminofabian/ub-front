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
import { extractPageContent } from "@/lib/page-content";
import { getProblemTitle, parseProblem } from "@/lib/problem";

type RequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type RequestOptions = {
  method?: RequestMethod;
  body?: unknown;
  requiresAuth?: boolean;
  /** Overrides auto-generated Idempotency-Key for POST/PATCH (e.g. POS sale retries). */
  idempotencyKey?: string;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

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
  active?: boolean;
};

export type ItemImageRecord = {
  id: string;
  s3Key: string;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
  contentType?: string | null;
  altText?: string | null;
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
  bundleQty?: number | null;
  bundlePrice?: number | string | null;
  bundleName?: string | null;
  imageKey?: string | null;
  images?: ItemImageRecord[];
  variants?: ItemSummaryRecord[];
};

export type ItemTypeRecord = {
  id: string;
  key: string;
  label: string;
};

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  position: number;
  icon: string;
  parentId: string | null;
  active: boolean;
};

export type CreateCategoryPayload = {
  name: string;
  parentId?: string;
  icon?: string;
  position?: number;
};

export type PatchCategoryPayload = {
  name?: string;
  slug?: string;
  parentId?: string;
  active?: boolean;
  position?: number;
  icon?: string;
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

export type PatchBusinessPayload = {
  name?: string;
  subscriptionTier?: string;
  active?: boolean;
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
  sku: string;
  itemTypeId: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
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
  barcode?: string;
  description?: string;
  active?: boolean;
  bundlePrice?: number;
  imageKey?: string;
  categoryId?: string;
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
  primary: boolean;
  supplierSku?: string | null;
  defaultCostPrice?: number | string | null;
  active: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateVariantPayload = {
  sku: string;
  variantName: string;
  name?: string;
  barcode?: string;
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
      const title = getProblemTitle(payload);
      if (title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
        signOutClientAndRedirectToLogin();
      }
      throw new Error(title);
    }
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await execute();
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const title = getProblemTitle(payload);
    if (
      requiresAuth &&
      response.status === 401 &&
      title === PROBLEM_TITLES.invalidOrExpiredAccessToken
    ) {
      signOutClientAndRedirectToLogin();
    }
    throw new Error(title);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
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
      const title = getProblemTitle(payload);
      if (title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
        signOutClientAndRedirectToLogin();
      }
      throw new Error(title);
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const title = getProblemTitle(payload);
    if (title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
      signOutClientAndRedirectToLogin();
    }
    throw new Error(title);
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
};

export async function registerAccount(
  name: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  return request<RegisterResponse>(API_ROUTES.register, {
    method: "POST",
    body: { name, email, password },
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

export async function resendVerificationEmail(email: string): Promise<void> {
  await request(API_ROUTES.resendVerification, {
    method: "POST",
    body: { email },
    requiresAuth: false,
  });
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

export async function fetchBusiness(): Promise<BusinessRecord> {
  return request<BusinessRecord>(API_ROUTES.businessMe);
}

export async function updateBusiness(body: PatchBusinessPayload): Promise<void> {
  await request(API_ROUTES.businessMe, { method: "PATCH", body });
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

export async function fetchItems(search?: string): Promise<ItemSummaryRecord[]> {
  const params = new URLSearchParams(DEFAULT_PAGE_QUERY);
  if (search?.trim()) {
    params.set("search", search.trim());
  }
  const path = `${API_ROUTES.items}?${params.toString()}`;
  const payload = await request<unknown>(path);
  return parseList(payload);
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

export async function createItem(payload: CreateItemPayload): Promise<ItemCreateResponse> {
  return request<ItemCreateResponse>(API_ROUTES.items, { method: "POST", body: payload });
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

export async function patchItem(
  itemId: string,
  body: PatchItemPayload,
): Promise<void> {
  await request(`${API_ROUTES.items}/${itemId}`, { method: "PATCH", body });
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
): Promise<void> {
  await request(`${API_ROUTES.items}/${parentItemId}/variants`, {
    method: "POST",
    body,
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
): Promise<SellPriceSuggestionRecord> {
  const params = new URLSearchParams({ itemId: itemId.trim() });
  if (supplierId?.trim()) {
    params.set("supplierId", supplierId.trim());
  }
  return request<SellPriceSuggestionRecord>(`/api/v1/pricing/suggest/sell?${params.toString()}`);
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

export type SalePaymentMethod = "cash" | "mpesa_manual";

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
      const title = getProblemTitle(payload);
      if (title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
        signOutClientAndRedirectToLogin();
      }
      return { ok: false, status: 401, message: title };
    }
  }

  if (response.ok) {
    return { ok: true, sale: (await response.json()) as SaleRecord };
  }

  const payload = await response.json().catch(() => ({}));
  const title = getProblemTitle(payload);
  if (response.status === 401 && title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
    signOutClientAndRedirectToLogin();
  }
  return { ok: false, status: response.status, message: title };
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
};

export type PatchSupplierPayload = {
  name?: string;
  supplierType?: string;
  status?: string;
  notes?: string;
};

export type CreateSupplierContactPayload = {
  name?: string;
  roleLabel?: string;
  phone?: string;
  email?: string;
  primaryContact?: boolean;
};

export async function fetchSuppliers(): Promise<SupplierRecord[]> {
  const path = `/api/v1/suppliers?${DEFAULT_PAGE_QUERY}`;
  const payload = await request<unknown>(path);
  return extractPageContent<SupplierRecord>(payload);
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
