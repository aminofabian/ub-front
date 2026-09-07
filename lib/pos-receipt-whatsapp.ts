import {
  formatReceiptDate,
  formatReceiptMoney,
  type PosReceiptSnapshot,
} from "@/lib/pos-receipt";
import { normalizeWhatsApp } from "@/lib/whatsapp-order";

const RULE = "────────────────────";

function qtyLabel(qty: number): string {
  if (!Number.isFinite(qty)) return "1";
  const rounded = Math.round(qty * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function lineMoney(amount: number, currency: string): string {
  return formatReceiptMoney(amount, currency);
}

/**
 * A presentable digital receipt formatted for WhatsApp
 * (*bold* / _italic_ markup WhatsApp understands).
 */
export function buildWhatsAppReceiptMessage(
  receipt: PosReceiptSnapshot,
): string {
  const shop = receipt.businessName.trim() || "Store";
  const branch = receipt.branchName.trim();
  const heading =
    receipt.receiptNo != null
      ? `Receipt #${receipt.receiptNo}`
      : `Sale ${receipt.saleId.slice(0, 8).toUpperCase()}`;

  const lines: string[] = [];
  lines.push(`*${shop}*`);
  if (branch && branch.toLowerCase() !== shop.toLowerCase()) {
    lines.push(`_${branch}_`);
  }
  lines.push("");
  lines.push(RULE);
  lines.push(heading);
  lines.push(formatReceiptDate(receipt.soldAt));
  if (receipt.servedByName?.trim()) {
    lines.push(`Cashier · ${receipt.servedByName.trim()}`);
  }
  if (receipt.customerName?.trim()) {
    lines.push(`For · ${receipt.customerName.trim()}`);
  }
  if (receipt.voided) {
    lines.push("*VOIDED*");
  }
  lines.push(RULE);
  lines.push("*Your items*");
  lines.push("");

  for (const line of receipt.lines) {
    const name = line.description.trim() || "Item";
    lines.push(`${name}  ×${qtyLabel(line.quantity)}`);
    lines.push(`   ${lineMoney(line.lineTotal, receipt.currency)}`);
  }

  lines.push("");
  lines.push(RULE);

  const paid =
    receipt.payments.length === 1
      ? receipt.payments[0]?.label
      : receipt.payments
          .map((p) =>
            p.reference ? `${p.label} (${p.reference})` : p.label,
          )
          .join(" + ");
  if (paid) {
    lines.push(`Paid with ${paid}`);
  }
  lines.push(`*TOTAL*  ${lineMoney(receipt.grandTotal, receipt.currency)}`);

  if (receipt.cashReceived != null) {
    lines.push(
      `Received  ${lineMoney(receipt.cashReceived, receipt.currency)}`,
    );
    if (receipt.walletCredited != null && receipt.walletCredited > 0) {
      lines.push(
        `To wallet  ${lineMoney(receipt.walletCredited, receipt.currency)}`,
      );
    } else {
      lines.push(
        `Change  ${lineMoney(receipt.changeGiven ?? 0, receipt.currency)}`,
      );
    }
  } else if (receipt.walletCredited != null && receipt.walletCredited > 0) {
    lines.push(
      `To wallet  ${lineMoney(receipt.walletCredited, receipt.currency)}`,
    );
  }

  const contact: string[] = [];
  if (receipt.branchAddress?.trim()) contact.push(receipt.branchAddress.trim());
  if (receipt.branchPhone?.trim()) contact.push(`Tel ${receipt.branchPhone.trim()}`);
  if (receipt.tillNumber?.trim()) {
    contact.push(`M-Pesa Till ${receipt.tillNumber.trim()}`);
  }
  if (receipt.branchEmail?.trim()) contact.push(receipt.branchEmail.trim());
  if (receipt.branchWebsite?.trim()) contact.push(receipt.branchWebsite.trim());

  if (contact.length > 0) {
    lines.push(RULE);
    for (const row of contact) lines.push(row);
  }

  const closing = receipt.branchReceiptMessage?.trim() || "Thank you for shopping with us";
  lines.push("");
  lines.push(`_${closing}_`);

  return lines.join("\n");
}

export function buildWhatsAppReceiptUrl(opts: {
  phone?: string | null;
  message: string;
}): string {
  const digits = normalizeWhatsApp(opts.phone);
  const text = encodeURIComponent(opts.message);
  if (digits) {
    return `https://wa.me/${digits}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

export async function openWhatsAppReceipt(opts: {
  phone?: string | null;
  receipt: PosReceiptSnapshot;
  /** Optional PDF blob to attach via the Web Share API when the OS supports it. */
  pdfBlob?: Blob | null;
  pdfFileName?: string;
}): Promise<"shared" | "opened" | "copied"> {
  const message = buildWhatsAppReceiptMessage(opts.receipt);
  const url = buildWhatsAppReceiptUrl({ phone: opts.phone, message });

  const fileName =
    opts.pdfFileName?.trim() ||
    `receipt-${opts.receipt.receiptNo ?? opts.receipt.saleId.slice(0, 8)}.pdf`;

  if (
    opts.pdfBlob &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    try {
      const file = new File([opts.pdfBlob], fileName, {
        type: "application/pdf",
      });
      const shareData: ShareData = {
        files: [file],
        text: message,
        title: `${opts.receipt.businessName} receipt`,
      };
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return "shared";
      }
    } catch (err) {
      // User cancel or share unsupported — fall through to wa.me.
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
    }
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    try {
      await navigator.clipboard.writeText(message);
      return "copied";
    } catch {
      window.location.href = url;
      return "opened";
    }
  }
  return "opened";
}
