"use client";

import { apiRequest, ApiRequestError } from "@/lib/api";
import {
  isOpsInfraError,
  isOpsInfraMessage,
  USER_API_UNREACHABLE_MESSAGE,
} from "@/lib/ops-client-log";
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
  remote?: boolean;
  customerPhone?: string;
  customerId?: string;
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
  remote?: boolean;
  customerPhone?: string | null;
  customerId?: string | null;
  lastStkStatus?: string | null;
  lastStkAt?: string | null;
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
  lockedBy?: string | null;
  lockedByName?: string | null;
  remote?: boolean;
  customerPhone?: string | null;
  customerId?: string | null;
  lastStkStatus?: string | null;
  lastStkAt?: string | null;
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
  /** Required when paying with customer_credit (tab). */
  customerId?: string;
  /** Walk-up till lines added on top of the forwarded invoice. */
  additionalLines?: Array<{
    itemId: string;
    quantity: number;
    unitPrice: number;
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
  /** Ops / infra failures — do not toast on tills. */
  readonly silent: boolean;

  constructor(
    message: string,
    status: number,
    payload: unknown,
    opts?: { silent?: boolean },
  ) {
    super(message);
    this.name = "GroceryApiError";
    this.status = status;
    this.payload = payload;
    this.silent = opts?.silent === true;
  }
}

export function toastCaughtGroceryError(error: unknown, fallback: string): void {
  if (error instanceof GroceryApiError && error.silent) return;
  if (isOpsInfraError(error)) return;
  const msg =
    error instanceof GroceryApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : fallback;
  if (!msg.trim() || isOpsInfraMessage(msg)) return;
  toast.error(msg);
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
      if (isOpsInfraMessage(e.message)) {
        throw new GroceryApiError(
          USER_API_UNREACHABLE_MESSAGE,
          e.status,
          e.payload,
          { silent: true },
        );
      }
      throw new GroceryApiError(e.message, e.status, e.payload);
    }
    if (isOpsInfraError(e)) {
      throw new GroceryApiError(USER_API_UNREACHABLE_MESSAGE, 0, null, {
        silent: true,
      });
    }
    const msg =
      e instanceof Error && e.message.trim()
        ? e.message
        : USER_API_UNREACHABLE_MESSAGE;
    if (options.suppressToast !== true && msg.trim() && !isOpsInfraMessage(msg)) {
      toast.error(msg, { duration: 10_000 });
    }
    throw new GroceryApiError(msg, 0, null, {
      silent: isOpsInfraMessage(msg),
    });
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

export type RemoteInvoiceStkResponse = {
  invoiceId: string;
  checkoutRequestId: string | null;
  status: string;
  message: string | null;
  accepted: boolean;
};

/**
 * Resend M-Pesa STK for a remote grocery invoice.
 * POST /api/v1/grocery/invoices/:id/stk
 */
export async function resendRemoteInvoiceStk(
  id: string,
): Promise<RemoteInvoiceStkResponse> {
  return groceryRequest<RemoteInvoiceStkResponse>(
    `${GROCERY_BASE}/${encodeURIComponent(id)}/stk`,
    { method: "POST" },
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
