/**
 * Browser-local draft for the New supply / Receive stock flows.
 * Survives refresh, drawer close, and logout (intentionally not cleared by
 * clearAllSessionData) so mid-entry qty/cost work is not lost.
 */

import type {
  ItemSummaryRecord,
  SupplierItemLinkRecord,
  SupplierRecord,
} from "@/lib/api";

export const SUPPLY_DRAFT_STORAGE_PREFIX = "palmart:supplyDraft:v1:";
export const CASHIER_SUPPLY_DRAFT_STORAGE_PREFIX =
  "palmart:cashierSupplyDraft:v1:";

export type SupplyDraftExtraPersisted = {
  key: string;
  category: string;
  amount: string;
  desc: string;
};

export type SupplyDraftRowPersisted = {
  key: string;
  source: "linked" | "adhoc";
  link?: SupplierItemLinkRecord;
  item: ItemSummaryRecord | null;
  qtyStr: string;
  unitStr: string;
  sellPriceStr: string;
  sellPriceTouched: boolean;
  expiry: string;
  serverLineId?: string | null;
};

export type NewSupplyDraftPersisted = {
  v: 1;
  updatedAt: number;
  businessId: string;
  userId: string;
  branchId: string;
  supplier: SupplierRecord | null;
  receivedAtLocal: string;
  notes: string;
  docRef: string;
  rows: SupplyDraftRowPersisted[];
  extras: SupplyDraftExtraPersisted[];
  showExpiry: boolean;
  /** Open Path B draft session id when server sync is active. */
  serverSessionId?: string | null;
};

export type CashierSupplyLinePersisted = {
  itemId: string;
  name: string;
  sku: string;
  stock: number | null;
  qtyStr: string;
  costStr: string;
  sellStr: string;
  seedCost: string;
  seedSell: string;
};

export type CashierSupplyDraftPersisted = {
  v: 1;
  updatedAt: number;
  businessId: string;
  userId: string;
  branchId: string;
  supplier: SupplierRecord | null;
  lines: CashierSupplyLinePersisted[];
};

function storageKey(prefix: string, businessId: string, userId: string): string {
  return `${prefix}${businessId.trim()}:${userId.trim()}`;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

function removeKey(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function newSupplyDraftHasProgress(
  draft: Pick<
    NewSupplyDraftPersisted,
    "supplier" | "notes" | "docRef" | "rows" | "extras"
  >,
): boolean {
  if (draft.supplier) {
    return true;
  }
  if (draft.notes.trim() || draft.docRef.trim()) {
    return true;
  }
  if (draft.extras.some((e) => e.amount.trim() || e.desc.trim())) {
    return true;
  }
  return draft.rows.some(
    (r) =>
      r.qtyStr.trim() ||
      r.expiry.trim() ||
      r.sellPriceTouched ||
      r.source === "adhoc",
  );
}

export function cashierSupplyDraftHasProgress(
  draft: Pick<CashierSupplyDraftPersisted, "supplier" | "lines">,
): boolean {
  if (draft.supplier) {
    return true;
  }
  return draft.lines.some(
    (l) =>
      l.qtyStr.trim() ||
      (l.costStr.trim() && l.costStr !== l.seedCost) ||
      (l.sellStr.trim() && l.sellStr !== l.seedSell),
  );
}

export function loadNewSupplyDraft(
  businessId: string,
  userId: string,
): NewSupplyDraftPersisted | null {
  const bid = businessId.trim();
  const uid = userId.trim();
  if (!bid || !uid) {
    return null;
  }
  const draft = readJson<NewSupplyDraftPersisted>(
    storageKey(SUPPLY_DRAFT_STORAGE_PREFIX, bid, uid),
  );
  if (!draft || draft.v !== 1) {
    return null;
  }
  if (draft.businessId !== bid || draft.userId !== uid) {
    return null;
  }
  if (!Array.isArray(draft.rows) || !Array.isArray(draft.extras)) {
    return null;
  }
  return draft;
}

export function saveNewSupplyDraft(
  draft: Omit<NewSupplyDraftPersisted, "v" | "updatedAt">,
): void {
  const bid = draft.businessId.trim();
  const uid = draft.userId.trim();
  if (!bid || !uid) {
    return;
  }
  if (!newSupplyDraftHasProgress(draft)) {
    clearNewSupplyDraft(bid, uid);
    return;
  }
  writeJson(storageKey(SUPPLY_DRAFT_STORAGE_PREFIX, bid, uid), {
    ...draft,
    businessId: bid,
    userId: uid,
    v: 1 as const,
    updatedAt: Date.now(),
  } satisfies NewSupplyDraftPersisted);
}

export function clearNewSupplyDraft(businessId: string, userId: string): void {
  const bid = businessId.trim();
  const uid = userId.trim();
  if (!bid || !uid) {
    return;
  }
  removeKey(storageKey(SUPPLY_DRAFT_STORAGE_PREFIX, bid, uid));
}

export function loadCashierSupplyDraft(
  businessId: string,
  userId: string,
): CashierSupplyDraftPersisted | null {
  const bid = businessId.trim();
  const uid = userId.trim();
  if (!bid || !uid) {
    return null;
  }
  const draft = readJson<CashierSupplyDraftPersisted>(
    storageKey(CASHIER_SUPPLY_DRAFT_STORAGE_PREFIX, bid, uid),
  );
  if (!draft || draft.v !== 1) {
    return null;
  }
  if (draft.businessId !== bid || draft.userId !== uid) {
    return null;
  }
  if (!Array.isArray(draft.lines)) {
    return null;
  }
  return draft;
}

export function saveCashierSupplyDraft(
  draft: Omit<CashierSupplyDraftPersisted, "v" | "updatedAt">,
): void {
  const bid = draft.businessId.trim();
  const uid = draft.userId.trim();
  if (!bid || !uid) {
    return;
  }
  if (!cashierSupplyDraftHasProgress(draft)) {
    clearCashierSupplyDraft(bid, uid);
    return;
  }
  writeJson(storageKey(CASHIER_SUPPLY_DRAFT_STORAGE_PREFIX, bid, uid), {
    ...draft,
    businessId: bid,
    userId: uid,
    v: 1 as const,
    updatedAt: Date.now(),
  } satisfies CashierSupplyDraftPersisted);
}

export function clearCashierSupplyDraft(
  businessId: string,
  userId: string,
): void {
  const bid = businessId.trim();
  const uid = userId.trim();
  if (!bid || !uid) {
    return;
  }
  removeKey(storageKey(CASHIER_SUPPLY_DRAFT_STORAGE_PREFIX, bid, uid));
}

/** Merge persisted line edits onto a fresh supplier-link catalog. */
export function mergeNewSupplyRowsOntoLinks(
  links: SupplierItemLinkRecord[],
  draftRows: SupplyDraftRowPersisted[],
  seedEmptyRow: (link: SupplierItemLinkRecord) => SupplyDraftRowPersisted,
  itemIdOf: (row: SupplyDraftRowPersisted) => string | null,
): SupplyDraftRowPersisted[] {
  const byItemId = new Map<string, SupplyDraftRowPersisted>();
  const adhoc: SupplyDraftRowPersisted[] = [];
  for (const row of draftRows) {
    const id = itemIdOf(row);
    if (row.source === "adhoc" || !id) {
      adhoc.push(row);
      continue;
    }
    byItemId.set(id, row);
  }

  const merged: SupplyDraftRowPersisted[] = [];
  for (const link of links.filter((l) => l.active)) {
    const prev = byItemId.get(link.itemId);
    byItemId.delete(link.itemId);
    if (prev) {
      merged.push({
        ...prev,
        source: "linked",
        link,
      });
    } else {
      merged.push(seedEmptyRow(link));
    }
  }

  for (const orphan of byItemId.values()) {
    merged.push(orphan);
  }
  return [...merged, ...adhoc];
}

export function mergeCashierLinesOntoLinks(
  links: SupplierItemLinkRecord[],
  draftLines: CashierSupplyLinePersisted[],
  linkToDraft: (link: SupplierItemLinkRecord) => CashierSupplyLinePersisted,
): CashierSupplyLinePersisted[] {
  const byItemId = new Map(
    draftLines.map((l) => [l.itemId, l] as const),
  );
  const merged: CashierSupplyLinePersisted[] = [];
  for (const link of links.filter((l) => l.active)) {
    const prev = byItemId.get(link.itemId);
    byItemId.delete(link.itemId);
    const fresh = linkToDraft(link);
    if (prev) {
      merged.push({
        ...fresh,
        qtyStr: prev.qtyStr,
        costStr: prev.costStr,
        sellStr: prev.sellStr,
      });
    } else {
      merged.push(fresh);
    }
  }
  return merged;
}
