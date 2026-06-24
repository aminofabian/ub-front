import type { PostSalePayload } from "@/lib/api";
import { tryPostSaleWithRetries } from "@/lib/api";

const DB_NAME = "ub_pos_outbox_v1";
const DB_VERSION = 1;
const STORE = "pending_sales";

export type PendingSaleRow = {
  seq: number;
  idempotencyKey: string;
  payload: PostSalePayload;
  createdAt: number;
};

export function isSaleOutboxSupported(): boolean {
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
        const os = db.createObjectStore(STORE, { keyPath: "seq", autoIncrement: true });
        os.createIndex("byIdempotencyKey", "idempotencyKey", { unique: true });
      }
    };
  });
}

export async function enqueuePendingSale(
  idempotencyKey: string,
  payload: PostSalePayload,
): Promise<void> {
  if (!isSaleOutboxSupported()) {
    throw new Error("Offline sale queue requires IndexedDB.");
  }
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
      tx.objectStore(STORE).add({
        idempotencyKey: idempotencyKey.trim(),
        payload,
        createdAt: Date.now(),
      });
    });
  } finally {
    db.close();
  }
}

async function listPendingSorted(): Promise<PendingSaleRow[]> {
  const db = await openDb();
  try {
    const rows = await new Promise<PendingSaleRow[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as PendingSaleRow[]);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    });
    return rows.slice().sort((a, b) => a.seq - b.seq);
  } finally {
    db.close();
  }
}

export async function countPendingSales(): Promise<number> {
  if (!isSaleOutboxSupported()) {
    return 0;
  }
  const rows = await listPendingSorted();
  return rows.length;
}

async function removeBySeq(seq: number): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
      tx.objectStore(STORE).delete(seq);
    });
  } finally {
    db.close();
  }
}

export type FlushSaleOutboxResult =
  | { status: "empty" }
  | { status: "blocked"; message: string }
  | { status: "paused_transient" };

/**
 * Replays queued sales in FIFO order using each row’s original Idempotency-Key.
 * Stops on the first server/client rejection (4xx); leaves that row in the queue.
 */
export async function flushSaleOutbox(): Promise<FlushSaleOutboxResult> {
  if (!isSaleOutboxSupported()) {
    return { status: "empty" };
  }

  while (true) {
    const rows = await listPendingSorted();
    const head = rows[0];
    if (!head) {
      return { status: "empty" };
    }

    const result = await tryPostSaleWithRetries(head.payload, head.idempotencyKey);
    if (result.ok) {
      await removeBySeq(head.seq);
      continue;
    }

    if (result.status === 0 || result.status >= 500) {
      return { status: "paused_transient" };
    }

    return { status: "blocked", message: result.message };
  }
}
