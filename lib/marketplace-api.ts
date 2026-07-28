import { API_ROUTES, apiUrl } from "@/lib/config";
import { buildRequestHeaders } from "@/lib/api";
import { getProblemTitle } from "@/lib/problem";
import { extractPageContent, extractSpringPageMeta } from "@/lib/page-content";
import { getSessionTokens } from "@/lib/auth";
import {
  clearSupplierPortalSession,
  getSupplierPortalAccessToken,
  setSupplierPortalAccessToken,
  setSupplierPortalSessionId,
} from "@/lib/supplier-portal-session";
import type { ItemsPageResult } from "@/lib/api";

// —— Public directory ——

export type MarketplaceSupplierSearchRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  supplierType: string | null;
  listedBy: string | null;
  location: string | null;
  locations: string[];
  productCount: number;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  paymentMethodPreferred: string | null;
  payoutType: string | null;
  deliveryRegions: string[];
  categoryTags: string[];
};

export type MarketplaceProductSearchRow = {
  productId: string;
  productName: string;
  productSlug: string | null;
  barcode: string | null;
  sku: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  supplierId: string;
  supplierName: string;
  supplierSlug: string | null;
  supplierType: string | null;
  supplierProductCount: number;
  location: string | null;
  locations: string[];
  packSize: number | null;
  packUnit: string | null;
  minOrderQty: number | null;
  unitPrice: number | null;
  currency: string | null;
  available: boolean;
};

export type MarketplaceContactPreview = {
  name: string | null;
  roleLabel: string | null;
  phone: string | null;
  email: string | null;
  primaryContact: boolean;
};

export type MarketplaceSupplierDetail = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  supplierType: string | null;
  listedBy: string | null;
  location: string | null;
  locations: string[];
  status: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contacts: MarketplaceContactPreview[];
  paymentMethodPreferred: string | null;
  paymentDetails: string | null;
  payoutType: string | null;
  payoutPhone: string | null;
  creditTermsDays: number | null;
  deliveryRegions: string[];
  categoryTags: string[];
  products: MarketplaceCatalogProductPreview[];
};

export type MarketplaceCatalogProductPreview = {
  id: string;
  name: string;
  slug: string | null;
  barcode: string | null;
  sku: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  packSize: number | null;
  packUnit: string | null;
  minOrderQty: number | null;
  unitPrice: number | null;
  currency: string | null;
  available: boolean;
  itemId?: string | null;
  variantOfItemId?: string | null;
  parentItemName?: string | null;
  parentImageUrl?: string | null;
};

export type MarketplaceConnectResult = {
  connectionId: string;
  localSupplierId: string;
  marketplaceSupplierId: string;
  supplierName: string;
  importedProductLinks: number;
  status: string;
};

export type MarketplaceAttachResult = {
  connectionId: string;
  localSupplierId: string;
  marketplaceSupplierId: string;
  supplierNumber: string | null;
  supplierName: string;
  linkedExisting: number;
  createdItems: number;
  alreadyLinked: number;
  skipped: number;
  status: string;
};

export type SupplierDuplicateMatch = {
  confidence: string;
  source: string;
  localSupplierId: string | null;
  marketplaceSupplierId: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  regionHint: string | null;
  supplierNumber: string | null;
  /** phone_last9 | email | name | tax_id | supplier_number */
  matchReasons?: string[] | null;
};

// —— Supplier portal ——

export type SupplierPortalLoginResult = {
  accessToken: string;
  sessionId?: string | null;
  userId: string;
  marketplaceSupplierId: string;
  email: string | null;
  phone: string | null;
  name: string;
};

export type SupplierPortalProfile = {
  marketplaceSupplierId: string;
  name: string;
  username: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  deliveryRegions: string[];
  categoryTags: string[];
  publicHubPath: string | null;
  linkedShops: SupplierPortalLinkedShop[];
};

export type SupplierPortalLinkedShop = {
  connectionId: string;
  businessId: string;
  shopName: string;
  localSupplierId: string;
  localSupplierName: string;
  status: string;
};

export type SupplierPortalLinkCandidate = {
  localSupplierId: string;
  businessId: string;
  shopName: string;
  supplierName: string;
  matchReason: string;
};

export type SupplierPortalProduct = {
  id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  categoryName: string | null;
  description: string | null;
  packSize: number | null;
  packUnit: string | null;
  minOrderQty: number | null;
  unitPrice: number | null;
  currency: string | null;
  available: boolean;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  pendingEditId?: string | null;
  pendingProposed?: Record<string, unknown> | null;
  imageUrl?: string | null;
};

export type SupplierPortalOrderRow = {
  purchaseOrderId: string;
  businessId: string;
  businessName: string;
  poNumber: string;
  expectedDate: string | null;
  status: string;
  sentToSupplierAt: string | null;
  supplierResponseAt: string | null;
  deliveryStatus: string | null;
  lineCount: number;
};

export type SupplierPortalOrderLine = {
  lineId: string;
  itemId: string;
  itemName: string;
  itemSku: string | null;
  qtyOrdered: number;
  qtyReceived: number;
  unitEstimatedCost: number | null;
  supplierLineStatus: string | null;
  qtyAccepted: number | null;
  supplierNote: string | null;
};

export type SupplierPortalShopProduct = {
  itemId: string;
  itemName: string;
  sku: string | null;
  barcode: string | null;
  thumbnailUrl: string | null;
  currentStock: number | null;
  defaultCostPrice: number | null;
  lastCostPrice: number | null;
  packSize: number | null;
  packUnit: string | null;
  variantName: string | null;
  parentItemName: string | null;
};

export type SupplierPortalOrderDetail = {
  purchaseOrderId: string;
  businessId: string;
  businessName: string;
  poNumber: string;
  expectedDate: string | null;
  status: string;
  notes: string | null;
  sentToSupplierAt: string | null;
  supplierResponseAt: string | null;
  deliveryStatus: string | null;
  lines: SupplierPortalOrderLine[];
};

async function publicFetch<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path));
  } catch {
    throw new Error("Cannot reach the marketplace API.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getProblemTitle(payload));
  }
  return payload as T;
}

async function tenantFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase() as
    | "GET"
    | "POST"
    | "PATCH"
    | "PUT"
    | "DELETE";
  const tokens = getSessionTokens();
  const headers = buildRequestHeaders(true, tokens?.accessToken, method);
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      method,
      headers,
      credentials: "include",
      body: init.body,
    });
  } catch {
    throw new Error("Cannot reach the marketplace API.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getProblemTitle(payload));
  }
  return payload as T;
}

async function supplierPortalFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getSupplierPortalAccessToken();
  if (!token) {
    throw new Error("Supplier session expired. Sign in again.");
  }
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  if (init.headers && typeof init.headers === "object" && !Array.isArray(init.headers)) {
    Object.assign(headers, init.headers as Record<string, string>);
  }
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...init, method, headers, body: init.body });
  } catch {
    throw new Error("Cannot reach the supplier portal API.");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getProblemTitle(payload));
  }
  return payload as T;
}

function toPageResult<T>(raw: unknown, size: number): ItemsPageResult<T> {
  const content = extractPageContent<T>(raw);
  const meta = extractSpringPageMeta(raw);
  if (!meta) {
    return {
      content,
      totalElements: content.length,
      totalPages: content.length > 0 ? 1 : 0,
      number: 0,
      size,
      last: true,
      first: true,
    };
  }
  return { content, ...meta };
}

export async function searchMarketplaceSuppliers(opts?: {
  q?: string;
  location?: string;
  page?: number;
  size?: number;
}): Promise<ItemsPageResult<MarketplaceSupplierSearchRow>> {
  const params = new URLSearchParams();
  params.set("page", String(opts?.page ?? 0));
  params.set("size", String(opts?.size ?? 40));
  if (opts?.q?.trim()) {
    params.set("q", opts.q.trim());
  }
  if (opts?.location?.trim()) {
    params.set("location", opts.location.trim());
  }
  const raw = await publicFetch<unknown>(
    `${API_ROUTES.publicMarketplace}/suppliers/search?${params}`,
  );
  return toPageResult<MarketplaceSupplierSearchRow>(raw, opts?.size ?? 40);
}

export async function listMarketplaceLocations(): Promise<string[]> {
  const raw = await publicFetch<unknown>(
    `${API_ROUTES.publicMarketplace}/locations`,
  );
  return Array.isArray(raw)
    ? raw.filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
    : [];
}

export async function searchMarketplaceProducts(opts?: {
  q?: string;
  location?: string;
  supplierId?: string;
  page?: number;
  size?: number;
}): Promise<ItemsPageResult<MarketplaceProductSearchRow>> {
  const params = new URLSearchParams();
  params.set("page", String(opts?.page ?? 0));
  params.set("size", String(opts?.size ?? 40));
  if (opts?.q?.trim()) {
    params.set("q", opts.q.trim());
  }
  if (opts?.location?.trim()) {
    params.set("location", opts.location.trim());
  }
  if (opts?.supplierId?.trim()) {
    params.set("supplierId", opts.supplierId.trim());
  }
  const raw = await publicFetch<unknown>(
    `${API_ROUTES.publicMarketplace}/products/search?${params}`,
  );
  return toPageResult<MarketplaceProductSearchRow>(raw, opts?.size ?? 40);
}

export async function fetchMarketplaceSupplierDetail(
  supplierId: string,
): Promise<MarketplaceSupplierDetail> {
  return publicFetch<MarketplaceSupplierDetail>(
    `${API_ROUTES.publicMarketplace}/suppliers/${encodeURIComponent(supplierId)}`,
  );
}

export async function fetchMarketplaceSupplierBySlug(
  slug: string,
): Promise<MarketplaceSupplierDetail> {
  return publicFetch<MarketplaceSupplierDetail>(
    `${API_ROUTES.publicMarketplace}/s/${encodeURIComponent(slug)}`,
  );
}

export async function tryFetchMarketplaceSupplierBySlug(
  slug: string,
): Promise<MarketplaceSupplierDetail | null> {
  try {
    return await fetchMarketplaceSupplierBySlug(slug);
  } catch {
    return null;
  }
}

export async function fetchMarketplaceProductBySlug(
  supplierSlug: string,
  productSlug: string,
): Promise<MarketplaceSupplierDetail> {
  return publicFetch<MarketplaceSupplierDetail>(
    `${API_ROUTES.publicMarketplace}/s/${encodeURIComponent(supplierSlug)}/p/${encodeURIComponent(productSlug)}`,
  );
}

export async function tryFetchMarketplaceProductBySlug(
  supplierSlug: string,
  productSlug: string,
): Promise<MarketplaceSupplierDetail | null> {
  try {
    return await fetchMarketplaceProductBySlug(supplierSlug, productSlug);
  } catch {
    return null;
  }
}

export async function connectMarketplaceSupplier(
  supplierId: string,
): Promise<MarketplaceConnectResult> {
  return tenantFetch<MarketplaceConnectResult>(
    `${API_ROUTES.marketplace}/suppliers/${supplierId}/connect`,
    { method: "POST" },
  );
}

export async function attachMarketplaceSupplier(
  marketplaceSupplierId: string,
): Promise<MarketplaceAttachResult> {
  return tenantFetch<MarketplaceAttachResult>(
    `${API_ROUTES.marketplace}/suppliers/${encodeURIComponent(marketplaceSupplierId)}/attach`,
    { method: "POST" },
  );
}

export async function attachMarketplaceSupplierByNumber(
  supplierNumber: string,
): Promise<MarketplaceAttachResult> {
  return tenantFetch<MarketplaceAttachResult>(
    `${API_ROUTES.marketplace}/suppliers/attach-by-number`,
    {
      method: "POST",
      body: JSON.stringify({ supplierNumber }),
    },
  );
}

export async function attachMarketplaceSupplierFromSeed(
  sourceLocalSupplierId: string,
): Promise<MarketplaceAttachResult> {
  return tenantFetch<MarketplaceAttachResult>(
    `${API_ROUTES.marketplace}/suppliers/attach-from-seed`,
    {
      method: "POST",
      body: JSON.stringify({ sourceLocalSupplierId }),
    },
  );
}

export async function checkSupplierDuplicates(body: {
  query?: string;
  name?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  supplierNumber?: string;
}): Promise<{ matches: SupplierDuplicateMatch[] }> {
  return tenantFetch<{ matches: SupplierDuplicateMatch[] }>(
    "/api/v1/suppliers/duplicate-check",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function loginSupplierPortal(
  identifier: string,
  password: string,
): Promise<SupplierPortalLoginResult> {
  let response: Response;
  try {
    response = await fetch(apiUrl(API_ROUTES.supplierPortalAuthLogin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });
  } catch {
    throw new Error("Cannot reach the supplier portal API.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getProblemTitle(payload));
  }
  const data = payload as SupplierPortalLoginResult;
  if (!data.accessToken) {
    throw new Error("Invalid login response");
  }
  setSupplierPortalAccessToken(data.accessToken);
  if (data.sessionId) {
    setSupplierPortalSessionId(data.sessionId);
  }
  return data;
}

async function publicSupplierAuthFetch<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Cannot reach the supplier portal API.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getProblemTitle(payload));
  }
  return payload as T;
}

export async function sendSupplierPortalClaimCode(phone: string): Promise<{
  phone: string;
  maskedPhone: string;
  expiresAt: string | null;
  channel: string | null;
  alreadyRegistered: boolean;
  devCode?: string | null;
}> {
  return publicSupplierAuthFetch(API_ROUTES.supplierPortalAuthClaimSendCode, {
    phone: phone.trim(),
  });
}

export type SupplierPortalClaimPublicConfig = {
  portalEnabled: boolean;
  claimEnabled: boolean;
  allowSelfClaim: boolean;
  claimMethod: string;
  codeLength: number;
  codeExpiryMinutes: number;
  passwordMinLength: number;
  passwordRequireNumber: boolean;
  passwordRequireUppercase: boolean;
  passwordRequireSpecial: boolean;
  autoLoginAfterSetup: boolean;
};

export async function fetchSupplierPortalClaimConfig(): Promise<SupplierPortalClaimPublicConfig> {
  let response: Response;
  try {
    response = await fetch(apiUrl(API_ROUTES.supplierPortalAuthClaimConfig), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error("Cannot reach the supplier portal API.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getProblemTitle(payload));
  }
  return payload as SupplierPortalClaimPublicConfig;
}

export async function verifySupplierPortalClaimCode(
  phone: string,
  code: string,
): Promise<{ setupToken: string; expiresAt: string; suggestedName: string }> {
  return publicSupplierAuthFetch(API_ROUTES.supplierPortalAuthClaimVerifyCode, {
    phone: phone.trim(),
    code: code.trim(),
  });
}

export async function verifySupplierPortalInviteCode(
  code: string,
  phone?: string,
): Promise<{ setupToken: string; expiresAt: string; suggestedName: string }> {
  return publicSupplierAuthFetch(API_ROUTES.supplierPortalAuthClaimVerifyInvite, {
    code: code.trim(),
    phone: phone?.trim() || undefined,
  });
}

export async function completeSupplierPortalClaim(body: {
  phone: string;
  setupToken: string;
  password: string;
  name?: string;
  email?: string;
  username?: string;
}): Promise<SupplierPortalLoginResult> {
  const data = await publicSupplierAuthFetch<SupplierPortalLoginResult>(
    API_ROUTES.supplierPortalAuthClaimComplete,
    {
      phone: body.phone.trim(),
      setupToken: body.setupToken,
      password: body.password,
      name: body.name?.trim() || undefined,
      email: body.email?.trim() || undefined,
      username: body.username?.trim() || undefined,
    },
  );
  if (data.accessToken) {
    setSupplierPortalAccessToken(data.accessToken);
    if (data.sessionId) {
      setSupplierPortalSessionId(data.sessionId);
    }
  }
  return data;
}

export function logoutSupplierPortal(): void {
  const token = getSupplierPortalAccessToken();
  if (token) {
    void fetch(apiUrl(`${API_ROUTES.supplierPortalSessions}/logout`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  clearSupplierPortalSession();
}

export async function fetchSupplierPortalProfile(): Promise<SupplierPortalProfile> {
  return supplierPortalFetch<SupplierPortalProfile>(API_ROUTES.supplierPortalProfile);
}

export async function patchSupplierPortalProfile(body: {
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  deliveryRegions?: string[];
  categoryTags?: string[];
}): Promise<SupplierPortalProfile> {
  return supplierPortalFetch<SupplierPortalProfile>(API_ROUTES.supplierPortalProfile, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function claimSupplierPortalUsername(
  username: string,
): Promise<SupplierPortalProfile> {
  return supplierPortalFetch<SupplierPortalProfile>(
    `${API_ROUTES.supplierPortalProfile}/username`,
    { method: "POST", body: JSON.stringify({ username }) },
  );
}

export async function fetchSupplierPortalLinkCandidates(): Promise<
  SupplierPortalLinkCandidate[]
> {
  return supplierPortalFetch<SupplierPortalLinkCandidate[]>(
    `${API_ROUTES.supplierPortalProfile}/link-candidates`,
  );
}

export async function linkSupplierPortalLocalSupplier(
  localSupplierId: string,
): Promise<SupplierPortalProfile> {
  return supplierPortalFetch<SupplierPortalProfile>(
    `${API_ROUTES.supplierPortalProfile}/link`,
    { method: "POST", body: JSON.stringify({ localSupplierId }) },
  );
}

export async function fetchSupplierPortalProducts(opts?: {
  q?: string;
  status?: string;
  page?: number;
  size?: number;
}): Promise<ItemsPageResult<SupplierPortalProduct>> {
  const params = new URLSearchParams();
  params.set("page", String(opts?.page ?? 0));
  params.set("size", String(opts?.size ?? 50));
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  if (opts?.status?.trim()) params.set("status", opts.status.trim());
  const raw = await supplierPortalFetch<unknown>(
    `${API_ROUTES.supplierPortalProducts}?${params}`,
  );
  return toPageResult<SupplierPortalProduct>(raw, opts?.size ?? 50);
}

export async function createSupplierPortalProduct(body: {
  name: string;
  barcode?: string;
  sku?: string;
  categoryName?: string;
  description?: string;
  packSize?: number;
  packUnit?: string;
  minOrderQty?: number;
  unitPrice: number;
  currency?: string;
  available?: boolean;
}): Promise<SupplierPortalProduct> {
  return supplierPortalFetch<SupplierPortalProduct>(API_ROUTES.supplierPortalProducts, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchSupplierPortalProduct(
  productId: string,
  body: Record<string, unknown>,
): Promise<SupplierPortalProduct> {
  return supplierPortalFetch<SupplierPortalProduct>(
    `${API_ROUTES.supplierPortalProducts}/${productId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function deleteSupplierPortalProduct(productId: string): Promise<void> {
  await supplierPortalFetch<void>(
    `${API_ROUTES.supplierPortalProducts}/${productId}`,
    { method: "DELETE" },
  );
}

export async function fetchSupplierPortalOrders(): Promise<SupplierPortalOrderRow[]> {
  return supplierPortalFetch<SupplierPortalOrderRow[]>(API_ROUTES.supplierPortalOrders);
}

export async function fetchSupplierPortalShopProducts(
  localSupplierId: string,
): Promise<SupplierPortalShopProduct[]> {
  return supplierPortalFetch<SupplierPortalShopProduct[]>(
    `${API_ROUTES.supplierPortalHub}/shops/${encodeURIComponent(localSupplierId)}/products`,
  );
}

export async function createSupplierPortalOrder(body: {
  localSupplierId: string;
  expectedDate?: string;
  notes?: string;
  lines: Array<{
    itemId: string;
    qtyOrdered: number;
    unitEstimatedCost?: number;
  }>;
}): Promise<SupplierPortalOrderDetail> {
  return supplierPortalFetch<SupplierPortalOrderDetail>(API_ROUTES.supplierPortalOrders, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchSupplierPortalOrder(
  purchaseOrderId: string,
): Promise<SupplierPortalOrderDetail> {
  return supplierPortalFetch<SupplierPortalOrderDetail>(
    `${API_ROUTES.supplierPortalOrders}/${purchaseOrderId}`,
  );
}

export async function respondSupplierPortalOrder(
  purchaseOrderId: string,
  lines: Array<{
    purchaseOrderLineId: string;
    supplierLineStatus: string;
    qtyAccepted?: number | null;
    supplierNote?: string;
  }>,
): Promise<SupplierPortalOrderDetail> {
  return supplierPortalFetch<SupplierPortalOrderDetail>(
    `${API_ROUTES.supplierPortalOrders}/${purchaseOrderId}/respond`,
    { method: "POST", body: JSON.stringify({ lines }) },
  );
}

export async function shipSupplierPortalOrder(
  purchaseOrderId: string,
  body: { deliveryStatus: string; trackingNote?: string },
): Promise<SupplierPortalOrderDetail> {
  return supplierPortalFetch<SupplierPortalOrderDetail>(
    `${API_ROUTES.supplierPortalOrders}/${purchaseOrderId}/ship`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export type SupplierPortalCapabilities = {
  portalEnabled: boolean;
  allowProfileEdits: boolean;
  allowPaymentDetailEdits: boolean;
  allowProductEdits: boolean;
  requireStoreApprovalProductEdits: boolean;
  allowInvoiceDownloads: boolean;
  allowStatementDownloads: boolean;
  roleKey: string;
  permissions: string[];
  canViewMoney: boolean;
  canManageTeam: boolean;
};

export type SupplierPortalHubShops = {
  username: string | null;
  displayName: string;
  shopCount: number;
  currency: string;
  totals: { owed: number | string; paid: number | string; pending: number | string };
  shops: Array<{
    businessId: string;
    shopName: string;
    slugHost: string | null;
    localSupplierId: string;
    owed: number | string;
    paid: number | string;
    pending: number | string;
    lastSupplyAt: string | null;
    tenantPortalPath: string;
  }>;
};

export type SupplierPortalShopDetail = {
  businessId: string;
  shopName: string;
  localSupplierId: string;
  localSupplierName: string;
  currency: string;
  summary: {
    totalSpent: number | string;
    totalPaid: number | string;
    openBalance: number | string;
    partialOpenBalance?: number | string;
    invoiceCount: number;
    lastInvoiceDate: string | null;
  };
  supplies: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    grandTotal: number | string;
    amountPaid: number | string;
    balanceOpen: number | string;
    paymentStatus: string;
    sourceType: string;
    lines: Array<{
      description: string | null;
      quantity: number | string;
      unitCost: number | string;
      lineTotal: number | string;
    }>;
  }>;
};

export type SupplierPortalPaymentRow = {
  paymentId: string;
  businessId: string;
  businessName: string;
  localSupplierId: string;
  paidAt: string;
  paymentMethod: string;
  amount: number | string;
  reference: string | null;
  status: string;
  shopOpenBalance: number | string | null;
};

export type SupplierPortalInvoiceRow = {
  invoiceId: string;
  businessId: string;
  businessName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number | string;
  taxTotal: number | string;
  grandTotal: number | string;
  amountPaid: number | string;
  balanceOpen: number | string;
  paymentStatus: string;
  status: string;
};

export type SupplierPortalPaymentDetails = {
  marketplaceSupplierId: string;
  businessLegalName: string | null;
  paybill: string | null;
  tillNumber: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  mobileMoney: string | null;
  preferredPaymentMethod: string | null;
  taxPin: string | null;
  vatNumber: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  editable: boolean;
};

export async function fetchSupplierPortalCapabilities(): Promise<SupplierPortalCapabilities> {
  return supplierPortalFetch<SupplierPortalCapabilities>(API_ROUTES.supplierPortalCapabilities);
}

export async function fetchSupplierPortalHubShops(): Promise<SupplierPortalHubShops> {
  return supplierPortalFetch<SupplierPortalHubShops>(API_ROUTES.supplierPortalHubShops);
}

export async function fetchSupplierPortalShopDetail(
  localSupplierId: string,
): Promise<SupplierPortalShopDetail> {
  return supplierPortalFetch<SupplierPortalShopDetail>(
    `${API_ROUTES.supplierPortalHub}/shops/${localSupplierId}/supplies`,
  );
}

export async function fetchSupplierPortalPayments(opts?: {
  localSupplierId?: string;
}): Promise<SupplierPortalPaymentRow[]> {
  const params = new URLSearchParams();
  if (opts?.localSupplierId?.trim()) {
    params.set("localSupplierId", opts.localSupplierId.trim());
  }
  const qs = params.toString();
  return supplierPortalFetch<SupplierPortalPaymentRow[]>(
    qs ? `${API_ROUTES.supplierPortalPayments}?${qs}` : API_ROUTES.supplierPortalPayments,
  );
}

export async function fetchSupplierPortalInvoices(): Promise<SupplierPortalInvoiceRow[]> {
  return supplierPortalFetch<SupplierPortalInvoiceRow[]>(API_ROUTES.supplierPortalInvoices);
}

export async function fetchSupplierPortalPaymentDetails(): Promise<SupplierPortalPaymentDetails> {
  return supplierPortalFetch<SupplierPortalPaymentDetails>(API_ROUTES.supplierPortalPaymentDetails);
}

export async function patchSupplierPortalPaymentDetails(
  body: Partial<Omit<SupplierPortalPaymentDetails, "marketplaceSupplierId" | "editable">>,
): Promise<SupplierPortalPaymentDetails> {
  return supplierPortalFetch<SupplierPortalPaymentDetails>(API_ROUTES.supplierPortalPaymentDetails, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type SupplierPortalStatement = {
  localSupplierId: string;
  shopName: string;
  currency: string;
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  openingBalance: number | string;
  closingBalance: number | string;
  periodInvoices: number | string;
  periodPayments: number | string;
  entries: Array<{
    date: string;
    type: string;
    reference: string | null;
    description: string | null;
    debit: number | string;
    credit: number | string;
    balance: number | string;
  }>;
};

export async function fetchSupplierPortalStatement(opts: {
  localSupplierId: string;
  year: number;
  month: number;
}): Promise<SupplierPortalStatement> {
  const params = new URLSearchParams({
    localSupplierId: opts.localSupplierId,
    year: String(opts.year),
    month: String(opts.month),
    format: "json",
  });
  return supplierPortalFetch<SupplierPortalStatement>(
    `${API_ROUTES.supplierPortalStatements}?${params}`,
  );
}

export async function downloadSupplierPortalStatement(opts: {
  localSupplierId: string;
  year: number;
  month: number;
  format: "csv" | "pdf";
}): Promise<void> {
  const token = getSupplierPortalAccessToken();
  if (!token) {
    throw new Error("Sign in required");
  }
  const params = new URLSearchParams({
    localSupplierId: opts.localSupplierId,
    year: String(opts.year),
    month: String(opts.month),
    format: opts.format,
  });
  const response = await fetch(apiUrl(`${API_ROUTES.supplierPortalStatements}?${params}`), {
    headers: { Authorization: `Bearer ${token}`, Accept: "*/*" },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getProblemTitle(payload) || "Download failed");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `statement-${opts.year}-${String(opts.month).padStart(2, "0")}.${opts.format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export type SupplierPortalDeliveryRow = {
  purchaseOrderId: string;
  businessId: string;
  businessName: string;
  poNumber: string;
  expectedDate: string | null;
  sentToSupplierAt: string | null;
  supplierResponseAt: string | null;
  updatedAt: string | null;
  deliveryStatus: string;
  poStatus: string;
  qtyOrdered: number | string;
  qtyReceived: number | string;
};

export async function fetchSupplierPortalDeliveries(): Promise<SupplierPortalDeliveryRow[]> {
  return supplierPortalFetch<SupplierPortalDeliveryRow[]>(API_ROUTES.supplierPortalDeliveries);
}

export type SupplierPortalNotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  createdAt: string;
  readAt: string | null;
};

export type SupplierPortalNotificationPrefs = {
  notifyPoInApp: boolean;
  notifyPoSms: boolean;
  notifyPaymentInApp: boolean;
  notifyPaymentSms: boolean;
  notifyDeliveryInApp: boolean;
};

export async function fetchSupplierPortalNotifications(): Promise<SupplierPortalNotificationRow[]> {
  return supplierPortalFetch<SupplierPortalNotificationRow[]>(
    API_ROUTES.supplierPortalNotifications,
  );
}

export async function markSupplierPortalNotificationRead(id: string): Promise<void> {
  await supplierPortalFetch(`${API_ROUTES.supplierPortalNotifications}/${id}/read`, {
    method: "POST",
  });
}

export async function markAllSupplierPortalNotificationsRead(): Promise<void> {
  await supplierPortalFetch(`${API_ROUTES.supplierPortalNotifications}/read-all`, {
    method: "POST",
  });
}

export async function fetchSupplierPortalNotificationPrefs(): Promise<SupplierPortalNotificationPrefs> {
  return supplierPortalFetch<SupplierPortalNotificationPrefs>(
    `${API_ROUTES.supplierPortalNotifications}/prefs`,
  );
}

export async function patchSupplierPortalNotificationPrefs(
  body: Partial<SupplierPortalNotificationPrefs>,
): Promise<SupplierPortalNotificationPrefs> {
  return supplierPortalFetch<SupplierPortalNotificationPrefs>(
    `${API_ROUTES.supplierPortalNotifications}/prefs`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export type SupplierPortalSessionRow = {
  sessionId: string;
  ip: string | null;
  userAgent: string | null;
  issuedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
  revoked: boolean;
};

export async function fetchSupplierPortalSessions(): Promise<SupplierPortalSessionRow[]> {
  return supplierPortalFetch<SupplierPortalSessionRow[]>(API_ROUTES.supplierPortalSessions);
}

export async function revokeSupplierPortalSession(sessionId: string): Promise<void> {
  await supplierPortalFetch(`${API_ROUTES.supplierPortalSessions}/${sessionId}`, {
    method: "DELETE",
  });
}

export async function logoutAllSupplierPortalSessions(): Promise<void> {
  await supplierPortalFetch(`${API_ROUTES.supplierPortalSessions}/logout-all`, {
    method: "POST",
  });
  clearSupplierPortalSession();
}

export type SupplierPortalTeamUserRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleKey: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  currentUser: boolean;
};

export async function fetchSupplierPortalTeam(): Promise<SupplierPortalTeamUserRow[]> {
  return supplierPortalFetch<SupplierPortalTeamUserRow[]>(API_ROUTES.supplierPortalTeam);
}

export async function createSupplierPortalTeamUser(body: {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  roleKey: string;
}): Promise<SupplierPortalTeamUserRow> {
  return supplierPortalFetch<SupplierPortalTeamUserRow>(API_ROUTES.supplierPortalTeam, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchSupplierPortalTeamUser(
  userId: string,
  body: { roleKey?: string; active?: boolean },
): Promise<SupplierPortalTeamUserRow> {
  return supplierPortalFetch<SupplierPortalTeamUserRow>(
    `${API_ROUTES.supplierPortalTeam}/${userId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function resetSupplierPortalTeamUserPassword(
  userId: string,
  password: string,
): Promise<SupplierPortalTeamUserRow> {
  return supplierPortalFetch<SupplierPortalTeamUserRow>(
    `${API_ROUTES.supplierPortalTeam}/${userId}/reset-password`,
    { method: "POST", body: JSON.stringify({ password }) },
  );
}

export type SupplierPortalMessageRow = {
  id: string;
  businessId: string;
  shopName: string;
  localSupplierId: string | null;
  direction: string;
  authorName: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export async function fetchSupplierPortalMessages(): Promise<SupplierPortalMessageRow[]> {
  return supplierPortalFetch<SupplierPortalMessageRow[]>(API_ROUTES.supplierPortalMessages);
}

export type SupplierPortalMessageShopOption = {
  localSupplierId: string;
  shopName: string;
};

export async function fetchSupplierPortalMessageShops(): Promise<
  SupplierPortalMessageShopOption[]
> {
  return supplierPortalFetch<SupplierPortalMessageShopOption[]>(
    `${API_ROUTES.supplierPortalMessages}/shops`,
  );
}

export async function sendSupplierPortalMessage(body: {
  localSupplierId: string;
  body: string;
}): Promise<SupplierPortalMessageRow> {
  return supplierPortalFetch<SupplierPortalMessageRow>(API_ROUTES.supplierPortalMessages, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function markSupplierPortalMessageRead(messageId: string): Promise<void> {
  await supplierPortalFetch(`${API_ROUTES.supplierPortalMessages}/${messageId}/read`, {
    method: "POST",
  });
}

export async function downloadSupplierPortalReport(
  type: "payments" | "outstanding" | "deliveries",
): Promise<void> {
  const token = getSupplierPortalAccessToken();
  if (!token) {
    throw new Error("Sign in required");
  }
  const response = await fetch(
    apiUrl(`${API_ROUTES.supplierPortalReports}?type=${encodeURIComponent(type)}`),
    { headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" } },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getProblemTitle(payload) || "Download failed");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `supplier-${type}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export type MarketplaceProductEditRequest = {
  id: string;
  marketplaceSupplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  status: string;
  proposed: Record<string, unknown>;
  liveSnapshot: Record<string, unknown>;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export async function fetchMarketplaceProductEditRequests(): Promise<MarketplaceProductEditRequest[]> {
  return tenantFetch<MarketplaceProductEditRequest[]>(API_ROUTES.marketplaceProductEditRequests);
}

export async function approveMarketplaceProductEdit(
  editId: string,
  note?: string,
): Promise<MarketplaceProductEditRequest> {
  return tenantFetch<MarketplaceProductEditRequest>(
    `${API_ROUTES.marketplaceProductEditRequests}/${editId}/approve`,
    { method: "POST", body: JSON.stringify({ note: note || undefined }) },
  );
}

export async function rejectMarketplaceProductEdit(
  editId: string,
  note?: string,
): Promise<MarketplaceProductEditRequest> {
  return tenantFetch<MarketplaceProductEditRequest>(
    `${API_ROUTES.marketplaceProductEditRequests}/${editId}/reject`,
    { method: "POST", body: JSON.stringify({ note: note || undefined }) },
  );
}

// ─── SokoMind Guide (supplier portal) ─────────────────────────────────

export type SupplierPortalAiStatus = {
  enabled: boolean;
  guideEnabled: boolean;
  brainEnabled: boolean;
  eyeEnabled: boolean;
  providerConfigured: boolean;
  primaryProvider: string;
  defaultLocale: string;
};

export type SupplierPortalAiRouteGuide = {
  surface: string;
  title: string;
  summary: string;
  suggestions: string[];
};

export type SupplierPortalAiChatResponse = {
  requestId: string;
  reply: string;
  skill: string;
  surface: string;
  suggestions: string[];
  provider: string;
  model: string;
  latencyMs: number;
  toolsUsed?: string[];
  usedLiveData?: boolean;
  draftBody?: string | null;
};

export async function fetchSupplierPortalAiStatus(): Promise<SupplierPortalAiStatus> {
  return supplierPortalFetch<SupplierPortalAiStatus>(API_ROUTES.supplierPortalAiStatus);
}

export async function fetchSupplierPortalAiRouteGuide(
  route: string,
  surface?: string,
): Promise<SupplierPortalAiRouteGuide> {
  const params = new URLSearchParams();
  if (route) params.set("route", route);
  if (surface) params.set("surface", surface);
  const qs = params.toString();
  return supplierPortalFetch<SupplierPortalAiRouteGuide>(
    `${API_ROUTES.supplierPortalAiRouteGuide}${qs ? `?${qs}` : ""}`,
  );
}

export async function sendSupplierPortalAiChat(body: {
  message: string;
  skill?: string;
  context?: {
    surface?: string;
    route?: string;
    locale?: string;
    entities?: Record<string, string>;
    uiHints?: string[];
  };
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<SupplierPortalAiChatResponse> {
  return supplierPortalFetch<SupplierPortalAiChatResponse>(API_ROUTES.supplierPortalAiChat, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function sendSupplierPortalAiFeedback(
  requestId: string,
  feedback: "up" | "down",
): Promise<void> {
  await supplierPortalFetch(API_ROUTES.supplierPortalAiFeedback, {
    method: "POST",
    body: JSON.stringify({ requestId, feedback }),
  });
}
