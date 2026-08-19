// Verify the order PDF + WhatsApp message builders still work after the
// Latin-1 encoding change.
import { writeFileSync } from "node:fs";
import {
  buildMarketplaceOrderPdf,
  buildMarketplaceOrderText,
  buildWhatsAppOrderUrl,
  normalizeWhatsAppPhone,
} from "../app/marketplace/_lib/marketplace-order-pdf";

const lines = [
  { name: "Golden Maize Flour · 2kg", sku: "SKU-001", barcode: "8901123", qty: 4, unitPrice: 210, currency: "KES" },
  { name: "Sunflower Oil — 5L", sku: null, barcode: null, qty: 2, unitPrice: 1450, currency: "KES" },
  { name: "Cashew Nuts (roasted)", sku: "CSW-9", barcode: null, qty: 1, unitPrice: 380, currency: "KES" },
];

const failures: string[] = [];

// --- WhatsApp URL ---
const wa = buildWhatsAppOrderUrl({
  phone: "0722 555 000",
  supplierName: "Robinson Wholesalers",
  lines,
  filename: "order-robinson.pdf",
  catalogueUrl: "https://kiosk.ke/s/robinson",
});
if (!wa) failures.push("WhatsApp URL should exist");
else {
  if (!wa.startsWith("https://wa.me/254722555000?text=")) {
    failures.push(`bad wa.me prefix: ${wa.slice(0, 50)}`);
  }
  const decoded = decodeURIComponent(wa.split("?text=")[1]);
  if (!decoded.includes("Hello Robinson Wholesalers 👋")) failures.push("missing greeting");
  if (!decoded.includes("I'd like to place the following order:")) failures.push("missing intro");
  if (!decoded.includes("ORDER DETAILS")) failures.push("missing ORDER DETAILS");
  if (!decoded.includes("Golden Maize Flour · 2kg × 4 @ Ksh 210.00 → Ksh 840.00")) {
    failures.push("missing item line");
  }
  if (!decoded.includes("TOTAL: Ksh 4120.00")) failures.push("missing total");
  if (!decoded.includes("3 items · 7 units")) failures.push("missing item/unit summary");
  if (!decoded.includes("📄 Order PDF: order-robinson.pdf")) failures.push("missing order pdf line");
  if (!decoded.includes("📋 Catalogue: https://kiosk.ke/s/robinson")) failures.push("missing catalogue link");
  if (!decoded.includes("Thank you! 🙏")) failures.push("missing thanks");
  console.log("whatsapp message:\n---\n" + decoded + "\n---");
}

// --- Plain text (clipboard) ---
const text = buildMarketplaceOrderText(lines, {
  supplierName: "Robinson Wholesalers",
  catalogueUrl: "https://kiosk.ke/s/robinson",
});
if (!text.includes("Golden Maize Flour · 2kg × 4 @ Ksh 210.00 → Ksh 840.00")) {
  failures.push("text line format wrong");
}

// --- Order PDF ---
const blob = buildMarketplaceOrderPdf({
  supplierName: "Robinson Wholesalers",
  supplierPhone: "0722 555 000",
  location: "Gikomba, Nairobi",
  lines,
});
const bytes = new Uint8Array(await blob.arrayBuffer());
const pdf = new TextDecoder("windows-1252").decode(bytes);
if (!pdf.startsWith("%PDF-1.4")) failures.push("order pdf missing header");
// "·" must be a single WinAnsi byte 0xB7, not UTF-8 (0xC2 0xB7)
const b7 = (pdf.match(/\u00b7/g) ?? []).length;
const c2b7 = (pdf.match(/\u00c2\u00b7/g) ?? []).length;
if (b7 < 2) failures.push(`expected · bytes in order pdf, got ${b7}`);
if (c2b7 > 0) failures.push("order pdf still has UTF-8 double-byte ·");
writeFileSync("/tmp/order-smoke.pdf", Buffer.from(bytes));

if (normalizeWhatsAppPhone("+254 722 555 000") !== "254722555000") failures.push("phone normalize failed");

if (failures.length) {
  console.error("FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS — order pdf + whatsapp builders OK");
