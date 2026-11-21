/**
 * Pharmacy at the till: what the cashier sees about a medicine before anything is charged
 * (class, generic name, the lot and expiry the next unit comes from), the patient attached to
 * the sale, and generic-name search. Display only. The server still checks every sale.
 */

import { apiRequest, fetchItems, type ItemSummaryRecord } from "@/lib/api";
import type { DispensingClass, PatientMatch } from "@/lib/pharmacy-api";

export type TillMedicineStatus = "ok" | "needs_record" | "unclassified" | "controlled_blocked";

export type TillMedicine = {
  itemId: string;
  dispensingClass: DispensingClass;
  status: TillMedicineStatus;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  nextLot: string | null;
  nextExpiry: string | null;
  shortDated: boolean;
};

type TillMedicinesResponse = { medicines: TillMedicine[]; mayDispense: boolean };

export type GenericMatch = {
  itemId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  genericName: string | null;
};

export function fetchTillMedicines(itemIds: string[], branchId: string | null): Promise<TillMedicinesResponse> {
  return apiRequest("/api/v1/pharmacy/till/medicines", {
    method: "POST",
    body: { itemIds, branchId: branchId || undefined },
    toast: false,
  });
}

export function fetchGenericMatches(q: string): Promise<GenericMatch[]> {
  return apiRequest(`/api/v1/pharmacy/till/generic?q=${encodeURIComponent(q)}`, { toast: false });
}

/** True when the till must not let this medicine into a sale. */
export function tillMedicineBlocked(m: TillMedicine | null | undefined): boolean {
  return m?.status === "unclassified" || m?.status === "controlled_blocked";
}

export function tillBlockedReason(m: TillMedicine): string {
  return m.status === "controlled_blocked"
    ? "Controlled. Cannot be sold at this till."
    : "No class set yet. Cannot be sold.";
}

/** "Mar 2027" from an ISO date; the day is left out because packs are dated by month. */
export function formatTillExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return null;
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return month ? `${month} ${y}` : null;
}

/** "Amoxicillin 500 mg capsule", or null when nothing is recorded. */
export function tillGenericLine(m: TillMedicine): string | null {
  const parts = [m.genericName, m.strength, m.dosageForm?.toLowerCase()].filter(
    (p): p is string => Boolean(p && p.trim()),
  );
  return parts.length > 0 ? parts.join(" ") : null;
}

const FRESH_MS = 60_000;
const MAX_BATCH = 150;

type Entry = { info: TillMedicine | null; at: number };

/**
 * Per-till cache of medicine details. Rows ask for the item they show; the store gathers the
 * asks into one request. An item that is not a medicine is remembered as null.
 */
export class PharmacyTillStore {
  private data = new Map<string, Entry>();
  private pending = new Set<string>();
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private branchId: string | null = null;
  /**
   * The patient belongs to the cart, not the till: two parked carts can be for two different
   * people, and carrying one across would file the second sale under the first patient.
   */
  private activeCartId: string | null = null;
  private patients = new Map<string, PatientMatch>();
  private mayDispenseValue = false;

  constructor(readonly enabled: boolean) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    for (const l of this.listeners) l();
  }

  /** Lots differ by branch, so a branch change drops what is cached. */
  setBranch(branchId: string | null) {
    const next = branchId?.trim() || null;
    if (next === this.branchId) return;
    this.branchId = next;
    const known = [...this.data.keys()];
    this.data.clear();
    for (const id of known) this.pending.add(id);
    this.schedule();
    this.emit();
  }

  get = (itemId: string): TillMedicine | null => this.data.get(itemId)?.info ?? null;

  request(itemId: string) {
    if (!this.enabled || !itemId) return;
    const entry = this.data.get(itemId);
    if (entry && Date.now() - entry.at < FRESH_MS) return;
    this.pending.add(itemId);
    this.schedule();
  }

  /** After a sale the next lot may have changed. */
  refreshAll() {
    for (const id of this.data.keys()) this.pending.add(id);
    this.schedule();
  }

  private schedule() {
    if (this.timer || this.pending.size === 0 || !this.enabled) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, 120);
  }

  private async flush() {
    const ids = [...this.pending].slice(0, MAX_BATCH);
    for (const id of ids) this.pending.delete(id);
    if (ids.length === 0) return;
    const branch = this.branchId;
    try {
      const res = await fetchTillMedicines(ids, branch);
      if (branch !== this.branchId) return;
      const byId = new Map(res.medicines.map((m) => [m.itemId, m]));
      const at = Date.now();
      for (const id of ids) this.data.set(id, { info: byId.get(id) ?? null, at });
      this.mayDispenseValue = res.mayDispense;
      this.emit();
    } catch {
      // Offline or refused: rows simply show no medicine line. The sale is still checked by the server.
    }
    this.schedule();
  }

  mayDispense = (): boolean => this.mayDispenseValue;

  /** Which cart is on screen; its patient is the one the till shows and the sale uses. */
  setActiveCart(cartId: string | null) {
    const next = cartId?.trim() || null;
    if (next === this.activeCartId) return;
    this.activeCartId = next;
    this.emit();
  }

  private patientKey(): string {
    return this.activeCartId ?? "";
  }

  patient = (): PatientMatch | null => this.patients.get(this.patientKey()) ?? null;

  setPatient(patient: PatientMatch | null) {
    const key = this.patientKey();
    if (patient) this.patients.set(key, patient);
    else this.patients.delete(key);
    this.emit();
  }

  /** Forgets a cart's patient (a removed or finished cart), leaving the others alone. */
  clearPatient(cartId: string) {
    if (this.patients.delete(cartId)) this.emit();
  }

  /** Drops patients whose cart is no longer open. */
  retainCarts(cartIds: readonly string[]) {
    const open = new Set(cartIds);
    let changed = false;
    for (const id of [...this.patients.keys()]) {
      if (open.has(id)) continue;
      this.patients.delete(id);
      changed = true;
    }
    if (changed) this.emit();
  }
}

/** Used where there is no pharmacy till; every lookup answers "not a medicine". */
export const NO_PHARMACY_TILL = new PharmacyTillStore(false);

/**
 * Catalogue rows for medicines whose generic name matches the search, leaving out rows the search
 * already found. Each match is re-read through the normal product search so the row carries the
 * same price and stock fields as every other hit.
 */
export async function fetchGenericHits(
  q: string,
  have: ReadonlySet<string>,
  opts: { branchId?: string | null; signal?: AbortSignal },
): Promise<ItemSummaryRecord[]> {
  const query = q.trim();
  if (query.length < 3 || /^\d+$/.test(query)) return [];
  const matches = (await fetchGenericMatches(query)).filter((m) => !have.has(m.itemId));
  if (matches.length === 0) return [];
  const rows = await Promise.all(
    matches.map(async (m) => {
      const key = m.sku?.trim() || m.barcode?.trim() || m.name;
      try {
        const found = await fetchItems(key, {
          catalogScope: "SKUS_ONLY",
          softAuth: true,
          signal: opts.signal,
          size: 10,
          ...(opts.branchId?.trim() ? { branchId: opts.branchId.trim() } : {}),
        });
        return found.find((item) => item.id === m.itemId) ?? null;
      } catch {
        return null;
      }
    }),
  );
  return rows.filter((r): r is ItemSummaryRecord => r !== null);
}

/**
 * What the dispensing dialog needs to know about a cart when the server cannot be asked
 * (the till is offline). Built from what the till already learned about each medicine while it
 * was online.
 *
 * Null means the dialog must not open offline: the person at the till could not dispense when
 * last checked, or the till never learned about a medicine in this cart that needs a record.
 * A pharmacist's PIN approval cannot be given offline, so only someone who may dispense
 * themselves gets through.
 */
export function offlineDispensingCheck(
  cart: ReadonlyArray<{ itemId: string; name: string }>,
  get: (itemId: string) => TillMedicine | null,
  mayDispense: boolean,
): {
  lines: Array<{ itemId: string; name: string; dispensingClass: DispensingClass; status: TillMedicineStatus }>;
  needsRecord: boolean;
  blocked: boolean;
  userMayDispense: boolean;
} | null {
  if (!mayDispense) return null;
  const seen = new Set<string>();
  const lines: Array<{ itemId: string; name: string; dispensingClass: DispensingClass; status: TillMedicineStatus }> = [];
  for (const line of cart) {
    if (!line.itemId || seen.has(line.itemId)) continue;
    seen.add(line.itemId);
    const info = get(line.itemId);
    if (!info) continue;
    lines.push({ itemId: line.itemId, name: line.name, dispensingClass: info.dispensingClass, status: info.status });
  }
  const needsRecord = lines.some((l) => l.status === "needs_record");
  if (!needsRecord) return null;
  return {
    lines,
    needsRecord,
    blocked: lines.some((l) => l.status === "unclassified" || l.status === "controlled_blocked"),
    userMayDispense: true,
  };
}
