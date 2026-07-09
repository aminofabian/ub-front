import { API_ROUTES, apiUrl } from "@/lib/config";
import { buildRequestHeaders } from "@/lib/api";
import { getProblemTitle } from "@/lib/problem";
import { extractPageContent, extractSpringPageMeta } from "@/lib/page-content";
import { getSessionTokens } from "@/lib/auth";
import {
  clearSupplierPortalSession,
  getSupplierPortalAccessToken,
  setSupplierPortalAccessToken,
} from "@/lib/supplier-portal-session";
import type { ItemsPageResult } from "@/lib/api";

// —— Public directory ——

export type MarketplaceSupplierSearchRow = {
  id: string;
  name: string;
  description: string | null;
  deliveryRegions: string[];
  categoryTags: string[];
};

export type MarketplaceProductSearchRow = {
  productId: string;
  productName: string;
  barcode: string | null;
  sku: string | null;
  categoryName: string | null;
  supplierId: string;
  supplierName: string;
  packSize: number | null;
  packUnit: string | null;
  minOrderQty: number | null;
  unitPrice: number | null;
  currency: string | null;
  available: boolean;
};

export type MarketplaceSupplierDetail = {
  id: string;
  name: string;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  deliveryRegions: string[];
  categoryTags: string[];
  products: MarketplaceCatalogProductPreview[];
};

export type MarketplaceCatalogProductPreview = {
  id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  categoryName: string | null;
  packSize: number | null;
  packUnit: string | null;
  minOrderQty: number | null;
  unitPrice: number | null;
  currency: string | null;
  available: boolean;
};

export type MarketplaceConnectResult = {
  connectionId: string;
  localSupplierId: string;
  marketplaceSupplierId: string;
  supplierName: string;
  importedProductLinks: number;
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
};

// —— Supplier portal ——

export type SupplierPortalLoginResult = {
  accessToken: string;
  userId: string;
  marketplaceSupplierId: string;
  email: string;
  name: string;
};

export type SupplierPortalProfile = {
  marketplaceSupplierId: string;
  name: string;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  deliveryRegions: string[];
  categoryTags: string[];
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
  page?: number;
  size?: number;
}): Promise<ItemsPageResult<MarketplaceSupplierSearchRow>> {
  const params = new URLSearchParams();
  params.set("page", String(opts?.page ?? 0));
  params.set("size", String(opts?.size ?? 40));
  if (opts?.q?.trim()) {
    params.set("q", opts.q.trim());
  }
  const raw = await publicFetch<unknown>(
    `${API_ROUTES.publicMarketplace}/suppliers/search?${params}`,
  );
  return toPageResult<MarketplaceSupplierSearchRow>(raw, opts?.size ?? 40);
}

export async function searchMarketplaceProducts(opts?: {
  q?: string;
  page?: number;
  size?: number;
}): Promise<ItemsPageResult<MarketplaceProductSearchRow>> {
  const params = new URLSearchParams();
  params.set("page", String(opts?.page ?? 0));
  params.set("size", String(opts?.size ?? 40));
  if (opts?.q?.trim()) {
    params.set("q", opts.q.trim());
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
    `${API_ROUTES.publicMarketplace}/suppliers/${supplierId}`,
  );
}

export async function connectMarketplaceSupplier(
  supplierId: string,
): Promise<MarketplaceConnectResult> {
  return tenantFetch<MarketplaceConnectResult>(
    `${API_ROUTES.marketplace}/suppliers/${supplierId}/connect`,
    { method: "POST" },
  );
}

export async function checkSupplierDuplicates(body: {
  name?: string;
  phone?: string;
  email?: string;
  taxId?: string;
}): Promise<{ matches: SupplierDuplicateMatch[] }> {
  return tenantFetch<{ matches: SupplierDuplicateMatch[] }>(
    "/api/v1/suppliers/duplicate-check",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function loginSupplierPortal(
  email: string,
  password: string,
): Promise<SupplierPortalLoginResult> {
  let response: Response;
  try {
    response = await fetch(apiUrl(API_ROUTES.supplierPortalAuthLogin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
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
  return data;
}

export function logoutSupplierPortal(): void {
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
