/**
 * Offline outbox for grocery invoice creation.
 * Mirrors the sale-outbox.ts pattern: queues invoices in IndexedDB when offline
 * and replays them in FIFO order when connectivity returns.
 */

import type { CreateGroceryInvoiceRequest } from "@/lib/grocery-api";
import { createGroceryInvoice, GroceryApiError } from "@/lib/grocery-api";

const DB_NAME = "ub_grocery_outbox_v1";
const DB_VERSION = 1;
const STORE = "pending_invoices";

export type PendingInvoiceRow = {
  seq: number;
  payload: CreateGroceryInvoiceRequest;
  createdAt: number;
};

export function isGroceryOutboxSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, {
          keyPath: "seq",
          autoIncrement: true,
        });
        os.createIndex("byCreatedAt", "createdAt", { unique: false });
      }
    };
  });
}

export async function enqueuePendingInvoice(
  payload: CreateGroceryInvoiceRequest,
): Promise<void> {
  if (!isGroceryOutboxSupported()) {
    throw new Error("Offline invoice queue requires IndexedDB.");
  }
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("IndexedDB write failed"));
      tx.objectStore(STORE).add({
        payload,
        createdAt: Date.now(),
      });
    });
  } finally {
    db.close();
  }
}

async function listPendingSorted(): Promise<PendingInvoiceRow[]> {
  const db = await openDb();
  try {
    const rows = await new Promise<PendingInvoiceRow[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as PendingInvoiceRow[]);
      req.onerror = () =>
        reject(req.error ?? new Error("IndexedDB read failed"));
    });
    return rows.slice().sort((a, b) => a.seq - b.seq);
  } finally {
    db.close();
  }
}

async function removeBySeq(seq: number): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("IndexedDB delete failed"));
      tx.objectStore(STORE).delete(seq);
    });
  } finally {
    db.close();
  }
}

export async function countPendingInvoices(): Promise<number> {
  if (!isGroceryOutboxSupported()) {
    return 0;
  }
  const rows = await listPendingSorted();
  return rows.length;
}

export type FlushGroceryOutboxResult =
  | { status: "empty" }
  | { status: "blocked"; message: string }
  | { status: "paused_transient" };

/**
 * Replays queued invoices in FIFO order.
 * Stops on the first 4xx rejection; leaves that row in the queue for manual review.
 */
export async function flushGroceryOutbox(): Promise<FlushGroceryOutboxResult> {
  if (!isGroceryOutboxSupported()) {
    return { status: "empty" };
  }

  while (true) {
    const rows = await listPendingSorted();
    const head = rows[0];
    if (!head) {
      return { status: "empty" };
    }

    try {
      await createGroceryInvoice(head.payload);
      await removeBySeq(head.seq);
    } catch (e) {
      if (e instanceof GroceryApiError) {
        if (e.status === 0 || e.status >= 500) {
          return { status: "paused_transient" };
        }
        return { status: "blocked", message: e.message };
      }
      // Network errors are transient
      return { status: "paused_transient" };
    }
  }
}
