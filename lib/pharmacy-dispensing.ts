/**
 * The till side of the dispensing rule.
 *
 * When a sale holds a medicine that cannot be sold as it stands, the API answers with the same
 * tagged problem the setup dialogs use (`code: "setup_required"`), with `requirement:
 * "dispensing"` and a `hint` that says what is missing:
 *
 *  - `record`     the sale needs prescriber details
 *  - `approve`    the cashier may not dispense; a pharmacist has to approve with their PIN
 *  - `classify`   a medicine has no dispensing class yet (a manager has to set one)
 *  - `controlled` a controlled medicine cannot be sold through the till
 *
 * `record` and `approve` are fixed on the spot in the dispensing dialog, and the sale is sent
 * again with a `dispensing` block. The other two stop the sale with a plain message.
 */

export type DispensingHint = "record" | "approve" | "classify" | "controlled";

export type DispensingRequiredDetail = { hint: DispensingHint; message: string };

const HINTS: readonly DispensingHint[] = ["record", "approve", "classify", "controlled"];

/** Reads the dispensing problem from an API error body; null for every other error. */
export function parseDispensingRequired(payload: unknown): DispensingRequiredDetail | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (record.code !== "setup_required" || record.requirement !== "dispensing") {
    return null;
  }
  const hint = HINTS.find((h) => h === record.hint) ?? "record";
  const text =
    (typeof record.detail === "string" && record.detail.trim()) ||
    (typeof record.title === "string" && record.title.trim()) ||
    "";
  return { hint, message: text };
}

/** True when the dialog can fix the problem; false when the sale simply cannot go through. */
export function dispensingIsFixableAtTill(hint: DispensingHint): boolean {
  return hint === "record" || hint === "approve";
}

/** What the sale request carries once the dialog has been filled in. */
export type SaleDispensingPayload = {
  prescriberName: string;
  prescriberRegNo?: string;
  prescriptionRef?: string;
  prescriptionDate?: string;
  patientName?: string;
  patientPhone?: string;
  approvalId?: string;
  /** A patient profile to file the record under. */
  patientId?: string;
  lines?: SaleDispensingLine[];
};

/** Per-medicine details. Everything but the item is optional. */
export type SaleDispensingLine = {
  itemId: string;
  instructions?: string;
  /** What the prescription asked for, when more than is being supplied now. */
  quantityPrescribed?: number;
  /** When this supply runs out (yyyy-MM-dd). */
  refillDueOn?: string;
  /** The earlier record line whose outstanding balance this sale supplies. */
  settlesLineId?: string;
};

/** The date a supply bought today runs out, given how many days it lasts. Blank when unknown. */
export function refillDueDate(daysSupply: number | null | undefined, today: Date = new Date()): string | undefined {
  if (daysSupply == null || !Number.isFinite(daysSupply) || daysSupply <= 0 || daysSupply > 366) return undefined;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + Math.floor(daysSupply));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Drops blank optional fields so the request stays small and passes validation. */
export function cleanDispensingPayload(input: SaleDispensingPayload): SaleDispensingPayload {
  const out: SaleDispensingPayload = { prescriberName: input.prescriberName.trim() };
  const put = (key: "prescriberRegNo" | "prescriptionRef" | "prescriptionDate" | "patientName" | "patientPhone" | "approvalId") => {
    const v = input[key]?.trim();
    if (v) out[key] = v;
  };
  put("prescriberRegNo");
  put("prescriptionRef");
  put("prescriptionDate");
  put("patientName");
  put("patientPhone");
  put("approvalId");
  const patientId = input.patientId?.trim();
  if (patientId) out.patientId = patientId;
  const lines: SaleDispensingLine[] = [];
  for (const l of input.lines ?? []) {
    const line: SaleDispensingLine = { itemId: l.itemId.trim() };
    const instructions = l.instructions?.trim();
    if (instructions) line.instructions = instructions;
    if (l.quantityPrescribed != null && Number.isFinite(l.quantityPrescribed) && l.quantityPrescribed > 0) {
      line.quantityPrescribed = l.quantityPrescribed;
    }
    if (l.refillDueOn?.trim()) line.refillDueOn = l.refillDueOn.trim();
    if (l.settlesLineId?.trim()) line.settlesLineId = l.settlesLineId.trim();
    // A line with nothing but the item says nothing, so it is left out.
    if (line.itemId && Object.keys(line).length > 1) lines.push(line);
  }
  if (lines.length > 0) out.lines = lines;
  return out;
}

/**
 * The dispensing details as they may sit in the browser's offline sale queue: without the
 * patient's name and phone. Those two are optional on the record, and a queue on a shared till
 * is not a place to keep them. Everything the server requires is kept.
 */
export function withoutPatientDetails<T extends { dispensing?: SaleDispensingPayload }>(payload: T): T {
  if (!payload.dispensing) return payload;
  const { patientName: _name, patientPhone: _phone, ...rest } = payload.dispensing;
  void _name;
  void _phone;
  return { ...payload, dispensing: rest };
}

/**
 * The sale's medicines and quantities in a form that changes when either does. Lines for the
 * same product are added together, because one cart may hold two lines of it. Used to decide
 * whether details typed for an earlier attempt still describe the sale in front of the cashier.
 */
export function saleFingerprint(
  lines: ReadonlyArray<{ itemId?: string | null; quantity: number | string }>,
): string {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const id = line.itemId?.trim() ?? "";
    const qty = Number(line.quantity);
    if (id === "" || !Number.isFinite(qty) || qty <= 0) continue;
    totals.set(id, (totals.get(id) ?? 0) + qty);
  }
  return [...totals.entries()]
    .map(([id, qty]) => `${id}:${qty.toFixed(3)}`)
    .sort()
    .join("|");
}
