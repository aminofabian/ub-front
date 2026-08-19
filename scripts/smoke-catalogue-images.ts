// Catalogue PDF is a text price list — product JPEGs are not embedded.
import { readFile } from "node:fs/promises";
import { buildMarketplaceCataloguePdf } from "../app/marketplace/_lib/marketplace-catalogue-pdf";
import type { MarketplaceSupplierDetail } from "../lib/marketplace-api";

const jpeg = await readFile(
  new URL("../public/pos-placeholders/cashew-nuts.jpg", import.meta.url),
);
const jpegUrl = "https://cdn.example.com/cashew-nuts.jpg";

(globalThis as { fetch?: unknown }).fetch = async (url: string | URL) => {
  if (String(url) === jpegUrl) {
    return new Response(new Uint8Array(jpeg), { status: 200 });
  }
  return new Response(null, { status: 404 });
};

const products = Array.from({ length: 9 }, (_, i) => ({
  id: `p-${i}`,
  name: i % 3 === 0 ? `Premium Cashews · ${i}` : `Rice Pack ${i}`,
  slug: `product-${i}`,
  barcode: null,
  sku: i % 3 === 0 ? `CSW-${i}` : null,
  categoryName: "Snacks & Grains",
  imageUrl: i % 3 === 0 ? jpegUrl : null,
  packSize: i % 2 === 0 ? 10 : null,
  packUnit: i % 2 === 0 ? "kg" : null,
  minOrderQty: null,
  unitPrice: 200 + i,
  currency: "KES",
  available: true,
  itemId: `item-${i}`,
  variantOfItemId: null,
  parentItemName: null,
  parentImageUrl: null,
}));

const detail: MarketplaceSupplierDetail = {
  id: "supplier-img",
  name: "Chipo Nuts & Grains",
  slug: null,
  description: null,
  supplierType: null,
  listedBy: null,
  location: "Nairobi",
  locations: [],
  status: "active",
  contactEmail: null,
  contactPhone: null,
  contacts: [],
  paymentMethodPreferred: null,
  paymentDetails: null,
  payoutType: null,
  payoutPhone: null,
  creditTermsDays: null,
  deliveryRegions: [],
  categoryTags: [],
  products: products as MarketplaceSupplierDetail["products"],
};

const blob = await buildMarketplaceCataloguePdf({ detail, origin: "https://kiosk.ke" });
const bytes = new Uint8Array(await blob.arrayBuffer());
const text = new TextDecoder("windows-1252").decode(bytes);

const fs = await import("node:fs");
fs.writeFileSync("/tmp/catalogue-with-images.pdf", Buffer.from(bytes));

const failures: string[] = [];
const imageObjects = (text.match(/\/Subtype \/Image /g) ?? []).length;
if (imageObjects !== 0) failures.push(`expected 0 embedded images, got ${imageObjects}`);

if (!text.includes("Premium Cashews")) {
  failures.push("missing cashew family on the price list");
}
if (!text.includes("Rice Pack")) failures.push("missing rice packs on the price list");

const xrefMatch = text.match(/xref\n0 (\d+)\n/);
if (!xrefMatch) failures.push("missing xref");
else {
  const count = Number(xrefMatch[1]);
  const lines = text.slice(text.indexOf(xrefMatch[0]) + xrefMatch[0].length).split("\n");
  const lastOffset = Number(lines[count - 1].slice(0, 10));
  const lastObjId = count - 1;
  if (!text.slice(lastOffset, lastOffset + 20).startsWith(`${lastObjId} 0 obj`)) {
    failures.push(`last xref offset mismatch for obj ${lastObjId}`);
  }
}

console.log(`images=${imageObjects} bytes=${bytes.length}`);
if (failures.length) {
  console.error("FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS — catalogue PDF is a text price list (no product images)");
