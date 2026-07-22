/**
 * Sync New supply UI draft lines to a Path B server draft session
 * (qty / unit cost / sell / expiry via draft* fields).
 */

import {
  addPathBLine,
  createPathBSession,
  deletePathBLine,
  fetchPathBSession,
  fetchPathBSessions,
  patchPathBLine,
  patchPathBSession,
  type AddPathBLinePayload,
  type PathBLineRecord,
  type PathBSessionDetailRecord,
  type PathBSessionListRowRecord,
  type SupplierRecord,
} from "@/lib/api";

export type SupplyClientDraftJsonV1 = {
  v: 1;
  docRef?: string;
  showExpiry?: boolean;
  extras?: { key: string; category: string; amount: string; desc: string }[];
};

export type SyncableSupplyRow = {
  key: string;
  serverLineId?: string | null;
  qtyStr: string;
  unitStr: string;
  sellPriceStr: string;
  sellPriceTouched: boolean;
  expiry: string;
  description: string;
  suggestedItemId: string | null;
  /** qty × unit cost line total; null when row is not ready to sync. */
  amountMoney: number | null;
  qty: number | null;
  unitCost: number | null;
  sellPrice: number | null;
};

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildSupplyClientDraftJson(input: {
  docRef: string;
  showExpiry: boolean;
  extras: { key: string; category: string; amount: string; desc: string }[];
}): string {
  const payload: SupplyClientDraftJsonV1 = {
    v: 1,
    docRef: input.docRef.trim() || undefined,
    showExpiry: input.showExpiry || undefined,
    extras: input.extras.length > 0 ? input.extras : undefined,
  };
  return JSON.stringify(payload);
}

export function parseSupplyClientDraftJson(
  raw: string | null | undefined,
): SupplyClientDraftJsonV1 | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SupplyClientDraftJsonV1;
    if (!parsed || parsed.v !== 1) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function parseSupplyNotesParts(notes: string | null | undefined): {
  docRef: string;
  notes: string;
} {
  const raw = (notes ?? "").trim();
  if (!raw) {
    return { docRef: "", notes: "" };
  }
  const lines = raw.split("\n");
  const first = lines[0] ?? "";
  const prefix = "Supplier document ref: ";
  if (first.startsWith(prefix)) {
    return {
      docRef: first.slice(prefix.length).trim(),
      notes: lines.slice(1).join("\n").trim(),
    };
  }
  return { docRef: "", notes: raw };
}

export function composeSupplySessionNotes(docRef: string, notes: string): string | null {
  const parts = [
    docRef.trim() ? `Supplier document ref: ${docRef.trim()}` : "",
    notes.trim(),
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

function moneyStr(v: number | string | null | undefined): string {
  if (v == null || String(v).trim() === "") {
    return "";
  }
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || n < 0) {
    return "";
  }
  return n.toFixed(2);
}

function qtyStr(v: number | string | null | undefined): string {
  if (v == null || String(v).trim() === "") {
    return "";
  }
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || n <= 0) {
    return "";
  }
  return Number.isInteger(n) ? String(n) : String(n);
}

export function pathBLineToSyncFields(line: PathBLineRecord): {
  qtyStr: string;
  unitStr: string;
  sellPriceStr: string;
  sellPriceTouched: boolean;
  expiry: string;
  amountMoney: number | null;
} {
  const draftQty = line.draftQty != null ? Number(line.draftQty) : NaN;
  const draftUnit = line.draftUnitCost != null ? Number(line.draftUnitCost) : NaN;
  const amount = Number(line.amountMoney);
  const hasDraftQty = Number.isFinite(draftQty) && draftQty > 0;
  const hasDraftUnit = Number.isFinite(draftUnit) && draftUnit > 0;
  const sell = moneyStr(line.draftSellPrice);
  return {
    qtyStr: hasDraftQty ? qtyStr(draftQty) : hasDraftUnit && Number.isFinite(amount) && amount > 0
      ? "1"
      : "",
    unitStr: hasDraftUnit
      ? moneyStr(draftUnit)
      : Number.isFinite(amount) && amount > 0
        ? moneyStr(amount)
        : "",
    sellPriceStr: sell,
    sellPriceTouched: sell.length > 0,
    expiry: line.draftExpiryDate?.trim() || "",
    amountMoney: Number.isFinite(amount) ? amount : null,
  };
}

function toLinePayload(row: SyncableSupplyRow): AddPathBLinePayload | null {
  if (row.amountMoney == null || row.amountMoney <= 0 || !row.suggestedItemId) {
    return null;
  }
  if (row.qty == null || row.unitCost == null) {
    return null;
  }
  const exp = row.expiry.trim();
  return {
    description: row.description,
    amountMoney: roundMoney2(row.amountMoney),
    suggestedItemId: row.suggestedItemId,
    draftQty: row.qty,
    draftUnitCost: roundMoney2(row.unitCost),
    draftSellPrice: row.sellPrice,
    draftExpiryDate: exp.length >= 8 ? exp : null,
  };
}

export async function ensureSupplyPathBSession(input: {
  sessionId: string | null;
  supplier: SupplierRecord;
  branchId: string;
  receivedAtIso: string;
  notes: string | null;
  clientDraftJson: string | null;
}): Promise<string> {
  if (input.sessionId?.trim()) {
    await patchPathBSession(input.sessionId.trim(), {
      receivedAt: input.receivedAtIso,
      notes: input.notes,
      clientDraftJson: input.clientDraftJson,
    });
    return input.sessionId.trim();
  }
  const created = await createPathBSession({
    supplierId: input.supplier.id,
    branchId: input.branchId.trim(),
    receivedAt: input.receivedAtIso,
    notes: input.notes,
    clientDraftJson: input.clientDraftJson,
  });
  return created.id;
}

/**
 * Sync filled rows to the server draft; returns rows with serverLineId assigned.
 * Rows without a syncable payload are returned unchanged (serverLineId cleared if previously set).
 */
export async function syncSupplyPathBLines(
  sessionId: string,
  rows: SyncableSupplyRow[],
): Promise<SyncableSupplyRow[]> {
  const sid = sessionId.trim();
  const syncable = rows
    .map((row) => ({ row, payload: toLinePayload(row) }))
    .filter((x): x is { row: SyncableSupplyRow; payload: AddPathBLinePayload } => x.payload != null);

  const keepIds = new Set(
    syncable
      .map((x) => x.row.serverLineId?.trim())
      .filter((id): id is string => Boolean(id)),
  );

  const knownIds = new Set(
    rows
      .map((r) => r.serverLineId?.trim())
      .filter((id): id is string => Boolean(id)),
  );
  for (const id of knownIds) {
    if (!keepIds.has(id)) {
      try {
        await deletePathBLine(sid, id);
      } catch {
        /* line may already be gone */
      }
    }
  }

  const nextByKey = new Map<string, SyncableSupplyRow>();
  for (const row of rows) {
    nextByKey.set(row.key, { ...row, serverLineId: null });
  }

  for (const { row, payload } of syncable) {
    if (row.serverLineId?.trim()) {
      const updated = await patchPathBLine(sid, row.serverLineId.trim(), payload);
      nextByKey.set(row.key, { ...row, serverLineId: updated.id });
    } else {
      const created = await addPathBLine(sid, payload);
      nextByKey.set(row.key, { ...row, serverLineId: created.id });
    }
  }

  return rows.map((r) => nextByKey.get(r.key) ?? r);
}

export async function findLatestSupplyPathBDraft(opts: {
  branchId: string;
  supplierId?: string;
}): Promise<PathBSessionListRowRecord | null> {
  const drafts = await fetchPathBSessions({
    supplierId: opts.supplierId,
    status: "draft",
  });
  const bid = opts.branchId.trim();
  const filtered = drafts.filter((d) => !bid || d.branchId === bid);
  return filtered[0] ?? null;
}

export async function loadSupplyPathBDraftSession(
  sessionId: string,
): Promise<PathBSessionDetailRecord> {
  return fetchPathBSession(sessionId);
}

export async function clearSupplyPathBDraftLines(sessionId: string): Promise<void> {
  const detail = await fetchPathBSession(sessionId);
  for (const line of detail.lines) {
    if (line.lineStatus !== "pending") {
      continue;
    }
    try {
      await deletePathBLine(sessionId, line.id);
    } catch {
      /* ignore */
    }
  }
  try {
    await patchPathBSession(sessionId, {
      notes: null,
      clientDraftJson: null,
    });
  } catch {
    /* ignore */
  }
}
