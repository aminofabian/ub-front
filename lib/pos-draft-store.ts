"use client";

import type { CartSession } from "@/lib/cart-session";
import type { CompletePosDraftRequest } from "@/lib/pos-draft-api";

const DB_NAME = "ub_pos_draft_mirror_v1";
const DB_VERSION = 1;
const CARTS_STORE = "mirrored_carts";
const COMPLETE_STORE = "pending_completes";

export type MirroredCartRow = {
  key: string;
  businessId: string;
  branchId: string;
  userId: string;
  cartId: string;
  cart: CartSession;
  updatedAt: number;
};

export type PendingDraftCompleteRow = {
  seq: number;
  idempotencyKey: string;
  draftId: string;
  body: CompletePosDraftRequest;
  createdAt: number;
};

export function isPosDraftStoreSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function cartRowKey(
  businessId: string,
  branchId: string,
  userId: string,
  cartId: string,
): string {
  return `${businessId}:${branchId}:${userId}:${cartId}`;
}

function scopePrefix(
  businessId: string,
  branchId: string,
  userId: string,
): string {
  return `${businessId}:${branchId}:${userId}:`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CARTS_STORE)) {
        const os = db.createObjectStore(CARTS_STORE, { keyPath: "key" });
        os.createIndex("byScope", "key", { unique: true });
      }
      if (!db.objectStoreNames.contains(COMPLETE_STORE)) {
        const os = db.createObjectStore(COMPLETE_STORE, {
          keyPath: "seq",
          autoIncrement: true,
        });
        os.createIndex("byIdempotencyKey", "idempotencyKey", { unique: true });
      }
    };
  });
}

/** Persist one cart tab mirror (non-empty lines or known server draft). */
export async function saveMirroredCart(
  businessId: string,
  branchId: string,
  userId: string,
  cart: CartSession,
): Promise<void> {
  if (!isPosDraftStoreSupported()) return;
  const bid = businessId.trim();
  const br = branchId.trim();
  const uid = userId.trim();
  if (!bid || !br || !uid) return;
  if (cart.lines.length === 0 && !cart.draftId) return;

  const row: MirroredCartRow = {
    key: cartRowKey(bid, br, uid, cart.id),
    businessId: bid,
    branchId: br,
    userId: uid,
    cartId: cart.id,
    cart,
    updatedAt: Date.now(),
  };

  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CARTS_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
      tx.objectStore(CARTS_STORE).put(row);
    });
  } finally {
    db.close();
  }
}

/** Replace all mirrored carts for a scope (used after bulk hydration). */
export async function saveMirroredCarts(
  businessId: string,
  branchId: string,
  userId: string,
  carts: CartSession[],
): Promise<void> {
  if (!isPosDraftStoreSupported()) return;
  const toSave = carts.filter((c) => c.lines.length > 0 || c.draftId);
  await Promise.all(
    toSave.map((cart) => saveMirroredCart(businessId, branchId, userId, cart)),
  );
}

export async function loadMirroredCarts(
  businessId: string,
  branchId: string,
  userId: string,
): Promise<CartSession[]> {
  if (!isPosDraftStoreSupported()) return [];
  const bid = businessId.trim();
  const br = branchId.trim();
  const uid = userId.trim();
  if (!bid || !br || !uid) return [];

  const prefix = scopePrefix(bid, br, uid);
  const db = await openDb();
  try {
    const rows = await new Promise<MirroredCartRow[]>((resolve, reject) => {
      const tx = db.transaction(CARTS_STORE, "readonly");
      const req = tx.objectStore(CARTS_STORE).getAll();
      req.onsuccess = () => resolve(req.result as MirroredCartRow[]);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    });
    return rows
      .filter((r) => r.key.startsWith(prefix))
      .sort((a, b) => a.cart.createdAt - b.cart.createdAt)
      .map((r) => r.cart);
  } finally {
    db.close();
  }
}

export async function removeMirroredCart(
  businessId: string,
  branchId: string,
  userId: string,
  cartId: string,
): Promise<void> {
  if (!isPosDraftStoreSupported()) return;
  const key = cartRowKey(
    businessId.trim(),
    branchId.trim(),
    userId.trim(),
    cartId,
  );
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CARTS_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
      tx.objectStore(CARTS_STORE).delete(key);
    });
  } finally {
    db.close();
  }
}

export async function clearMirroredCartsForScope(
  businessId: string,
  branchId: string,
  userId: string,
): Promise<void> {
  if (!isPosDraftStoreSupported()) return;
  const prefix = scopePrefix(
    businessId.trim(),
    branchId.trim(),
    userId.trim(),
  );
  const db = await openDb();
  try {
    const rows = await new Promise<MirroredCartRow[]>((resolve, reject) => {
      const tx = db.transaction(CARTS_STORE, "readonly");
      const req = tx.objectStore(CARTS_STORE).getAll();
      req.onsuccess = () => resolve(req.result as MirroredCartRow[]);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    });
    const keys = rows.filter((r) => r.key.startsWith(prefix)).map((r) => r.key);
    if (keys.length === 0) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CARTS_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
      const store = tx.objectStore(CARTS_STORE);
      for (const key of keys) {
        store.delete(key);
      }
    });
  } finally {
    db.close();
  }
}

export async function enqueuePendingDraftComplete(
  idempotencyKey: string,
  draftId: string,
  body: CompletePosDraftRequest,
): Promise<void> {
  if (!isPosDraftStoreSupported()) {
    throw new Error("Offline draft queue requires IndexedDB.");
  }
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(COMPLETE_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
      tx.objectStore(COMPLETE_STORE).add({
        idempotencyKey: idempotencyKey.trim(),
        draftId: draftId.trim(),
        body,
        createdAt: Date.now(),
      });
    });
  } finally {
    db.close();
  }
}

async function listPendingCompletesSorted(): Promise<PendingDraftCompleteRow[]> {
  const db = await openDb();
  try {
    const rows = await new Promise<PendingDraftCompleteRow[]>(
      (resolve, reject) => {
        const tx = db.transaction(COMPLETE_STORE, "readonly");
        const req = tx.objectStore(COMPLETE_STORE).getAll();
        req.onsuccess = () =>
          resolve(req.result as PendingDraftCompleteRow[]);
        req.onerror = () =>
          reject(req.error ?? new Error("IndexedDB read failed"));
      },
    );
    return rows.slice().sort((a, b) => a.seq - b.seq);
  } finally {
    db.close();
  }
}

export async function countPendingDraftCompletes(): Promise<number> {
  if (!isPosDraftStoreSupported()) return 0;
  const rows = await listPendingCompletesSorted();
  return rows.length;
}

async function removeCompleteBySeq(seq: number): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(COMPLETE_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
      tx.objectStore(COMPLETE_STORE).delete(seq);
    });
  } finally {
    db.close();
  }
}

export type FlushDraftCompleteOutboxResult =
  | { status: "empty" }
  | { status: "blocked"; message: string }
  | { status: "paused_transient" };

/**
 * Replays queued draft-complete calls in FIFO order.
 * Stops on the first non-transient failure; leaves that row in the queue.
 */
export async function flushPendingDraftCompleteOutbox(): Promise<FlushDraftCompleteOutboxResult> {
  if (!isPosDraftStoreSupported()) {
    return { status: "empty" };
  }

  const { tryCompletePosDraftWithRetries } = await import("@/lib/pos-draft-api");

  while (true) {
    const rows = await listPendingCompletesSorted();
    const head = rows[0];
    if (!head) {
      return { status: "empty" };
    }

    const result = await tryCompletePosDraftWithRetries(
      head.draftId,
      head.body,
      head.idempotencyKey,
    );
    if (result.ok) {
      await removeCompleteBySeq(head.seq);
      continue;
    }
    if (result.status === 0 || result.status >= 500) {
      return { status: "paused_transient" };
    }
    return { status: "blocked", message: result.message };
  }
}
