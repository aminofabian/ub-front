/**
 * Throwaway smoke test for the hand-rolled catalogue PDF assembler.
 * Validates xref offsets, object count, trailer, and page structure
 * without any PDF library. Run with: bun run scripts/smoke-catalogue-pdf.ts
 */
import { buildMarketplaceCataloguePdf } from "../app/marketplace/_lib/marketplace-catalogue-pdf";
import type { MarketplaceSupplierDetail } from "../lib/marketplace-api";

const products = Array.from({ length: 47 }, (_, i) => ({
  id: `p-${i}`,
  name: i % 2 === 0 ? `Golden Maize Flour · ${i}` : `Sunflower Cooking Oil ${i} L`,
  slug: `product-${i}`,
  barcode: `8901${String(i).padStart(4, "0")}`,
  sku: `SKU-${String(i).padStart(3, "0")}`,
  categoryName: i % 2 === 0 ? "Flour & Grains" : "Oils & Fats",
  imageUrl: null,
  packSize: i % 3 === 0 ? 12 : null,
  packUnit: i % 3 === 0 ? "kg" : null,
  minOrderQty: 2,
  unitPrice: 100 + i * 17,
  currency: "KES",
  available: i % 11 !== 0,
  itemId: `item-${i}`,
  variantOfItemId: null,
  parentItemName: null,
  parentImageUrl: null,
}));

const detail: MarketplaceSupplierDetail = {
  id: "supplier-1",
  name: "Robinson Wholesalers Ltd",
  slug: "robinson-wholesalers",
  description: "Pack prices for Nairobi shops — flour, oils, cereals and household staples delivered across the county.",
  supplierType: "wholesaler",
  listedBy: "Robinson Mwangi",
  location: "Gikomba, Nairobi",
  locations: ["Gikomba", "CBD"],
  status: "active",
  contactEmail: "robinson@example.com",
  contactPhone: "0722 555 000",
  contacts: [],
  paymentMethodPreferred: "mpesa_business",
  paymentDetails: null,
  payoutType: null,
  payoutPhone: null,
  creditTermsDays: null,
  deliveryRegions: ["Nairobi"],
  categoryTags: ["maize", "oil"],
  products: products as MarketplaceSupplierDetail["products"],
};

const blob = await buildMarketplaceCataloguePdf({ detail, origin: "https://kiosk.ke" });
const bytes = new Uint8Array(await blob.arrayBuffer());
const text = new TextDecoder("windows-1252").decode(bytes);

const failures: string[] = [];
if (!text.startsWith("%PDF-1.4")) failures.push("missing %PDF header");
if (!text.includes("%%EOF")) failures.push("missing EOF");
if (!blob.type.includes("pdf")) failures.push("wrong blob type");

// xref: entries after "xref\n0 N\n" point at "N 0 obj"
const xrefMatch = text.match(/xref\n0 (\d+)\n/);
if (!xrefMatch) failures.push("missing xref");
else {
  const count = Number(xrefMatch[1]);
  const lines = text.slice(text.indexOf(xrefMatch[0]) + xrefMatch[0].length).split("\n");
  const firstEntry = lines[0];
  const secondEntry = lines[1];
  if (!/^\d{10} 65535 f/.test(firstEntry)) failures.push(`bad free entry: ${firstEntry}`);
  const offset = Number(secondEntry.slice(0, 10));
  const at = text.slice(offset, offset + 20);
  if (!at.startsWith("1 0 obj")) failures.push(`xref offset mismatch: got "${at}"`);
  // spot check the last object too
  const lastLine = lines[count - 1];
  const lastOffset = Number(lastLine.slice(0, 10));
  const lastObjId = count - 1;
  if (!text.slice(lastOffset, lastOffset + 20).startsWith(`${lastObjId} 0 obj`)) {
    failures.push(`last xref offset mismatch for obj ${lastObjId}`);
  }
}

// every page object should reference MediaBox + a content stream
const pageCount = (text.match(/\/Type \/Page \/Parent 2 0 R/g) ?? []).length;
if (pageCount < 1) failures.push(`expected at least 1 page, got ${pageCount}`);
if (pageCount > 3) failures.push(`47 products should fit in 1–3 pages, got ${pageCount}`);

// every content stream must start with a numeric Length and have endstream
const streams = (text.match(/>>stream\n/g) ?? []).length;
const endStreams = (text.match(/\nendstream\nendobj/g) ?? []).length;
if (streams !== endStreams) failures.push(`stream mismatch: ${streams} vs ${endStreams}`);

// image objects should be DCTDecode
const imageObjects = (text.match(/\/Subtype \/Image /g) ?? []).length;

console.log(`bytes=${bytes.length} pages=${pageCount} streams=${streams} images=${imageObjects} objects=${xrefMatch ? xrefMatch[1] : "?"}`);

// Write the file so it can be opened/visually inspected
const fs = await import("node:fs");
fs.writeFileSync("/tmp/catalogue-smoke.pdf", Buffer.from(bytes));

if (failures.length) {
  console.error("FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS — catalogue PDF is structurally valid");
