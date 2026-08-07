/**
 * Browser-local draft for the order-pad sheet.
 * Survives drawer close and refresh so unsaved name/qty rows are not lost.
 */

export const ORDER_PAD_DRAFT_STORAGE_PREFIX = "palmart:orderPadDraft:v1:";

export type OrderPadDraftLinePersisted = {
  key: string;
  itemName: string;
  quantity: string;
};

export type OrderPadDraftPersisted = {
  v: 1;
  updatedAt: number;
  branchId: string;
  lines: OrderPadDraftLinePersisted[];
};

function storageKey(branchId: string): string {
  return `${ORDER_PAD_DRAFT_STORAGE_PREFIX}${branchId.trim()}`;
}

export function readOrderPadDraft(branchId: string): OrderPadDraftPersisted | null {
  const bid = branchId.trim();
  if (!bid || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(bid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrderPadDraftPersisted;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.lines)) return null;
    if (parsed.branchId !== bid) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeOrderPadDraft(
  branchId: string,
  lines: OrderPadDraftLinePersisted[],
): void {
  const bid = branchId.trim();
  if (!bid || typeof window === "undefined") return;
  const hasContent = lines.some(
    (l) => l.itemName.trim() !== "" || l.quantity.trim() !== "",
  );
  try {
    if (!hasContent) {
      window.localStorage.removeItem(storageKey(bid));
      return;
    }
    const payload: OrderPadDraftPersisted = {
      v: 1,
      updatedAt: Date.now(),
      branchId: bid,
      lines,
    };
    window.localStorage.setItem(storageKey(bid), JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearOrderPadDraft(branchId: string): void {
  const bid = branchId.trim();
  if (!bid || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(bid));
  } catch {
    /* ignore */
  }
}
