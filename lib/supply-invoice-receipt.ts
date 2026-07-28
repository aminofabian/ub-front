/**
 * Supply-invoice receipt snapshot + client-side ESC/POS (cashier-matched layout).
 * Thermal bytes are built here because Path B sessions have no sale receipt API yet.
 */

export type SupplyInvoiceReceiptLine = {
  description: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  sku?: string | null;
};

export type SupplyInvoiceReceiptExtra = {
  category: string;
  amount: number;
  description?: string | null;
};

export type SupplyInvoiceReceiptSnapshot = {
  businessName: string;
  logoUrl?: string | null;
  branchName: string;
  branchAddress?: string | null;
  branchPhone?: string | null;
  branchEmail?: string | null;
  branchWebsite?: string | null;
  tillNumber?: string | null;
  receivedByName?: string | null;
  sessionId: string;
  supplierName: string;
  supplierCode?: string | null;
  receivedAt: string;
  currency: string;
  lines: SupplyInvoiceReceiptLine[];
  extras: SupplyInvoiceReceiptExtra[];
  grandTotal: number;
  /** Settlement promise shown on the slip. */
  paymentTerms: string;
  /** Delay / disputes contact line. */
  contactNote: string;
  /** Public supplier portal URL (SMS + slip). */
  portalUrl?: string | null;
};

export type BuildSupplyInvoiceReceiptInput = {
  businessName: string;
  logoUrl?: string | null;
  branchName: string;
  branchAddress?: string | null;
  branchPhone?: string | null;
  branchEmail?: string | null;
  branchWebsite?: string | null;
  tillNumber?: string | null;
  receivedByName?: string | null;
  sessionId: string;
  supplierName: string;
  supplierCode?: string | null;
  currency: string;
  receivedAt?: string;
  lines: SupplyInvoiceReceiptLine[];
  extras?: SupplyInvoiceReceiptExtra[];
  portalUrl?: string | null;
};

const CUT_TAIL = new Uint8Array([0x1b, 0x64, 0x08, 0x1d, 0x56, 0x01]);
const INIT = new Uint8Array([0x1b, 0x40]);

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function escPosCharWidth(widthMm: number): number {
  if (widthMm <= 50) return 28;
  if (widthMm <= 58) return 32;
  return 48;
}

function strip(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function repeat(ch: string, n: number): string {
  return ch.repeat(Math.max(0, n));
}

function padLeft(text: string, width: number): string {
  if (text.length >= width) return text.slice(-width);
  return " ".repeat(width - text.length) + text;
}

function center(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const pad = width - text.length;
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + text + " ".repeat(pad - left);
}

function wrap(text: string, width: number): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length <= width) return [t];
  const out: string[] = [];
  let rest = t;
  while (rest.length > width) {
    let cut = rest.lastIndexOf(" ", width);
    if (cut <= 0) cut = width;
    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

function formatMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`.trim();
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Creative settlement copy for the supplier slip. */
export function buildSupplyPaymentTerms(phone: string | null | undefined): {
  paymentTerms: string;
  contactNote: string;
} {
  const tel = phone?.trim() || null;
  return {
    paymentTerms:
      "Goods received in good order. This supply invoice will be settled within 48 hours.",
    contactNote: tel
      ? `Should there be any delay or query on payment, please contact us on ${tel}.`
      : "Should there be any delay or query on payment, please contact the branch on the number above.",
  };
}

export function buildSupplyInvoiceReceiptSnapshot(
  input: BuildSupplyInvoiceReceiptInput,
): SupplyInvoiceReceiptSnapshot {
  const lines = input.lines.map((line) => {
    const qty = line.quantity > 0 ? line.quantity : 1;
    const unit = line.unitCost >= 0 ? line.unitCost : 0;
    return {
      description: line.description.trim() || "Item",
      quantity: qty,
      unitCost: unit,
      lineTotal: roundMoney2(line.lineTotal >= 0 ? line.lineTotal : qty * unit),
      sku: line.sku?.trim() || null,
    };
  });
  const extras = (input.extras ?? [])
    .map((e) => ({
      category: e.category.trim().toLowerCase() || "other",
      amount: roundMoney2(e.amount >= 0 ? e.amount : 0),
      description: e.description?.trim() || null,
    }))
    .filter((e) => e.amount > 0);
  const linesTotal = roundMoney2(
    lines.reduce((sum, l) => sum + l.lineTotal, 0),
  );
  const extrasTotal = roundMoney2(
    extras.reduce((sum, e) => sum + e.amount, 0),
  );
  const grandTotal = roundMoney2(linesTotal + extrasTotal);
  const phone = input.branchPhone?.trim() || null;
  const terms = buildSupplyPaymentTerms(phone);
  const receivedAt = input.receivedAt?.trim() || new Date().toISOString();

  return {
    businessName: input.businessName.trim() || "Store",
    logoUrl: input.logoUrl?.trim() || null,
    branchName: input.branchName.trim(),
    branchAddress: input.branchAddress?.trim() || null,
    branchPhone: phone,
    branchEmail: input.branchEmail?.trim() || null,
    branchWebsite: input.branchWebsite?.trim() || null,
    tillNumber: input.tillNumber?.trim() || null,
    receivedByName: input.receivedByName?.trim() || null,
    sessionId: input.sessionId.trim(),
    supplierName: input.supplierName.trim() || "Supplier",
    supplierCode: input.supplierCode?.trim() || null,
    receivedAt,
    currency: input.currency.trim().toUpperCase() || "KES",
    lines,
    extras,
    grandTotal,
    paymentTerms: terms.paymentTerms,
    contactNote: terms.contactNote,
    portalUrl: input.portalUrl?.trim() || null,
  };
}

/**
 * Build ESC/POS bytes for the till print bridge (same INIT / feed / cut as sale receipts).
 */
export function buildSupplyInvoiceEscPos(
  snapshot: SupplyInvoiceReceiptSnapshot,
  widthMm = 80,
): Uint8Array {
  const w = escPosCharWidth(widthMm);
  const out: string[] = [];
  const currency = strip(snapshot.currency);
  const invoiceRef = strip(snapshot.sessionId).slice(0, 8).toUpperCase();

  out.push(center(strip(snapshot.businessName), w));
  if (snapshot.branchName.trim()) {
    out.push(center(strip(snapshot.branchName), w));
  }
  out.push(repeat("-", w));
  out.push(center("SUPPLY INVOICE", w));
  out.push(center(`#${invoiceRef}`, w));
  out.push(center(strip(formatDisplayDate(snapshot.receivedAt)), w));
  if (snapshot.receivedByName) {
    out.push(center(`Received by: ${strip(snapshot.receivedByName)}`, w));
  }
  out.push(repeat("-", w));
  out.push(center(`Supplier: ${strip(snapshot.supplierName)}`, w));
  if (snapshot.supplierCode) {
    out.push(center(`Code: ${strip(snapshot.supplierCode)}`, w));
  }
  out.push(repeat("-", w));

  for (const line of snapshot.lines) {
    const name = strip(line.description);
    for (const row of wrap(name, w)) {
      out.push(row);
    }
    if (line.sku) {
      out.push(strip(`SKU ${line.sku}`));
    }
    const detail = `${line.quantity} x ${line.unitCost.toFixed(2)} = ${line.lineTotal.toFixed(2)}`;
    out.push(padLeft(strip(detail), w));
  }

  if (snapshot.extras.length > 0) {
    out.push(repeat("-", w));
    out.push(center("EXTRA COSTS", w));
    for (const extra of snapshot.extras) {
      const label = strip(
        extra.description
          ? `${extra.category}: ${extra.description}`
          : extra.category,
      );
      for (const row of wrap(label, w)) {
        out.push(row);
      }
      out.push(padLeft(strip(extra.amount.toFixed(2)), w));
    }
  }

  out.push(repeat("-", w));
  out.push(
    padLeft(`AMOUNT DUE ${formatMoney(snapshot.grandTotal, currency)}`, w),
  );
  out.push(padLeft("Terms: PAY WITHIN 48 HOURS", w));
  out.push(repeat("-", w));

  for (const row of wrap(strip(snapshot.paymentTerms), w)) {
    out.push(center(row, w));
  }
  out.push("");
  for (const row of wrap(strip(snapshot.contactNote), w)) {
    out.push(center(row, w));
  }
  if (snapshot.portalUrl?.trim()) {
    out.push("");
    out.push(center("Track & notes:", w));
    for (const row of wrap(strip(snapshot.portalUrl), w)) {
      out.push(center(row, w));
    }
  }

  out.push(repeat("-", w));
  if (snapshot.branchAddress?.trim()) {
    for (const row of wrap(strip(snapshot.branchAddress), w)) {
      out.push(center(row, w));
    }
  }
  if (snapshot.branchPhone?.trim()) {
    out.push(center(`Tel: ${strip(snapshot.branchPhone)}`, w));
  }
  if (snapshot.tillNumber?.trim()) {
    out.push(center(`M-Pesa Till: ${strip(snapshot.tillNumber)}`, w));
  }
  if (snapshot.branchEmail?.trim()) {
    out.push(center(`Email: ${strip(snapshot.branchEmail)}`, w));
  }
  if (snapshot.branchWebsite?.trim()) {
    out.push(center(`Web: ${strip(snapshot.branchWebsite)}`, w));
  }
  out.push(center("Thank you for the delivery", w));

  const encoder = new TextEncoder();
  const bodyParts = out.map((line) => encoder.encode(`${line}\n`));
  let bodyLen = 0;
  for (const p of bodyParts) bodyLen += p.length;

  const bytes = new Uint8Array(INIT.length + bodyLen + CUT_TAIL.length);
  let offset = 0;
  bytes.set(INIT, offset);
  offset += INIT.length;
  for (const p of bodyParts) {
    bytes.set(p, offset);
    offset += p.length;
  }
  bytes.set(CUT_TAIL, offset);
  return bytes;
}

export function formatSupplyInvoiceDate(iso: string): string {
  return formatDisplayDate(iso);
}

export function formatSupplyInvoiceMoney(
  amount: number,
  currency: string,
): string {
  return formatMoney(amount, currency.trim().toUpperCase() || "KES");
}
