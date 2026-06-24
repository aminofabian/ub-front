"use client";

import { apiUrl } from "@/lib/config";
import {
  buildRequestHeaders,
  type PostSalePaymentPayload,
  type SaleRecord,
} from "@/lib/api";
import { getSessionTokens } from "@/lib/auth";
import { formatApiProblemMessage } from "@/lib/problem";

export const POS_DRAFT_FLAGS = {
  enabled: "pos_drafts.enabled",
  shadowWrites: "pos_drafts.shadow_writes",
  uiVisible: "pos_drafts.ui_visible",
  offlineMirror: "pos_drafts.offline_mirror",
} as const;

export type PosDraftStatus = "pending" | "completed" | "cancelled";

export type PosDraftLineInput = {
  lineId?: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
};

export type PosDraftLineResponse = {
  id: string;
  lineIndex: number;
  itemId: string;
  itemName: string;
  itemBarcode: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
};

export type PosDraftResponse = {
  id: string;
  ticketNumber: number;
  status: PosDraftStatus;
  branchId: string;
  clientDraftId: string;
  currency: string;
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  version: number;
  createdBy: string;
  createdByName: string | null;
  saleId: string | null;
  createdAt: string;
  updatedAt: string;
  lines: PosDraftLineResponse[];
};

export type PosDraftSummaryResponse = {
  id: string;
  ticketNumber: number;
  status: PosDraftStatus;
  branchId: string;
  lineCount: number;
  grandTotal: number;
  currency: string;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PosDraftListResponse = {
  drafts: PosDraftSummaryResponse[];
};

export class PosDraftApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "PosDraftApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function posDraftRequest<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const method = (init.method ?? "GET") as
    | "GET"
    | "POST"
    | "PATCH"
    | "PUT"
    | "DELETE";
  const session = getSessionTokens();
  const headers = new Headers(
    buildRequestHeaders(true, session?.accessToken, method) as Record<
      string,
      string
    >,
  );
  if (init.idempotencyKey?.trim()) {
    headers.set("Idempotency-Key", init.idempotencyKey.trim());
  }
  if (init.headers) {
    const extra = new Headers(init.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }

  const { idempotencyKey: _ik, ...rest } = init;
  const res = await fetch(apiUrl(path), {
    ...rest,
    method,
    headers,
    credentials: "include",
  });
  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }
  if (!res.ok) {
    const msg =
      formatApiProblemMessage(payload) ||
      `Request failed (${res.status})`;
    throw new PosDraftApiError(msg, res.status, payload);
  }
  return payload as T;
}

export async function createPosDraft(payload: {
  branchId: string;
  clientDraftId: string;
  lines: PosDraftLineInput[];
}): Promise<PosDraftResponse> {
  return posDraftRequest<PosDraftResponse>("/api/v1/pos-drafts", {
    method: "POST",
    idempotencyKey: payload.clientDraftId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchPosDraft(
  draftId: string,
  opts?: { includeDeleted?: boolean },
): Promise<PosDraftResponse> {
  const q = opts?.includeDeleted ? "?includeDeleted=true" : "";
  return posDraftRequest<PosDraftResponse>(`/api/v1/pos-drafts/${draftId}${q}`);
}

export async function listPosDrafts(params: {
  branchId: string;
  status?: PosDraftStatus;
  createdBy?: string;
  hoursBack?: number;
}): Promise<PosDraftListResponse> {
  const sp = new URLSearchParams({ branchId: params.branchId });
  if (params.status) sp.set("status", params.status);
  if (params.createdBy) sp.set("createdBy", params.createdBy);
  if (params.hoursBack != null) sp.set("hoursBack", String(params.hoursBack));
  return posDraftRequest<PosDraftListResponse>(
    `/api/v1/pos-drafts?${sp.toString()}`,
  );
}

export async function patchPosDraftLines(
  draftId: string,
  payload: { lines: PosDraftLineInput[]; expectedVersion?: number },
): Promise<PosDraftResponse> {
  return posDraftRequest<PosDraftResponse>(`/api/v1/pos-drafts/${draftId}/lines`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function putPosDraftLine(
  draftId: string,
  lineId: string,
  payload: {
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    expectedVersion?: number;
  },
): Promise<PosDraftResponse> {
  return posDraftRequest<PosDraftResponse>(
    `/api/v1/pos-drafts/${draftId}/lines/${lineId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function deletePosDraftLine(
  draftId: string,
  lineId: string,
  expectedVersion?: number,
): Promise<PosDraftResponse> {
  const q =
    expectedVersion != null ? `?expectedVersion=${expectedVersion}` : "";
  return posDraftRequest<PosDraftResponse>(
    `/api/v1/pos-drafts/${draftId}/lines/${lineId}${q}`,
    { method: "DELETE" },
  );
}

export async function cancelPosDraft(
  draftId: string,
  reason?: string,
): Promise<PosDraftResponse> {
  return posDraftRequest<PosDraftResponse>(
    `/api/v1/pos-drafts/${draftId}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason ?? null }),
    },
  );
}

export type CompletePosDraftRequest = {
  payments: PostSalePaymentPayload[];
  customerId?: string | null;
  clientSoldAt?: string | null;
  expectedVersion?: number;
};

export type CompletePosDraftResponse = {
  draftId: string;
  ticketNumber: number;
  status: PosDraftStatus;
  saleId: string;
  sale: SaleRecord;
  createdNew: boolean;
};

export type CompletePosDraftAttemptResult =
  | { ok: true; result: CompletePosDraftResponse; sale: SaleRecord }
  | { ok: false; status: number; message: string };

const COMPLETE_RETRY_ATTEMPTS = 3;
const COMPLETE_RETRY_DELAY_MS = 400;

function isTransientCompleteFailure(r: CompletePosDraftAttemptResult): boolean {
  return !r.ok && (r.status === 0 || r.status >= 500);
}

export async function tryCompletePosDraft(
  draftId: string,
  body: CompletePosDraftRequest,
  idempotencyKey: string,
): Promise<CompletePosDraftAttemptResult> {
  try {
    const result = await posDraftRequest<CompletePosDraftResponse>(
      `/api/v1/pos-drafts/${draftId}/complete`,
      {
        method: "POST",
        idempotencyKey,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return { ok: true, result, sale: result.sale };
  } catch (e) {
    if (e instanceof PosDraftApiError) {
      return { ok: false, status: e.status, message: e.message };
    }
    return {
      ok: false,
      status: 0,
      message: e instanceof Error ? e.message : "Complete failed",
    };
  }
}

export async function tryCompletePosDraftWithRetries(
  draftId: string,
  body: CompletePosDraftRequest,
  idempotencyKey: string,
  maxAttempts: number = COMPLETE_RETRY_ATTEMPTS,
  delayMs: number = COMPLETE_RETRY_DELAY_MS,
): Promise<CompletePosDraftAttemptResult> {
  let last: CompletePosDraftAttemptResult = {
    ok: false,
    status: 0,
    message: "unreachable",
  };
  for (let i = 0; i < maxAttempts; i++) {
    last = await tryCompletePosDraft(draftId, body, idempotencyKey);
    if (last.ok) return last;
    if (!isTransientCompleteFailure(last)) return last;
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return last;
}
