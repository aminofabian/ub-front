/**
 * Browser-local drafts for Open / Close shift modals.
 * Survives modal dismiss and refresh so mid-entry counts/notes are not lost.
 */

export const OPEN_SHIFT_DRAFT_STORAGE_PREFIX = "palmart:openShiftDraft:v1:";
export const CLOSE_SHIFT_DRAFT_STORAGE_PREFIX = "palmart:closeShiftDraft:v1:";

export type OpenShiftDraftPersisted = {
  v: 1;
  updatedAt: number;
  businessId: string;
  userId: string;
  branchId: string;
  notes: string;
  /** Denomination value → quantity (KES). */
  quantities: Record<string, number>;
  /** Opening cash total string (non-KES). */
  cashTotalStr: string;
};

export type CloseShiftDraftPersisted = {
  v: 1;
  updatedAt: number;
  businessId: string;
  userId: string;
  shiftId: string;
  /** Invalidate draft if opening float changed since it was saved. */
  openingCashSnapshot: number;
  notes: string;
  varianceReason: string;
  quantities: Record<string, number>;
  cashTotalStr: string;
};

function openKey(businessId: string, userId: string): string {
  return `${OPEN_SHIFT_DRAFT_STORAGE_PREFIX}${businessId.trim()}:${userId.trim()}`;
}

function closeKey(
  businessId: string,
  userId: string,
  shiftId: string,
): string {
  return `${CLOSE_SHIFT_DRAFT_STORAGE_PREFIX}${businessId.trim()}:${userId.trim()}:${shiftId.trim()}`;
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

export function quantitiesRecordToPersisted(
  quantities: Record<number, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(quantities)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) {
      out[k] = n;
    }
  }
  return out;
}

export function persistedQuantitiesToRecord(
  quantities: Record<string, number> | undefined | null,
): Record<number, number> {
  const out: Record<number, number> = {};
  if (!quantities || typeof quantities !== "object") {
    return out;
  }
  for (const [k, v] of Object.entries(quantities)) {
    const denom = Number(k);
    const n = Number(v);
    if (Number.isFinite(denom) && Number.isFinite(n) && n > 0) {
      out[denom] = n;
    }
  }
  return out;
}

export function openShiftDraftHasProgress(
  draft: Pick<
    OpenShiftDraftPersisted,
    "branchId" | "notes" | "quantities" | "cashTotalStr"
  >,
): boolean {
  if (draft.notes.trim() || draft.cashTotalStr.trim()) {
    return true;
  }
  return Object.values(draft.quantities).some(
    (q) => Number.isFinite(q) && q > 0,
  );
}

export function closeShiftDraftHasProgress(
  draft: Pick<
    CloseShiftDraftPersisted,
    "notes" | "varianceReason" | "quantities" | "cashTotalStr"
  >,
): boolean {
  if (
    draft.notes.trim() ||
    draft.varianceReason.trim() ||
    draft.cashTotalStr.trim()
  ) {
    return true;
  }
  return Object.values(draft.quantities).some(
    (q) => Number.isFinite(q) && q > 0,
  );
}

export function loadOpenShiftDraft(
  businessId: string,
  userId: string,
): OpenShiftDraftPersisted | null {
  const bid = businessId.trim();
  const uid = userId.trim();
  if (!bid || !uid) {
    return null;
  }
  const draft = readJson<OpenShiftDraftPersisted>(openKey(bid, uid));
  if (!draft || draft.v !== 1) {
    return null;
  }
  if (draft.businessId !== bid || draft.userId !== uid) {
    return null;
  }
  if (typeof draft.quantities !== "object" || draft.quantities == null) {
    return null;
  }
  return draft;
}

export function saveOpenShiftDraft(draft: OpenShiftDraftPersisted): void {
  const bid = draft.businessId.trim();
  const uid = draft.userId.trim();
  if (!bid || !uid) {
    return;
  }
  if (!openShiftDraftHasProgress(draft)) {
    clearOpenShiftDraft(bid, uid);
    return;
  }
  writeJson(openKey(bid, uid), { ...draft, updatedAt: Date.now() });
}

export function clearOpenShiftDraft(
  businessId: string,
  userId: string,
): void {
  const bid = businessId.trim();
  const uid = userId.trim();
  if (!bid || !uid) {
    return;
  }
  removeKey(openKey(bid, uid));
}

export function loadCloseShiftDraft(
  businessId: string,
  userId: string,
  shiftId: string,
  openingCashSnapshot: number,
): CloseShiftDraftPersisted | null {
  const bid = businessId.trim();
  const uid = userId.trim();
  const sid = shiftId.trim();
  if (!bid || !uid || !sid) {
    return null;
  }
  const draft = readJson<CloseShiftDraftPersisted>(closeKey(bid, uid, sid));
  if (!draft || draft.v !== 1) {
    return null;
  }
  if (
    draft.businessId !== bid ||
    draft.userId !== uid ||
    draft.shiftId !== sid
  ) {
    return null;
  }
  if (typeof draft.quantities !== "object" || draft.quantities == null) {
    return null;
  }
  const snap = Number(draft.openingCashSnapshot);
  if (
    Number.isFinite(openingCashSnapshot) &&
    Number.isFinite(snap) &&
    snap !== openingCashSnapshot
  ) {
    // Opening float changed — discard stale count.
    clearCloseShiftDraft(bid, uid, sid);
    return null;
  }
  return draft;
}

export function saveCloseShiftDraft(draft: CloseShiftDraftPersisted): void {
  const bid = draft.businessId.trim();
  const uid = draft.userId.trim();
  const sid = draft.shiftId.trim();
  if (!bid || !uid || !sid) {
    return;
  }
  if (!closeShiftDraftHasProgress(draft)) {
    clearCloseShiftDraft(bid, uid, sid);
    return;
  }
  writeJson(closeKey(bid, uid, sid), { ...draft, updatedAt: Date.now() });
}

export function clearCloseShiftDraft(
  businessId: string,
  userId: string,
  shiftId: string,
): void {
  const bid = businessId.trim();
  const uid = userId.trim();
  const sid = shiftId.trim();
  if (!bid || !uid || !sid) {
    return;
  }
  removeKey(closeKey(bid, uid, sid));
}
