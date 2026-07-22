import { API_ROUTES, APP_ROUTES, apiUrl, getApiBaseUrl } from "@/lib/config";
import { extractPageContent } from "@/lib/page-content";
import { getProblemTitle } from "@/lib/problem";
import {
  clearSuperAdminSession,
  getSuperAdminAccessToken,
  setSuperAdminAccessToken,
} from "@/lib/super-admin-session";

export type SuperAdminLoginResult = {
  accessToken: string;
  superAdminId: string;
  email: string;
  name: string;
};

export type SaBusinessRow = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  countryCode: string;
  timezone: string;
  active: boolean;
  subscriptionTier: string;
  createdAt: string;
  updatedAt: string;
  globalCatalogCode?: string | null;
};

export type SaDomainRow = {
  id: string;
  businessId: string;
  domain: string;
  primary: boolean;
  active: boolean;
};

export type SaBusinessUserRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  status: string;
  roleKey: string;
  roleName: string;
  branchName: string;
  lastLoginAt: string;
  createdAt: string;
};

export type SaBusinessStats = {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  totalBranches: number;
  totalSalesToday: number;
  revenueToday: number;
  totalSalesThisMonth: number;
  revenueThisMonth: number;
  openShifts: number;
};

function getNetworkErrorMessage(): string {
  const via =
    getApiBaseUrl().length > 0
      ? getApiBaseUrl()
      : "this app’s origin (configure BACKEND_ORIGIN for the Next.js proxy)";
  return `Cannot reach API at ${via}. Start the backend, set BACKEND_ORIGIN on Next.js, or set NEXT_PUBLIC_API_BROWSER_DIRECT=true with NEXT_PUBLIC_API_BASE_URL for direct (CORS) API calls.`;
}

export async function loginSuperAdmin(
  email: string,
  password: string,
): Promise<SuperAdminLoginResult> {
  let response: Response;
  try {
    response = await fetch(apiUrl(API_ROUTES.superAdminAuthLogin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch {
    throw new Error(getNetworkErrorMessage());
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getProblemTitle(payload));
  }
  const data = payload as SuperAdminLoginResult;
  if (!data.accessToken) {
    throw new Error("Invalid login response");
  }
  setSuperAdminAccessToken(data.accessToken);
  return data;
}

export function logoutSuperAdmin(): void {
  clearSuperAdminSession();
}

async function saRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getSuperAdminAccessToken();
  if (!token) {
    throw new Error("Super-admin session expired. Sign in again.");
  }
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  if (
    init.headers &&
    typeof init.headers === "object" &&
    !Array.isArray(init.headers)
  ) {
    Object.assign(headers, init.headers as Record<string, string>);
  }
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers,
    });
  } catch {
    throw new Error(getNetworkErrorMessage());
  }
  if (response.status === 401) {
    clearSuperAdminSession();
    if (typeof window !== "undefined") {
      window.location.assign(APP_ROUTES.superAdminLogin);
    }
    throw new Error("Session expired. Sign in again.");
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

export async function fetchSaBusinesses(
  page = 0,
  size = 50,
): Promise<SaBusinessRow[]> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc",
  });
  const payload = await saRequest<unknown>(
    `${API_ROUTES.superAdminBusinesses}?${params.toString()}`,
    { method: "GET" },
  );
  return extractPageContent<SaBusinessRow>(payload);
}

export type CreateSaBusinessPayload = {
  name: string;
  slug: string;
  currency?: string;
  countryCode?: string;
  timezone?: string;
  subscriptionTier?: string;
  primaryDomain?: string;
};

export async function createSaBusiness(
  body: CreateSaBusinessPayload,
): Promise<SaBusinessRow> {
  return saRequest<SaBusinessRow>(API_ROUTES.superAdminBusinesses, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type PatchSaBusinessPayload = {
  name?: string;
  subscriptionTier?: string;
  active?: boolean;
  globalCatalogCode?: string | null;
  currency?: string;
  countryCode?: string;
  timezone?: string;
  /** Required when changing country/currency on a shop with products or sales. */
  acknowledgeRegionRisk?: boolean;
};

export async function fetchSaBusiness(businessId: string): Promise<SaBusinessRow> {
  return saRequest<SaBusinessRow>(`${API_ROUTES.superAdminBusinesses}/${businessId}`);
}

export async function patchSaBusiness(
  businessId: string,
  body: PatchSaBusinessPayload,
): Promise<SaBusinessRow> {
  return saRequest<SaBusinessRow>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function deleteSaBusiness(businessId: string): Promise<void> {
  await saRequest<unknown>(`${API_ROUTES.superAdminBusinesses}/${businessId}`, {
    method: "DELETE",
  });
}

// ─── Platform Payment Gateways ──────────────────────────────────────

export type PlatformGatewayRecord = {
  gatewayType: string;
  isEnabled: boolean;
  supplierPayoutSupported: boolean;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PatchPlatformGatewayPayload = {
  isEnabled: boolean;
  supplierPayoutSupported?: boolean;
  displayName: string;
  description?: string;
  logoUrl?: string;
  sortOrder: number;
};

export async function fetchPlatformGateways(): Promise<
  PlatformGatewayRecord[]
> {
  return saRequest<PlatformGatewayRecord[]>(
    API_ROUTES.superAdminPlatformPaymentGateways,
  );
}

export async function patchPlatformGateway(
  gatewayType: string,
  body: PatchPlatformGatewayPayload,
): Promise<PlatformGatewayRecord> {
  return saRequest<PlatformGatewayRecord>(
    `${API_ROUTES.superAdminPlatformPaymentGateways}/${encodeURIComponent(gatewayType)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function fetchSaDomains(
  businessId: string,
): Promise<SaDomainRow[]> {
  return saRequest<SaDomainRow[]>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/domains`,
    { method: "GET" },
  );
}

export async function addSaDomain(
  businessId: string,
  domain: string,
): Promise<SaDomainRow> {
  return saRequest<SaDomainRow>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/domains`,
    {
      method: "POST",
      body: JSON.stringify({ domain: domain.trim().toLowerCase() }),
    },
  );
}

export async function setSaPrimaryDomain(
  businessId: string,
  domainId: string,
): Promise<SaDomainRow> {
  return saRequest<SaDomainRow>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/domains/${domainId}/primary`,
    { method: "POST" },
  );
}

export async function deleteSaDomain(
  businessId: string,
  domainId: string,
): Promise<void> {
  await saRequest<unknown>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/domains/${domainId}`,
    { method: "DELETE" },
  );
}

export type SuperAdminMe = {
  superAdminId: string;
  email: string;
  name: string;
};

export async function fetchSuperAdminMe(): Promise<SuperAdminMe> {
  return saRequest<SuperAdminMe>("/api/v1/super-admin/me", { method: "GET" });
}

export async function changeSuperAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await saRequest<unknown>("/api/v1/super-admin/me/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export type PlatformIntegrationsRecord = {
  hasDeepseekApiKey: boolean;
  deepseekHost: string;
  deepseekUrl: string;
  deepseekModel: string;
  hasRapidapiWhatsappKey: boolean;
  rapidApiWhatsappHost: string;
  rapidApiWhatsappLookupUrl: string;
  rapidApiWhatsappPhoneField: string;
  rapidApiWhatsappPhoneDigitsOnly: boolean;
  smsProvider: string;
  sozuriProject: string;
  sozuriFrom: string;
  sozuriType: string;
  sozuriApiUrl: string;
  hasSozuriApiKey: boolean;
  textsmsPartnerId: string;
  textsmsShortcode: string;
  textsmsApiUrl: string;
  hasTextsmsApiKey: boolean;
  envDeepseekConfigured: boolean;
  envRapidapiWhatsappConfigured: boolean;
  envSozuriConfigured: boolean;
  envTextsmsConfigured: boolean;
  secretsReadable: boolean;
  secretsError: string | null;
  encryptionEphemeral: boolean;
};

export type UpdatePlatformIntegrationsPayload = {
  deepseekApiKey?: string | null;
  deepseekHost?: string | null;
  deepseekUrl?: string | null;
  deepseekModel?: string | null;
  rapidApiWhatsappKey?: string | null;
  rapidApiWhatsappHost?: string | null;
  rapidApiWhatsappLookupUrl?: string | null;
  rapidApiWhatsappPhoneField?: string | null;
  rapidApiWhatsappPhoneDigitsOnly?: boolean | null;
  smsProvider?: string | null;
  sozuriProject?: string | null;
  sozuriApiKey?: string | null;
  sozuriFrom?: string | null;
  sozuriType?: string | null;
  sozuriApiUrl?: string | null;
  textsmsPartnerId?: string | null;
  textsmsApiKey?: string | null;
  textsmsShortcode?: string | null;
  textsmsApiUrl?: string | null;
};

export async function fetchPlatformIntegrations(): Promise<PlatformIntegrationsRecord> {
  return saRequest<PlatformIntegrationsRecord>(API_ROUTES.superAdminPlatformIntegrations);
}

export async function updatePlatformIntegrations(
  body: UpdatePlatformIntegrationsPayload,
): Promise<PlatformIntegrationsRecord> {
  return saRequest<PlatformIntegrationsRecord>(API_ROUTES.superAdminPlatformIntegrations, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function fetchSaBusinessUsers(
  businessId: string,
): Promise<SaBusinessUserRow[]> {
  return saRequest<SaBusinessUserRow[]>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/users`,
    { method: "GET" },
  );
}

export async function fetchSaBusinessStats(
  businessId: string,
): Promise<SaBusinessStats> {
  return saRequest<SaBusinessStats>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/stats`,
    { method: "GET" },
  );
}

export type SaImpersonateResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    businessId: string;
    branchId: string | null;
    roleId: string;
    status: string;
  };
  businessId: string;
  slug: string;
  primaryDomain: string | null;
  impersonatedBy: string;
  expiresInSeconds: number;
};

/** Mint a short-lived tenant session as owner (or a chosen user). */
export async function impersonateSaBusiness(
  businessId: string,
  userId?: string,
): Promise<SaImpersonateResult> {
  return saRequest<SaImpersonateResult>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/impersonate`,
    {
      method: "POST",
      body: JSON.stringify(userId ? { userId } : {}),
    },
  );
}

export type SaCatalogSummary = {
  id: string;
  code: string;
  name: string;
  regionCode: string | null;
  currency: string;
  status: string;
  version: number;
};

export async function fetchSaCatalogs(): Promise<SaCatalogSummary[]> {
  return saRequest<SaCatalogSummary[]>(`${API_ROUTES.superAdminGlobalCatalog}/catalogs`);
}

function withCatalogId(query: URLSearchParams, catalogId?: string | null): void {
  if (catalogId?.trim()) query.set("catalogId", catalogId.trim());
}

function catalogQuerySuffix(catalogId?: string | null): string {
  if (!catalogId?.trim()) return "";
  return `?catalogId=${encodeURIComponent(catalogId.trim())}`;
}

export type SaGlobalCatalogMeta = {
  catalogId: string;
  catalogCode: string;
  catalogName: string;
  regionCode: string | null;
  currency: string;
  productCount: number;
  missingImageCount: number;
  draftCount: number;
  publishedCount: number;
  archivedCount: number;
  categories: SaGlobalCategory[];
  packs: SaGlobalPackSummary[];
};

export type SaGlobalCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  tenantCategorySlugHint: string | null;
  position: number;
  active: boolean;
};

export type SaGlobalPackSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  storeKitId: string | null;
  status: string;
  sortOrder: number;
  productCount: number;
  imagedProductCount: number;
};

export type SaGlobalPackDetail = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  storeKitId: string | null;
  status: string;
  sortOrder: number;
  productIds: string[];
};

export type SaGlobalProduct = {
  id: string;
  catalogId: string;
  globalCategoryId: string | null;
  skuTemplate: string | null;
  name: string;
  brand: string | null;
  size: string | null;
  description: string | null;
  barcode: string | null;
  unitType: string;
  weighed: boolean;
  sellable: boolean;
  stocked: boolean;
  recommendedBuyingPrice: number | null;
  recommendedSellingPrice: number | null;
  suggestedMarginPct: number | null;
  defaultReorderLevel: number | null;
  defaultReorderQty: number | null;
  defaultMinStockLevel: number | null;
  hasExpiry: boolean;
  expiresAfterDays: number | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  itemTypeKeyHint: string | null;
  status: string;
  sortOrder: number;
  version: number;
  barcodeDuplicateWarning: boolean;
};

export type SaPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export async function fetchSaGlobalCatalogMeta(
  catalogId?: string | null,
): Promise<SaGlobalCatalogMeta> {
  return saRequest<SaGlobalCatalogMeta>(
    `${API_ROUTES.superAdminGlobalCatalog}/meta${catalogQuerySuffix(catalogId)}`,
  );
}

export async function fetchSaGlobalProducts(params: {
  catalogId?: string | null;
  q?: string;
  status?: string;
  categoryId?: string;
  missingImage?: boolean;
  page?: number;
  size?: number;
}): Promise<SaPage<SaGlobalProduct>> {
  const query = new URLSearchParams();
  withCatalogId(query, params.catalogId);
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.status?.trim()) query.set("status", params.status.trim());
  if (params.categoryId?.trim()) query.set("categoryId", params.categoryId.trim());
  if (params.missingImage) query.set("missingImage", "true");
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 50));
  return saRequest<SaPage<SaGlobalProduct>>(
    `${API_ROUTES.superAdminGlobalCatalog}/products?${query.toString()}`,
  );
}

export async function fetchSaGlobalProduct(
  id: string,
  catalogId?: string | null,
): Promise<SaGlobalProduct> {
  return saRequest<SaGlobalProduct>(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${id}${catalogQuerySuffix(catalogId)}`,
  );
}

export async function patchSaGlobalProduct(
  id: string,
  body: Partial<SaGlobalProduct> & { version: number },
  catalogId?: string | null,
): Promise<SaGlobalProduct> {
  return saRequest<SaGlobalProduct>(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${id}${catalogQuerySuffix(catalogId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function createSaGlobalProduct(
  body: {
    name: string;
    status?: string;
    unitType?: string;
    barcode?: string | null;
    brand?: string | null;
    size?: string | null;
    globalCategoryId?: string | null;
  },
  catalogId?: string | null,
): Promise<SaGlobalProduct> {
  return saRequest<SaGlobalProduct>(
    `${API_ROUTES.superAdminGlobalCatalog}/products${catalogQuerySuffix(catalogId)}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function publishSaGlobalProducts(
  ids: string[],
): Promise<{ publishedCount: number; publishedIds: string[]; skippedIds: string[] }> {
  return saRequest(`${API_ROUTES.superAdminGlobalCatalog}/products/publish`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export type SaApplyMarginResult = {
  updatedCount: number;
  skippedCount: number;
  updatedIds: string[];
  skippedIds: string[];
};

export async function applySaGlobalProductMargins(
  body: {
    ids: string[];
    marginPct: number;
    mode?: "fromBuying" | "fromSelling";
  },
  catalogId?: string | null,
): Promise<SaApplyMarginResult> {
  return saRequest(
    `${API_ROUTES.superAdminGlobalCatalog}/products/apply-margin${catalogQuerySuffix(catalogId)}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function uploadSaGlobalProductImage(
  id: string,
  file: File,
  catalogId?: string | null,
): Promise<SaGlobalProduct> {
  const token = getSuperAdminAccessToken();
  if (!token) {
    throw new Error("Super-admin session expired. Sign in again.");
  }
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(
    apiUrl(
      `${API_ROUTES.superAdminGlobalCatalog}/products/${id}/image${catalogQuerySuffix(catalogId)}`,
    ),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  if (response.status === 401) {
    clearSuperAdminSession();
    window.location.assign(APP_ROUTES.superAdminLogin);
    throw new Error("Super-admin session expired. Sign in again.");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed (${response.status})`);
  }
  return (await response.json()) as SaGlobalProduct;
}

export async function clearSaGlobalProductImage(
  id: string,
  catalogId?: string | null,
): Promise<SaGlobalProduct> {
  return saRequest<SaGlobalProduct>(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${id}/image${catalogQuerySuffix(catalogId)}`,
    { method: "DELETE" },
  );
}

export async function backfillSaGlobalProductImages(
  productId: string,
  opts?: { limit?: number; catalogId?: string | null },
): Promise<{
  productsProcessed: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  warnings: string[];
}> {
  return saRequest(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${productId}/backfill-images${catalogQuerySuffix(opts?.catalogId)}`,
    {
      method: "POST",
      body: JSON.stringify({ limit: opts?.limit ?? 100 }),
    },
  );
}

export async function fetchSaGlobalCategories(
  catalogId?: string | null,
): Promise<SaGlobalCategory[]> {
  return saRequest<SaGlobalCategory[]>(
    `${API_ROUTES.superAdminGlobalCatalog}/categories${catalogQuerySuffix(catalogId)}`,
  );
}

export async function createSaGlobalCategory(
  body: {
    name: string;
    slug?: string;
    tenantCategorySlugHint?: string;
    parentId?: string;
    position?: number;
    active?: boolean;
  },
  catalogId?: string | null,
): Promise<SaGlobalCategory> {
  return saRequest<SaGlobalCategory>(
    `${API_ROUTES.superAdminGlobalCatalog}/categories${catalogQuerySuffix(catalogId)}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function patchSaGlobalCategory(
  id: string,
  body: {
    name: string;
    slug?: string;
    tenantCategorySlugHint?: string;
    parentId?: string;
    position?: number;
    active?: boolean;
  },
  catalogId?: string | null,
): Promise<SaGlobalCategory> {
  return saRequest<SaGlobalCategory>(
    `${API_ROUTES.superAdminGlobalCatalog}/categories/${id}${catalogQuerySuffix(catalogId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function fetchSaGlobalPack(
  id: string,
  catalogId?: string | null,
): Promise<SaGlobalPackDetail> {
  return saRequest<SaGlobalPackDetail>(
    `${API_ROUTES.superAdminGlobalCatalog}/packs/${id}${catalogQuerySuffix(catalogId)}`,
  );
}

export async function patchSaGlobalPack(
  id: string,
  body: {
    name?: string;
    description?: string | null;
    storeKitId?: string | null;
    status?: string;
    sortOrder?: number;
    productIds?: string[];
  },
  catalogId?: string | null,
): Promise<SaGlobalPackDetail> {
  return saRequest<SaGlobalPackDetail>(
    `${API_ROUTES.superAdminGlobalCatalog}/packs/${id}${catalogQuerySuffix(catalogId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export type SaCsvImportResult = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  warnings: string[];
};

export async function exportSaGlobalProductsCsv(params?: {
  catalogId?: string | null;
  status?: string;
  missingImage?: boolean;
}): Promise<Blob> {
  const token = getSuperAdminAccessToken();
  if (!token) {
    throw new Error("Super-admin session expired. Sign in again.");
  }
  const query = new URLSearchParams();
  withCatalogId(query, params?.catalogId);
  if (params?.status) query.set("status", params.status);
  if (params?.missingImage) query.set("missingImage", "true");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  let response: Response;
  try {
    response = await fetch(
      apiUrl(`${API_ROUTES.superAdminGlobalCatalog}/products/export.csv${suffix}`),
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch {
    throw new Error(getNetworkErrorMessage());
  }
  if (response.status === 401) {
    clearSuperAdminSession();
    if (typeof window !== "undefined") {
      window.location.assign(APP_ROUTES.superAdminLogin);
    }
    throw new Error("Session expired. Sign in again.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getProblemTitle(payload));
  }
  return response.blob();
}

export async function importSaGlobalProductsCsv(
  file: File,
  catalogId?: string | null,
): Promise<SaCsvImportResult> {
  const token = getSuperAdminAccessToken();
  if (!token) {
    throw new Error("Super-admin session expired. Sign in again.");
  }
  const form = new FormData();
  form.append("file", file);
  let response: Response;
  try {
    response = await fetch(
      apiUrl(`${API_ROUTES.superAdminGlobalCatalog}/products/import${catalogQuerySuffix(catalogId)}`),
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
    );
  } catch {
    throw new Error(getNetworkErrorMessage());
  }
  if (response.status === 401) {
    clearSuperAdminSession();
    if (typeof window !== "undefined") {
      window.location.assign(APP_ROUTES.superAdminLogin);
    }
    throw new Error("Session expired. Sign in again.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getProblemTitle(payload));
  }
  return (await response.json()) as SaCsvImportResult;
}

export type SaSourceBusiness = {
  id: string;
  name: string;
  slug: string;
  preferred: boolean;
};

export type SaSourceItem = {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  size: string | null;
  barcode: string | null;
  imageUrl: string | null;
  alreadyInGlobal: boolean;
  matchedGlobalProductId: string | null;
};

export type SaPromoteLine = {
  sourceItemId: string;
  globalProductId: string | null;
  action: string;
  reason: string | null;
  imageRehosted: boolean;
};

export type SaPromoteResult = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  imageRehostCount: number;
  lines: SaPromoteLine[];
};

export async function fetchSaSourceBusinesses(): Promise<SaSourceBusiness[]> {
  return saRequest<SaSourceBusiness[]>(
    `${API_ROUTES.superAdminGlobalCatalog}/source-businesses`,
  );
}

export async function fetchSaSourceItems(params: {
  businessId: string;
  catalogId?: string | null;
  q?: string;
  page?: number;
  size?: number;
}): Promise<SaPage<SaSourceItem>> {
  const query = new URLSearchParams();
  query.set("businessId", params.businessId);
  withCatalogId(query, params.catalogId);
  if (params.q?.trim()) query.set("q", params.q.trim());
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 50));
  return saRequest<SaPage<SaSourceItem>>(
    `${API_ROUTES.superAdminGlobalCatalog}/source-items?${query.toString()}`,
  );
}

const SOURCE_ID_FETCH_PAGE_SIZE = 100;
const SOURCE_ID_FETCH_MAX = 10_000;

/** Collects matching source item ids across pages (for promote-all). */
export async function fetchAllSaSourceItemIds(params: {
  businessId: string;
  catalogId?: string | null;
  q?: string;
}): Promise<string[]> {
  const ids: string[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages && ids.length < SOURCE_ID_FETCH_MAX) {
    const result = await fetchSaSourceItems({
      businessId: params.businessId,
      catalogId: params.catalogId,
      q: params.q,
      page,
      size: SOURCE_ID_FETCH_PAGE_SIZE,
    });
    totalPages = Math.max(1, result.totalPages ?? 1);
    for (const row of result.content ?? []) {
      if (row.id) ids.push(row.id);
      if (ids.length >= SOURCE_ID_FETCH_MAX) break;
    }
    page += 1;
  }
  return ids;
}

export async function previewSaPromote(body: {
  sourceBusinessId: string;
  itemIds: string[];
  onConflict?: "update" | "skip";
  publish?: boolean;
  catalogId?: string | null;
}): Promise<SaPromoteResult> {
  return saRequest<SaPromoteResult>(`${API_ROUTES.superAdminGlobalCatalog}/promote/preview`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const SYNC_PROMOTE_MAX_ITEMS = 25;
const JOB_PROMOTE_MAX_ITEMS = 500;
const PROMOTE_JOB_POLL_MS = 1200;
/** Fail only when the job stops making progress, not on a fixed wall clock. */
const PROMOTE_JOB_STALL_TIMEOUT_MS = 3 * 60 * 1000;

export type SaPromoteProgress = {
  phase: "queued" | "processing" | "finalizing";
  /** Items processed within the whole promote (across chunks). */
  processed: number;
  total: number;
  /** Live status line from the worker, e.g. "Promoting 137 of 500 — Coca Cola 500ml". */
  message: string | null;
  chunkIndex: number;
  chunkCount: number;
};

export type SaGlobalCatalogJobStatus = {
  id: string;
  kind: string;
  status: "pending" | "processing" | "completed" | "failed" | string;
  businessId: string | null;
  rowsTotal: number | null;
  rowsProcessed: number;
  rowsCommitted: number | null;
  statusMessage: string | null;
  result: SaPromoteResult | null;
  createdAt: string;
  completedAt: string | null;
};

async function enqueueSaPromoteJob(body: {
  sourceBusinessId: string;
  itemIds: string[];
  onConflict?: "update" | "skip";
  publish?: boolean;
  catalogId?: string | null;
}): Promise<string> {
  const created = await saRequest<{ jobId: string }>(
    `${API_ROUTES.superAdminGlobalCatalog}/promote/jobs`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return created.jobId;
}

async function fetchSaPromoteJob(jobId: string): Promise<SaGlobalCatalogJobStatus> {
  return saRequest<SaGlobalCatalogJobStatus>(
    `${API_ROUTES.superAdminGlobalCatalog}/promote/jobs/${encodeURIComponent(jobId)}`,
  );
}

async function waitForSaPromoteJob(
  jobId: string,
  onJobUpdate?: (job: SaGlobalCatalogJobStatus) => void,
): Promise<SaPromoteResult> {
  let lastMovementAt = Date.now();
  let lastSignature = "";
  for (;;) {
    const job = await fetchSaPromoteJob(jobId);
    onJobUpdate?.(job);
    if (job.status === "completed") {
      if (!job.result) {
        throw new Error(job.statusMessage || "Promote job completed without a result.");
      }
      return job.result;
    }
    if (job.status === "failed") {
      throw new Error(job.statusMessage || "Promote job failed.");
    }
    const signature = `${job.status}:${job.rowsProcessed}:${job.statusMessage ?? ""}`;
    if (signature !== lastSignature) {
      lastSignature = signature;
      lastMovementAt = Date.now();
    } else if (Date.now() - lastMovementAt > PROMOTE_JOB_STALL_TIMEOUT_MS) {
      throw new Error(
        "Promote job stalled (no progress for 3 minutes). It may still finish in the background — refresh to check.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, PROMOTE_JOB_POLL_MS));
  }
}

export async function commitSaPromote(
  body: {
    sourceBusinessId: string;
    itemIds: string[];
    onConflict?: "update" | "skip";
    publish?: boolean;
    catalogId?: string | null;
  },
  onProgress?: (progress: SaPromoteProgress) => void,
): Promise<SaPromoteResult> {
  const total = body.itemIds.length;
  if (total <= SYNC_PROMOTE_MAX_ITEMS) {
    onProgress?.({
      phase: "processing",
      processed: 0,
      total,
      message: null,
      chunkIndex: 0,
      chunkCount: 1,
    });
    return saRequest<SaPromoteResult>(`${API_ROUTES.superAdminGlobalCatalog}/promote`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  const chunks: string[][] = [];
  for (let i = 0; i < body.itemIds.length; i += JOB_PROMOTE_MAX_ITEMS) {
    chunks.push(body.itemIds.slice(i, i + JOB_PROMOTE_MAX_ITEMS));
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let imageRehostCount = 0;
  const lines: SaPromoteLine[] = [];
  let completedBefore = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const itemIds = chunks[chunkIndex];
    const baseProcessed = completedBefore;
    onProgress?.({
      phase: "queued",
      processed: baseProcessed,
      total,
      message: "Waiting for background worker…",
      chunkIndex,
      chunkCount: chunks.length,
    });
    const chunkResult = await waitForSaPromoteJob(
      await enqueueSaPromoteJob({ ...body, itemIds }),
      (job) => {
        onProgress?.({
          phase: job.status === "pending" ? "queued" : "processing",
          processed: baseProcessed + (job.rowsProcessed ?? 0),
          total,
          message: job.statusMessage,
          chunkIndex,
          chunkCount: chunks.length,
        });
      },
    );
    completedBefore += itemIds.length;
    createdCount += chunkResult.createdCount;
    updatedCount += chunkResult.updatedCount;
    skippedCount += chunkResult.skippedCount;
    imageRehostCount += chunkResult.imageRehostCount;
    lines.push(...(chunkResult.lines ?? []));
  }

  onProgress?.({
    phase: "finalizing",
    processed: total,
    total,
    message: "Wrapping up…",
    chunkIndex: chunks.length - 1,
    chunkCount: chunks.length,
  });
  return { createdCount, updatedCount, skippedCount, imageRehostCount, lines };
}

export type SaSupplierTemplate = {
  id: string;
  catalogId: string;
  code: string;
  name: string;
  supplierType: string;
  vatPin: string | null;
  notes: string | null;
  tenantSupplierCodeHint: string;
};

export type SaProductSupplierLink = {
  globalProductId: string;
  globalSupplierTemplateId: string;
  templateCode: string | null;
  templateName: string | null;
  primary: boolean;
  defaultCostPrice: number | null;
  supplierSku: string | null;
};

export async function fetchSaSupplierTemplates(
  catalogId?: string | null,
): Promise<SaSupplierTemplate[]> {
  return saRequest<SaSupplierTemplate[]>(
    `${API_ROUTES.superAdminGlobalCatalog}/suppliers${catalogQuerySuffix(catalogId)}`,
  );
}

export async function createSaSupplierTemplate(
  body: {
    code: string;
    name: string;
    supplierType?: string;
    vatPin?: string;
    notes?: string;
  },
  catalogId?: string | null,
): Promise<SaSupplierTemplate> {
  return saRequest<SaSupplierTemplate>(
    `${API_ROUTES.superAdminGlobalCatalog}/suppliers${catalogQuerySuffix(catalogId)}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function patchSaSupplierTemplate(
  id: string,
  body: {
    name?: string;
    supplierType?: string;
    vatPin?: string | null;
    notes?: string | null;
  },
  catalogId?: string | null,
): Promise<SaSupplierTemplate> {
  return saRequest<SaSupplierTemplate>(
    `${API_ROUTES.superAdminGlobalCatalog}/suppliers/${id}${catalogQuerySuffix(catalogId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function fetchSaProductSupplierLinks(
  productId: string,
): Promise<SaProductSupplierLink[]> {
  return saRequest<SaProductSupplierLink[]>(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${productId}/suppliers`,
  );
}

export async function upsertSaProductSupplierLink(
  productId: string,
  body: {
    globalSupplierTemplateId: string;
    primary?: boolean;
    defaultCostPrice?: number | null;
    supplierSku?: string | null;
  },
): Promise<SaProductSupplierLink> {
  return saRequest<SaProductSupplierLink>(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${productId}/suppliers`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}

export async function deleteSaProductSupplierLink(
  productId: string,
  templateId: string,
): Promise<void> {
  await saRequest(`${API_ROUTES.superAdminGlobalCatalog}/products/${productId}/suppliers/${templateId}`, {
    method: "DELETE",
  });
}

