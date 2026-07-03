"use client";

import { apiRequest, ApiRequestError } from "@/lib/api";
import type { GroceryInvoiceResponse } from "@/lib/grocery-api";

export const GROCERY_DRAFT_FLAGS = {
  enabled: "grocery_drafts.enabled",
  shadowWrites: "grocery_drafts.shadow_writes",
  uiVisible: "grocery_drafts.ui_visible",
  offlineMirror: "grocery_drafts.offline_mirror",
} as const;

export type GroceryDraftStatus =
  | "building"
  | "issued"
  | "cancelled"
  | "issue_failed";

export type GroceryDraftLineInput = {
  lineId?: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  unitName?: string;
  discountAmount?: number;
};

export type GroceryDraftLineResponse = {
  id: string;
  lineIndex: number;
  itemId: string;
  itemName: string;
  itemBarcode: string | null;
  quantity: number;
  unitName: string;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
};

export type GroceryDraftResponse = {
  id: string;
  counterNumber: number;
  status: GroceryDraftStatus;
  branchId: string;
  clientDraftId: string;
  invoiceId: string | null;
  notes: string | null;
  currency: string;
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  version: number;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  issuedAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  lines: GroceryDraftLineResponse[];
};

export type GroceryDraftSummaryResponse = {
  id: string;
  counterNumber: number;
  status: GroceryDraftStatus;
  branchId: string;
  lineCount: number;
  grandTotal: number;
  currency: string;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GroceryDraftListResponse = {
  drafts: GroceryDraftSummaryResponse[];
};

export type IssueGroceryDraftResponse = {
  draftId: string;
  counterNumber: number;
  status: GroceryDraftStatus;
  invoiceId: string;
  invoice: GroceryInvoiceResponse;
  createdNew: boolean;
};

export class GroceryDraftApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "GroceryDraftApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function groceryDraftRequest<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const method = (init.method ?? "GET") as
    | "GET"
    | "POST"
    | "PATCH"
    | "PUT"
    | "DELETE";
  let body: unknown;
  if (init.body && typeof init.body === "string") {
    try {
      body = JSON.parse(init.body) as unknown;
    } catch {
      body = undefined;
    }
  }

  try {
    return await apiRequest<T>(path, {
      method,
      body,
      idempotencyKey: init.idempotencyKey,
    });
  } catch (e) {
    if (e instanceof ApiRequestError) {
      throw new GroceryDraftApiError(e.message, e.status, e.payload);
    }
    const msg = e instanceof Error ? e.message : "Request failed";
    throw new GroceryDraftApiError(msg, 0, null);
  }
}

export async function createGroceryDraft(payload: {
  branchId: string;
  clientDraftId: string;
  lines: GroceryDraftLineInput[];
}): Promise<GroceryDraftResponse> {
  return groceryDraftRequest<GroceryDraftResponse>("/api/v1/grocery-drafts", {
    method: "POST",
    idempotencyKey: payload.clientDraftId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchGroceryDraft(
  draftId: string,
  opts?: { includeDeleted?: boolean },
): Promise<GroceryDraftResponse> {
  const q = opts?.includeDeleted ? "?includeDeleted=true" : "";
  return groceryDraftRequest<GroceryDraftResponse>(
    `/api/v1/grocery-drafts/${draftId}${q}`,
  );
}

export async function listGroceryDrafts(params: {
  branchId: string;
  status?: GroceryDraftStatus;
  createdBy?: string;
  hoursBack?: number;
  staleMinutes?: number;
}): Promise<GroceryDraftListResponse> {
  const sp = new URLSearchParams({ branchId: params.branchId });
  if (params.status) sp.set("status", params.status);
  if (params.createdBy) sp.set("createdBy", params.createdBy);
  if (params.hoursBack != null) sp.set("hoursBack", String(params.hoursBack));
  if (params.staleMinutes != null)
    sp.set("staleMinutes", String(params.staleMinutes));
  return groceryDraftRequest<GroceryDraftListResponse>(
    `/api/v1/grocery-drafts?${sp.toString()}`,
  );
}

export async function patchGroceryDraftLines(
  draftId: string,
  payload: { lines: GroceryDraftLineInput[]; expectedVersion?: number },
): Promise<GroceryDraftResponse> {
  return groceryDraftRequest<GroceryDraftResponse>(
    `/api/v1/grocery-drafts/${draftId}/lines`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function putGroceryDraftLine(
  draftId: string,
  lineId: string,
  payload: {
    quantity: number;
    unitPrice: number;
    unitName?: string;
    discountAmount?: number;
    expectedVersion?: number;
  },
): Promise<GroceryDraftResponse> {
  return groceryDraftRequest<GroceryDraftResponse>(
    `/api/v1/grocery-drafts/${draftId}/lines/${lineId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteGroceryDraftLine(
  draftId: string,
  lineId: string,
  expectedVersion?: number,
): Promise<GroceryDraftResponse> {
  const q =
    expectedVersion != null ? `?expectedVersion=${expectedVersion}` : "";
  return groceryDraftRequest<GroceryDraftResponse>(
    `/api/v1/grocery-drafts/${draftId}/lines/${lineId}${q}`,
    { method: "DELETE" },
  );
}

export async function cancelGroceryDraft(
  draftId: string,
  reason?: string,
): Promise<GroceryDraftResponse> {
  return groceryDraftRequest<GroceryDraftResponse>(
    `/api/v1/grocery-drafts/${draftId}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason ?? null }),
    },
  );
}

export async function issueGroceryDraft(
  draftId: string,
  idempotencyKey: string,
  opts?: { notes?: string; expectedVersion?: number },
): Promise<IssueGroceryDraftResponse> {
  return groceryDraftRequest<IssueGroceryDraftResponse>(
    `/api/v1/grocery-drafts/${draftId}/issue`,
    {
      method: "POST",
      idempotencyKey,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: opts?.notes ?? null,
        expectedVersion: opts?.expectedVersion ?? null,
      }),
    },
  );
}
