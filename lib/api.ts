"use client";

import {
  API_BASE_URL,
  API_ROUTES,
  DEFAULT_PAGE_QUERY,
  ERROR_CODES,
  PUBLIC_TENANT_ID,
  STORAGE_KEYS,
} from "@/lib/config";
import { clearSessionTokens, getSessionTokens, setSessionTokens } from "@/lib/auth";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { extractPageContent } from "@/lib/page-content";
import { getProblemTitle, parseProblem } from "@/lib/problem";

type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: RequestMethod;
  body?: unknown;
  requiresAuth?: boolean;
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
  active?: boolean;
};

export type ItemDetailRecord = ItemSummaryRecord & {
  description?: string;
  itemTypeId?: string;
  variants?: ItemSummaryRecord[];
};

export type ItemTypeRecord = {
  id: string;
  key: string;
  label: string;
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
  return `Cannot reach API at ${API_BASE_URL}. Start backend or set NEXT_PUBLIC_API_BASE_URL in .env.local.`;
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
  { method = "GET", body, requiresAuth = true }: RequestOptions = {},
): Promise<T> {
  const execute = async () => {
    const session = requiresAuth ? getSessionTokens() : null;
    const headers = buildRequestHeaders(requiresAuth, session?.accessToken, method);
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
      throw new Error(getProblemTitle(payload));
    }
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await execute();
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getProblemTitle(payload));
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
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

export async function createItem(payload: CreateItemPayload): Promise<ItemCreateResponse> {
  return request<ItemCreateResponse>(API_ROUTES.items, { method: "POST", body: payload });
}

export async function addItemSupplierLink(
  itemId: string,
  body: AddItemSupplierLinkPayload,
): Promise<void> {
  await request(`${API_ROUTES.items}/${itemId}/supplier-links`, { method: "POST", body });
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
