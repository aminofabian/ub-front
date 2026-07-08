"use client";

import { apiRequest, ApiRequestError } from "@/lib/api";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────

export type GroceryInvoiceStatus =
  | "pending_payment"
  | "paid"
  | "cancelled"
  | "expired";

export type GroceryInvoiceLineRequest = {
  itemId: string;
  quantity: number;
  unitPrice: number;
  unitName?: string;
};

export type CreateGroceryInvoiceRequest = {
  branchId: string;
  lines: GroceryInvoiceLineRequest[];
  notes?: string;
};

export type GroceryInvoiceLineResponse = {
  id: string;
  itemId: string;
  itemName: string;
  lineIndex: number;
  quantity: number;
  unitName: string;
  unitPrice: number;
  lineTotal: number;
};

export type GroceryInvoiceResponse = {
  id: string;
  barcodeCode: string;
  status: GroceryInvoiceStatus;
  branchId: string;
  subtotal: number;
  grandTotal: number;
  lines: GroceryInvoiceLineResponse[];
  notes?: string;
  expiresAt: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  cancelledBy?: string;
  cancelledByName?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  paidBy?: string;
  paidByName?: string;
  paidAt?: string;
  saleId?: string;
  lockedBy?: string;
  lockedByName?: string;
  lockedAt?: string;
  lockExpiresAt?: string;
};

export type GroceryInvoiceSummaryResponse = {
  id: string;
  barcodeCode: string;
  status: GroceryInvoiceStatus;
  grandTotal: number;
  lineCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  expiresAt: string;
};

export type GroceryInvoiceListResponse = {
  invoices: GroceryInvoiceSummaryResponse[];
};

export type PayGroceryInvoiceRequest = {
  payments: Array<{
    method: string;
    amount: number;
    reference?: string;
  }>;
};

export type PayGroceryInvoiceResponse = {
  invoiceId: string;
  saleId: string;
  status: string;
  paidAt: string;
  receipt: unknown;
};

export type CancelGroceryInvoiceRequest = {
  reason: string;
};

/**
 * One row of the server-aggregated grocery "Top sellers" feed. Ranked by
 * the calling user's own (non-cancelled) invoice activity at the branch.
 */
export type GroceryTopProduct = {
  id: string;
  name: string;
  sku?: string | null;
  thumbnailUrl?: string | null;
  invoiceCount: number;
  totalQuantity: number;
  lastInvoicedAt?: string | null;
};

// ── Error class ────────────────────────────────────────────────────

export class GroceryApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "GroceryApiError";
    this.status = status;
    this.payload = payload;
  }
}

// ── Internal helpers ───────────────────────────────────────────────

function getNetworkErrorMsg(): string {
  return "Cannot reach the server. Check your connection and try again.";
}

async function groceryRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    idempotencyKey?: string;
    suppressToast?: boolean;
  } = {},
): Promise<T> {
  const method = options.method ?? "GET";

  try {
    return await apiRequest<T>(path, {
      method,
      body: options.body,
      idempotencyKey: options.idempotencyKey,
      toast: options.suppressToast ? false : undefined,
    });
  } catch (e) {
    if (e instanceof ApiRequestError) {
      throw new GroceryApiError(e.message, e.status, e.payload);
    }
    const msg = e instanceof Error ? e.message : getNetworkErrorMsg();
    if (options.suppressToast !== true && msg.trim()) {
      toast.error(msg, { duration: 10_000 });
    }
    throw new GroceryApiError(msg, 0, null);
  }
}

// ── Public API functions ───────────────────────────────────────────

const GROCERY_BASE = "/api/v1/grocery/invoices";

/**
 * Create a new grocery invoice.
 * POST /api/v1/grocery/invoices
 */
export async function createGroceryInvoice(
  body: CreateGroceryInvoiceRequest,
): Promise<GroceryInvoiceResponse> {
  return groceryRequest<GroceryInvoiceResponse>(GROCERY_BASE, {
    method: "POST",
    body,
  });
}

/**
 * List grocery invoices for a branch, optionally filtered by status.
 * GET /api/v1/grocery/invoices?branchId=...&status=...
 */
export async function listGroceryInvoices(
  branchId: string,
  status?: GroceryInvoiceStatus,
  options?: { suppressToast?: boolean },
): Promise<GroceryInvoiceListResponse> {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  if (status) {
    params.set("status", status);
  }
  return groceryRequest<GroceryInvoiceListResponse>(
    `${GROCERY_BASE}?${params.toString()}`,
    { suppressToast: options?.suppressToast },
  );
}

/**
 * Get a single grocery invoice by ID.
 * GET /api/v1/grocery/invoices/:id
 */
export async function getGroceryInvoice(
  id: string,
): Promise<GroceryInvoiceResponse> {
  return groceryRequest<GroceryInvoiceResponse>(
    `${GROCERY_BASE}/${encodeURIComponent(id)}`,
  );
}

/**
 * Look up a grocery invoice by its barcode code.
 * GET /api/v1/grocery/invoices/lookup?barcode=...
 */
export async function lookupGroceryInvoiceByBarcode(
  barcode: string,
): Promise<GroceryInvoiceResponse> {
  return groceryRequest<GroceryInvoiceResponse>(
    `${GROCERY_BASE}/lookup?barcode=${encodeURIComponent(barcode.trim())}`,
  );
}

/**
 * Cancel an existing grocery invoice.
 * POST /api/v1/grocery/invoices/:id/cancel
 */
export async function cancelGroceryInvoice(
  id: string,
  body: CancelGroceryInvoiceRequest,
): Promise<GroceryInvoiceResponse> {
  return groceryRequest<GroceryInvoiceResponse>(
    `${GROCERY_BASE}/${encodeURIComponent(id)}/cancel`,
    { method: "POST", body },
  );
}

/**
 * Pay a grocery invoice (cashier side).
 * POST /api/v1/grocery/invoices/:id/pay
 * Requires an Idempotency-Key header.
 */
export async function payGroceryInvoice(
  id: string,
  body: PayGroceryInvoiceRequest,
  idempotencyKey: string,
): Promise<PayGroceryInvoiceResponse> {
  return groceryRequest<PayGroceryInvoiceResponse>(
    `${GROCERY_BASE}/${encodeURIComponent(id)}/pay`,
    { method: "POST", body, idempotencyKey },
  );
}

/**
 * Lock a grocery invoice for processing (prevents double-processing).
 * POST /api/v1/grocery/invoices/:id/lock
 */
export async function lockGroceryInvoice(
  id: string,
): Promise<GroceryInvoiceResponse> {
  return groceryRequest<GroceryInvoiceResponse>(
    `${GROCERY_BASE}/${encodeURIComponent(id)}/lock`,
    { method: "POST", suppressToast: true },
  );
}

/**
 * Release a lock on a grocery invoice.
 * POST /api/v1/grocery/invoices/:id/unlock
 */
export async function unlockGroceryInvoice(
  id: string,
): Promise<GroceryInvoiceResponse> {
  return groceryRequest<GroceryInvoiceResponse>(
    `${GROCERY_BASE}/${encodeURIComponent(id)}/unlock`,
    { method: "POST", suppressToast: true },
  );
}

/**
 * Server-aggregated top-sellers feed for the grocery counter. Each row is
 * ranked by the calling user's own invoice activity at the branch, so the
 * list survives page reloads (sorting happens in the database).
 *
 * GET /api/v1/grocery/top-products?branchId=...&limit=20
 */
export async function fetchGroceryTopProducts(
  branchId: string,
  limit = 20,
): Promise<GroceryTopProduct[]> {
  const params = new URLSearchParams();
  if (branchId) params.set("branchId", branchId);
  params.set("limit", String(Math.max(1, Math.min(limit, 100))));
  const list = await groceryRequest<GroceryTopProduct[]>(
    `/api/v1/grocery/top-products?${params.toString()}`,
    { suppressToast: true },
  );
  return Array.isArray(list) ? list : [];
}
