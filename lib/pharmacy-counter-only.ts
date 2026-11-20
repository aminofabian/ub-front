"use client";

/**
 * Which products need the pharmacist (every medicine that is not over-the-counter).
 *
 * The server refuses such a sale unless it carries dispensing details, but an offline till
 * cannot ask the server: it would queue the sale, hand over the medicine, and only learn on
 * replay that the sale was refused. So the till keeps this list of item ids from its last
 * online moment and refuses to queue those sales. Ids only; nothing about patients or sales.
 */
import { apiRequest } from "@/lib/api";

const STORAGE_PREFIX = "kiosk.pharmacy.counterOnly.";

const memory = new Map<string, Set<string>>();

function storageKey(businessId: string): string {
  return `${STORAGE_PREFIX}${businessId}`;
}

function readStored(businessId: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(storageKey(businessId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id): id is string => typeof id === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

/** Fetches the list and remembers it for offline use. Failures keep the last known list. */
export async function refreshCounterOnlyItemIds(businessId: string): Promise<void> {
  const bid = businessId.trim();
  if (!bid) return;
  try {
    const ids = await apiRequest<string[]>("/api/v1/pharmacy/dispensing/counter-only-item-ids", {
      toast: false,
    });
    const set = new Set(ids);
    memory.set(bid, set);
    try {
      window.localStorage.setItem(storageKey(bid), JSON.stringify([...set]));
    } catch {
      // Storage full or blocked: the in-memory copy still covers this session.
    }
  } catch {
    // Offline or not allowed: keep whatever was known before.
  }
}

/** True when any of the given items needs the pharmacist, by the last list this till saw. */
export function cartHasCounterOnlyItem(businessId: string | null | undefined, itemIds: string[]): boolean {
  const bid = businessId?.trim();
  if (!bid || itemIds.length === 0) return false;
  let known = memory.get(bid);
  if (!known) {
    known = typeof window === "undefined" ? new Set<string>() : readStored(bid);
    memory.set(bid, known);
  }
  if (known.size === 0) return false;
  return itemIds.some((id) => known.has(id));
}

export const OFFLINE_DISPENSING_MESSAGE =
  "Prescription medicines cannot be sold while this till is offline. Remove them from the sale, or try again when you are back online.";
