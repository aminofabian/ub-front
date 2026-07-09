import { formatMoney } from "@/lib/utils";

export type MarketplaceOrderLine = {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  qty: number;
  unitPrice?: number | null;
  currency?: string | null;
};

export type MarketplaceOrderPdfInput = {
  supplierName: string;
  supplierPhone?: string | null;
  location?: string | null;
  listedBy?: string | null;
  lines: MarketplaceOrderLine[];
  note?: string;
};

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Minimal single-page PDF (Helvetica) — no extra dependencies. */
export function buildMarketplaceOrderPdf(input: MarketplaceOrderPdfInput): Blob {
  const lines: string[] = [];
  const push = (text: string) => lines.push(text);

  push("KIOSK MARKETPLACE ORDER");
  push(`Supplier: ${input.supplierName}`);
  if (input.location) push(`Location: ${input.location}`);
  if (input.listedBy) push(`Listed by: ${input.listedBy}`);
  if (input.supplierPhone) push(`WhatsApp: ${input.supplierPhone}`);
  push(`Date: ${new Date().toLocaleString()}`);
  push("");
  push("ITEMS");
  push("----");

  let total = 0;
  let currency = "KES";
  for (const line of input.lines) {
    const price = line.unitPrice ?? 0;
    const lineTotal = price * line.qty;
    if (line.unitPrice != null) total += lineTotal;
    if (line.currency) currency = line.currency;
    const meta = [line.sku, line.barcode].filter(Boolean).join(" · ");
    push(`${line.qty} x ${line.name}`);
    if (meta) push(`    ${meta}`);
    push(
      `    ${line.unitPrice != null ? formatMoney(line.unitPrice, currency) : "Ask"} each` +
        (line.unitPrice != null
          ? `  =  ${formatMoney(lineTotal, currency)}`
          : ""),
    );
    push("");
  }
  push("----");
  push(`Estimated total: ${formatMoney(total, currency)}`);
  if (input.note) {
    push("");
    push(`Note: ${input.note}`);
  }
  push("");
  push("Please confirm availability and delivery.");

  const contentStream = buildTextStream(lines);
  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
  );
  objects.push(
    `4 0 obj<< /Length ${contentStream.length} >>stream\n${contentStream}\nendstream\nendobj\n`,
  );
  objects.push(
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function buildTextStream(lines: string[]): string {
  const ops: string[] = ["BT", "/F1 11 Tf", "50 800 Td", "14 TL"];
  lines.forEach((line, index) => {
    const safe = escapePdfText(line.slice(0, 96));
    if (index === 0) {
      ops.push(`(${safe}) Tj`);
    } else {
      ops.push(`T* (${safe}) Tj`);
    }
  });
  ops.push("ET");
  return ops.join("\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Normalize phone for wa.me (digits only, Kenya 07… → 2547…). */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0") && digits.length >= 9) {
    digits = `254${digits.slice(1)}`;
  }
  if (digits.length < 9) return null;
  return digits;
}

export function buildWhatsAppOrderUrl(opts: {
  phone: string | null | undefined;
  supplierName: string;
  lines: MarketplaceOrderLine[];
  filename: string;
}): string | null {
  const phone = normalizeWhatsAppPhone(opts.phone);
  if (!phone) return null;
  const itemLines = opts.lines
    .map((l) => `• ${l.qty} x ${l.name}`)
    .join("\n");
  const text =
    `Hello ${opts.supplierName},\n\n` +
    `Please find my order request (PDF: ${opts.filename}):\n\n` +
    `${itemLines}\n\n` +
    `I have downloaded the PDF order sheet — please confirm availability.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export async function shareOrDownloadOrderPdf(
  blob: Blob,
  filename: string,
  whatsappUrl: string | null,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: "Marketplace order",
        text: "Order request from Kiosk marketplace",
      });
      return "shared";
    } catch {
      // fall through to download
    }
  }
  downloadBlob(blob, filename);
  if (whatsappUrl) {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }
  return "downloaded";
}
