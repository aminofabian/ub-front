"use client";

import type { CartSession, CartSessionLine } from "@/lib/cart-session";
import {
  createEmptyCartSession,
  MAX_CARTS,
} from "@/lib/cart-session";
import {
  createPosDraft,
  patchPosDraftLines,
  putPosDraftLine,
  deletePosDraftLine,
  fetchPosDraft,
  type PosDraftLineInput,
  type PosDraftResponse,
  PosDraftApiError,
} from "@/lib/pos-draft-api";

function parseQty(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parsePrice(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function linesToInputs(cart: CartSession): PosDraftLineInput[] {
  const out: PosDraftLineInput[] = [];
  for (const line of cart.lines) {
    const q = parseQty(line.quantity);
    const p = parsePrice(line.unitPrice);
    if (q == null || p == null) continue;
    out.push({
      lineId: line.serverLineId ?? undefined,
      itemId: line.itemId,
      quantity: q,
      unitPrice: p,
    });
  }
  return out;
}

/** Apply server draft snapshot onto a cart session (lines + metadata). */
export function applyPosDraftToCart(
  cart: CartSession,
  draft: PosDraftResponse,
  opts?: { uiVisible?: boolean },
): CartSession {
  const lines: CartSessionLine[] = draft.lines.map((sl) => {
    const existing = cart.lines.find(
      (l) => l.serverLineId === sl.id || l.itemId === sl.itemId,
    );
    return {
      key: existing?.key ?? crypto.randomUUID(),
      itemId: sl.itemId,
      label: sl.itemName,
      quantity: String(sl.quantity),
      unitPrice: String(sl.unitPrice),
      serverLineId: sl.id,
      item: existing?.item ?? {
        id: sl.itemId,
        name: sl.itemName,
        sku: "",
        barcode: sl.itemBarcode ?? undefined,
      },
    };
  });

  const label =
    opts?.uiVisible && draft.ticketNumber > 0
      ? `#${draft.ticketNumber}`
      : cart.label;

  return {
    ...cart,
    draftId: draft.id,
    ticketNumber: draft.ticketNumber,
    version: draft.version,
    syncStatus: "idle",
    lastSyncedAt: draft.updatedAt,
    label,
    lines,
  };
}

/**
 * Push local cart state to the server. Creates a draft on first item,
 * then patches/puts individual lines.
 */
export async function syncCartSessionToServer(
  cart: CartSession,
  branchId: string,
  opts?: { uiVisible?: boolean },
): Promise<CartSession> {
  const inputs = linesToInputs(cart);
  if (inputs.length === 0) {
    return { ...cart, syncStatus: "idle" };
  }

  try {
    if (!cart.draftId) {
      const draft = await createPosDraft({
        branchId,
        clientDraftId: cart.clientDraftId,
        lines: inputs,
      });
      return applyPosDraftToCart({ ...cart, syncStatus: "syncing" }, draft, opts);
    }

    let latest: PosDraftResponse | null = null;

    for (const line of cart.lines) {
      const q = parseQty(line.quantity);
      const p = parsePrice(line.unitPrice);
      if (q == null || p == null) continue;

      if (line.serverLineId) {
        if (q <= 0) {
          latest = await deletePosDraftLine(
            cart.draftId,
            line.serverLineId,
            cart.version,
          );
        } else {
          latest = await putPosDraftLine(cart.draftId, line.serverLineId, {
            quantity: q,
            unitPrice: p,
            expectedVersion: cart.version,
          });
        }
      }
    }

    const missingServerIds = cart.lines.filter((l) => !l.serverLineId);
    if (missingServerIds.length > 0) {
      const patchInputs = missingServerIds
        .map((line) => {
          const q = parseQty(line.quantity);
          const p = parsePrice(line.unitPrice);
          if (q == null || p == null) return null;
          return {
            itemId: line.itemId,
            quantity: q,
            unitPrice: p,
          } satisfies PosDraftLineInput;
        })
        .filter((x): x is PosDraftLineInput => x != null);

      if (patchInputs.length > 0) {
        latest = await patchPosDraftLines(cart.draftId, {
          lines: patchInputs,
          expectedVersion: latest?.version ?? cart.version,
        });
      }
    }

    if (latest) {
      return applyPosDraftToCart(cart, latest, opts);
    }

    return { ...cart, syncStatus: "idle" };
  } catch (e) {
    if (e instanceof PosDraftApiError && e.status === 409) {
      return { ...cart, syncStatus: "conflict" };
    }
    return { ...cart, syncStatus: "error" };
  }
}

export type ReplayMirroredDraftsResult = {
  carts: CartSession[];
  hadConflict: boolean;
  hadError: boolean;
};

/** Push every non-empty cart to the server (used after reconnect). */
export async function replayMirroredDraftsToServer(
  carts: CartSession[],
  branchId: string,
  opts?: { uiVisible?: boolean },
): Promise<ReplayMirroredDraftsResult> {
  let hadConflict = false;
  let hadError = false;
  const next = [...carts];

  for (let i = 0; i < next.length; i++) {
    const cart = next[i];
    if (cart.lines.length === 0) continue;
    const synced = await syncCartSessionToServer(cart, branchId, opts);
    next[i] = { ...synced, id: cart.id, label: cart.label, createdAt: cart.createdAt };
    if (synced.syncStatus === "conflict") hadConflict = true;
    if (synced.syncStatus === "error") hadError = true;
  }

  return { carts: next, hadConflict, hadError };
}

/** Adopt the latest server snapshot for a cart in conflict. */
export async function resolveDraftConflictUseServer(
  cart: CartSession,
  opts?: { uiVisible?: boolean },
): Promise<CartSession> {
  if (!cart.draftId) {
    return { ...cart, syncStatus: "idle" };
  }
  try {
    const draft = await fetchPosDraft(cart.draftId);
    return applyPosDraftToCart(
      { ...cart, syncStatus: "idle" },
      draft,
      opts,
    );
  } catch {
    return { ...cart, syncStatus: "error" };
  }
}

/** Force-push local lines after refreshing server version. */
export async function resolveDraftConflictUseMine(
  cart: CartSession,
  branchId: string,
  opts?: { uiVisible?: boolean },
): Promise<CartSession> {
  if (!cart.draftId) {
    return syncCartSessionToServer(cart, branchId, opts);
  }
  try {
    const draft = await fetchPosDraft(cart.draftId);
    const withVersion = applyPosDraftToCart(cart, draft, opts);
    return syncCartSessionToServer(withVersion, branchId, opts);
  } catch {
    return syncCartSessionToServer(cart, branchId, opts);
  }
}

/**
 * Merge locally mirrored tabs with server pending drafts on cashier load.
 * Local tabs with lines win unless matched to a server draft (then server metadata applied).
 */
export function mergeHydratedCartSessions(
  localCarts: CartSession[],
  serverDrafts: PosDraftResponse[],
  opts?: { uiVisible?: boolean },
): CartSession[] {
  const tabs: CartSession[] = [];
  const matchedDraftIds = new Set<string>();

  for (const local of localCarts) {
    if (local.lines.length === 0 && !local.draftId) continue;
    const serverMatch = serverDrafts.find(
      (d) =>
        d.id === local.draftId ||
        d.clientDraftId === local.clientDraftId,
    );
    if (serverMatch) {
      matchedDraftIds.add(serverMatch.id);
      tabs.push(
        applyPosDraftToCart(
          { ...local, id: local.id, label: local.label, createdAt: local.createdAt },
          serverMatch,
          opts,
        ),
      );
    } else {
      tabs.push(local);
      if (local.draftId) matchedDraftIds.add(local.draftId);
    }
  }

  for (const draft of serverDrafts) {
    if (tabs.length >= MAX_CARTS) break;
    if (matchedDraftIds.has(draft.id)) continue;
    const shell = createEmptyCartSession();
    tabs.push(applyPosDraftToCart(shell, draft, opts));
    matchedDraftIds.add(draft.id);
  }

  if (tabs.length === 0) {
    return [createEmptyCartSession()];
  }

  const trailing =
    tabs.length < MAX_CARTS ? [createEmptyCartSession()] : [];
  return [...tabs, ...trailing];
}
