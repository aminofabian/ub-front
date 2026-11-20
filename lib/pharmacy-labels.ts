import type { DispensingRecord, SchemeClaim } from "@/lib/pharmacy-api";

/**
 * Dispensing labels: one small label per medicine on a dispensing record, printed from the
 * browser. Built as plain HTML so it prints the same from any till.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function labelDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function trimQty(n: number): string {
  return Number(n).toLocaleString("en-KE", { maximumFractionDigits: 3 });
}

/** The full HTML document for the labels of one record. Every value is escaped. */
export function dispensingLabelsHtml(record: DispensingRecord, shopName: string): string {
  const labels = record.lines
    .map((l) => {
      const rows = [
        `<div class="shop">${escapeHtml(shopName)}</div>`,
        record.patientName ? `<div class="patient">${escapeHtml(record.patientName)}</div>` : "",
        `<div class="drug">${escapeHtml(l.itemName)} <span class="qty">× ${escapeHtml(trimQty(l.quantity))}</span></div>`,
        l.instructions ? `<div class="directions">${escapeHtml(l.instructions)}</div>` : `<div class="directions blank"></div>`,
        `<div class="meta">${escapeHtml(labelDate(record.createdAt))}${
          record.dispensedByName ? ` · ${escapeHtml(record.dispensedByName)}` : ""
        }${l.lotNumbers ? ` · Lot ${escapeHtml(l.lotNumbers)}` : ""}</div>`,
        `<div class="warn">Keep out of the reach of children</div>`,
      ];
      return `<section class="label">${rows.filter(Boolean).join("")}</section>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>
@page { size: 70mm 40mm; margin: 2mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
.label { width: 66mm; min-height: 36mm; padding: 1mm; page-break-after: always; break-after: page; }
.shop { font-size: 8pt; font-weight: bold; border-bottom: 0.3mm solid #000; padding-bottom: 0.5mm; margin-bottom: 1mm; }
.patient { font-size: 9pt; font-weight: bold; }
.drug { font-size: 9pt; margin-top: 0.5mm; }
.qty { white-space: nowrap; }
.directions { font-size: 10pt; font-weight: bold; margin: 1mm 0; }
.directions.blank { min-height: 8mm; border-bottom: 0.2mm dotted #000; }
.meta { font-size: 6.5pt; }
.warn { font-size: 6.5pt; margin-top: 0.5mm; }
</style></head><body>${labels}</body></html>`;
}

/**
 * A one-page claim sheet to send to a medical scheme: who, which member, what was dispensed and
 * how much is claimed. Every value is escaped.
 */
export function claimSheetHtml(claim: SchemeClaim, shopName: string): string {
  const row = (label: string, value: string | null | undefined) =>
    value ? `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>` : "";
  const money = (n: number) =>
    `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const medicines = claim.medicines
    .split(", ")
    .filter(Boolean)
    .map((m) => `<li>${escapeHtml(m)}</li>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Claim</title><style>
@page { size: A4; margin: 18mm; }
body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 11pt; }
h1 { font-size: 16pt; margin: 0 0 2mm; }
h2 { font-size: 11pt; margin: 6mm 0 2mm; }
table { border-collapse: collapse; width: 100%; }
th { text-align: left; width: 45mm; padding: 1.5mm 0; font-weight: normal; color: #444; vertical-align: top; }
td { padding: 1.5mm 0; }
.total td, .total th { border-top: 0.3mm solid #000; font-weight: bold; color: #000; }
.sign { margin-top: 18mm; display: flex; gap: 20mm; }
.sign div { flex: 1; border-top: 0.3mm solid #000; padding-top: 1mm; font-size: 9pt; }
</style></head><body>
<h1>${escapeHtml(shopName)}</h1>
<p>Claim to ${escapeHtml(claim.schemeName ?? "scheme")} · ${escapeHtml(labelDate(claim.createdAt))}</p>
<table>
${row("Member number", claim.memberNo)}
${row("Authorisation code", claim.authorisationCode)}
${row("Patient", claim.patientName)}
${row("Prescriber", claim.prescriberName)}
${row("Receipt", claim.receiptNo != null ? `#${claim.receiptNo}` : null)}
</table>
<h2>Dispensed</h2>
<ul>${medicines}</ul>
<table><tr class="total"><th>Amount claimed</th><td>${escapeHtml(money(claim.amountClaimed))}</td></tr></table>
<div class="sign"><div>Dispensed by</div><div>Received by patient</div></div>
</body></html>`;
}

function printHtml(html: string): boolean {
  if (typeof document === "undefined") return false;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.srcdoc = html;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      window.setTimeout(() => frame.remove(), 60_000);
    }
  };
  document.body.appendChild(frame);
  return true;
}

/** Opens the print dialog for a claim sheet. */
export function printClaimSheet(claim: SchemeClaim, shopName: string): boolean {
  return printHtml(claimSheetHtml(claim, shopName));
}

/** Opens the print dialog for a record's labels. Returns false when the browser blocked it. */
export function printDispensingLabels(record: DispensingRecord, shopName: string): boolean {
  if (typeof document === "undefined") return false;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.srcdoc = dispensingLabelsHtml(record, shopName);
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      window.setTimeout(() => frame.remove(), 60_000);
    }
  };
  document.body.appendChild(frame);
  return true;
}
