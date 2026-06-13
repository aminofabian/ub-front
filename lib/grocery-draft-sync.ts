"use client";

import type { GroceryCartLine } from "@/components/grocery/grocery-invoice-cart";
import {
  createGroceryDraft,
  patchGroceryDraftLines,
  deleteGroceryDraftLine,
  fetchGroceryDraft,
  issueGroceryDraft,
  type GroceryDraftLineInput,
  type GroceryDraftResponse,
  GroceryDraftApiError,
  type IssueGroceryDraftResponse,
} from "@/lib/grocery-draft-api";

export type GroceryDraftState = {
  draftId: string | null;
  clientDraftId: string;
  counterNumber: number | null;
  status: "building" | "issued" | "cancelled" | "issue_failed" | null;
  invoiceId: string | null;
  version: number;
  syncStatus: "idle" | "syncing" | "error" | "conflict";
  lastSyncedAt: string | null;
  notes: string | null;
  /** Server line IDs that were removed locally and need to be deleted on next sync. */
  removedServerLineIds: string[];
};

export function createGroceryDraftState(): GroceryDraftState {
  return {
    draftId: null,
    clientDraftId: crypto.randomUUID(),
    counterNumber: null,
    status: null,
    invoiceId: null,
    version: 0,
    syncStatus: "idle",
    lastSyncedAt: null,
    notes: null,
    removedServerLineIds: [],
  };
}

function lineToInput(line: GroceryCartLine): GroceryDraftLineInput | null {
  const quantity = Number(line.quantity);
  const unitPrice = Number(line.unitPrice);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
  return {
    lineId: line.serverLineId,
    itemId: line.itemId,
    quantity: Math.round(quantity * 10000) / 10000,
    unitPrice: Math.round(unitPrice * 100) / 100,
    unitName: line.unitName || "each",
  };
}

function linesToInputs(lines: GroceryCartLine[]): GroceryDraftLineInput[] {
  return lines.map(lineToInput).filter((x): x is GroceryDraftLineInput => x != null);
}

/** Apply server draft snapshot onto local lines and return updated state. */
export function applyGroceryDraftToLines(
  lines: GroceryCartLine[],
  draft: GroceryDraftResponse,
): { lines: GroceryCartLine[]; state: GroceryDraftState } {
  const nextLines: GroceryCartLine[] = draft.lines.map((sl) => {
    const existing = lines.find(
      (l) => l.serverLineId === sl.id || l.itemId === sl.itemId,
    );
    return {
      key: existing?.key ?? crypto.randomUUID(),
      serverLineId: sl.id,
      itemId: sl.itemId,
      label: sl.itemName,
      quantity: sl.quantity,
      unitPrice: sl.unitPrice,
      unitName: sl.unitName,
    };
  });

  const state: GroceryDraftState = {
    draftId: draft.id,
    clientDraftId: draft.clientDraftId,
    counterNumber: draft.counterNumber,
    status: draft.status,
    invoiceId: draft.invoiceId,
    version: draft.version,
    syncStatus: "idle",
    lastSyncedAt: draft.updatedAt,
    notes: draft.notes,
    removedServerLineIds: [],
  };

  return { lines: nextLines, state };
}

/** Push local cart lines to the server. Creates a draft on first item. */
export async function syncGroceryDraftToServer(
  lines: GroceryCartLine[],
  state: GroceryDraftState,
  branchId: string,
): Promise<{ lines: GroceryCartLine[]; state: GroceryDraftState }> {
  const inputs = linesToInputs(lines);
  const hasRemovedLines = state.removedServerLineIds.length > 0;
  if (inputs.length === 0 && !hasRemovedLines) {
    return { lines, state: { ...state, syncStatus: "idle" } };
  }

  try {
    if (!state.draftId) {
      const draft = await createGroceryDraft({
        branchId,
        clientDraftId: state.clientDraftId,
        lines: inputs,
      });
      return applyGroceryDraftToLines(lines, draft);
    }

    let workingVersion = state.version;

    // Delete server lines that were removed locally first.
    for (const serverLineId of state.removedServerLineIds) {
      const deleted = await deleteGroceryDraftLine(
        state.draftId,
        serverLineId,
        workingVersion,
      );
      workingVersion = deleted.version;
    }

    // For existing drafts, prefer bulk patch for simplicity and fewer round trips.
    const draft = await patchGroceryDraftLines(state.draftId, {
      lines: inputs,
      expectedVersion: workingVersion,
    });
    return applyGroceryDraftToLines(lines, draft);
  } catch (e) {
    if (e instanceof GroceryDraftApiError && e.status === 409) {
      return { lines, state: { ...state, syncStatus: "conflict" } };
    }
    return { lines, state: { ...state, syncStatus: "error" } };
  }
}

/** Issue the draft and return the generated invoice. */
export async function issueGroceryDraftFromState(
  lines: GroceryCartLine[],
  state: GroceryDraftState,
  opts?: { notes?: string; expectedVersion?: number },
): Promise<
  | { ok: true; result: IssueGroceryDraftResponse; lines: GroceryCartLine[]; state: GroceryDraftState }
  | { ok: false; status: number; message: string }
> {
  if (!state.draftId) {
    // No draft yet — sync first then issue.
    const synced = await syncGroceryDraftToServer(lines, state, "");
    if (!synced.state.draftId) {
      return { ok: false, status: 0, message: "Unable to create draft" };
    }
    return issueGroceryDraftFromState(synced.lines, synced.state, opts);
  }

  const idempotencyKey = `issue:${state.clientDraftId}`;
  try {
    const result = await issueGroceryDraft(state.draftId, idempotencyKey, {
      notes: opts?.notes,
      expectedVersion: opts?.expectedVersion ?? state.version,
    });
    const updatedState: GroceryDraftState = {
      ...state,
      status: result.status,
      invoiceId: result.invoiceId,
      version: state.version + 1,
      syncStatus: "idle",
    };
    return { ok: true, result, lines, state: updatedState };
  } catch (e) {
    if (e instanceof GroceryDraftApiError) {
      return { ok: false, status: e.status, message: e.message };
    }
    return {
      ok: false,
      status: 0,
      message: e instanceof Error ? e.message : "Issue failed",
    };
  }
}

/** Adopt the latest server snapshot (use server version). */
export async function resolveGroceryDraftConflictUseServer(
  lines: GroceryCartLine[],
  state: GroceryDraftState,
): Promise<{ lines: GroceryCartLine[]; state: GroceryDraftState }> {
  if (!state.draftId) {
    return { lines, state: { ...state, syncStatus: "idle" } };
  }
  try {
    const draft = await fetchGroceryDraft(state.draftId);
    return applyGroceryDraftToLines(lines, draft);
  } catch {
    return { lines, state: { ...state, syncStatus: "error" } };
  }
}

/** Force-push local lines after refreshing server version (use mine). */
export async function resolveGroceryDraftConflictUseMine(
  lines: GroceryCartLine[],
  state: GroceryDraftState,
  branchId: string,
): Promise<{ lines: GroceryCartLine[]; state: GroceryDraftState }> {
  if (!state.draftId) {
    return syncGroceryDraftToServer(lines, state, branchId);
  }
  try {
    const draft = await fetchGroceryDraft(state.draftId);
    const refreshed = applyGroceryDraftToLines(lines, draft);
    return syncGroceryDraftToServer(refreshed.lines, refreshed.state, branchId);
  } catch {
    return syncGroceryDraftToServer(lines, state, branchId);
  }
}
