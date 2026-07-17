/** Local marks for following along on the day payment ledger (per business + day). */

export type PaymentLedgerMark = {
  reviewed: boolean;
  flagged: boolean;
  note: string;
};

export type PaymentLedgerMarksMap = Record<string, PaymentLedgerMark>;

function storageKey(businessId: string, day: string): string {
  return `ub.paymentLedger.marks.${businessId.trim() || "default"}.${day.trim()}`;
}

export function emptyMark(): PaymentLedgerMark {
  return { reviewed: false, flagged: false, note: "" };
}

export function loadPaymentLedgerMarks(
  businessId: string,
  day: string,
): PaymentLedgerMarksMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(businessId, day));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: PaymentLedgerMarksMap = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object") continue;
      const v = value as Partial<PaymentLedgerMark>;
      out[id] = {
        reviewed: Boolean(v.reviewed),
        flagged: Boolean(v.flagged),
        note: typeof v.note === "string" ? v.note : "",
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function savePaymentLedgerMarks(
  businessId: string,
  day: string,
  marks: PaymentLedgerMarksMap,
): void {
  if (typeof window === "undefined") return;
  const compact: PaymentLedgerMarksMap = {};
  for (const [id, mark] of Object.entries(marks)) {
    if (!mark.reviewed && !mark.flagged && !mark.note.trim()) continue;
    compact[id] = {
      reviewed: mark.reviewed,
      flagged: mark.flagged,
      note: mark.note.trim(),
    };
  }
  try {
    if (Object.keys(compact).length === 0) {
      window.localStorage.removeItem(storageKey(businessId, day));
    } else {
      window.localStorage.setItem(
        storageKey(businessId, day),
        JSON.stringify(compact),
      );
    }
  } catch {
    // quota / private mode — ignore
  }
}

export function getMark(
  marks: PaymentLedgerMarksMap,
  paymentId: string,
): PaymentLedgerMark {
  return marks[paymentId] ?? emptyMark();
}
