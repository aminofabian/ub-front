// Verify text y-coordinates in the generated PDF are upright (not flipped).
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

// Extract each content stream (between ">>stream\n" and "\nendstream")
const streams = [...text.matchAll(/>>stream\n([\s\S]*?)\nendstream\nendobj/g)].map((m) => m[1]);

const failures: string[] = [];

// For a given needle, find the first Tm y-coordinate used right before it
function findTextY(stream: string, needle: string): number | null {
  const idx = stream.indexOf(needle);
  if (idx < 0) return null;
  const before = stream.slice(0, idx);
  const tms = [...before.matchAll(/(\d+(?:\.\d+)?) Tm/g)];
  if (!tms.length) return null;
  const last = tms[tms.length - 1][1];
  return Number(last);
}

// Page 1: masthead at top, price list under the phone, footer at bottom
const page1 = streams[0];
if (!page1) failures.push("missing first content stream");
const titleY = findTextY(page1, "Robinson Wholesalers");
const phoneY = findTextY(page1, "0722 555 000");
const familyY = findTextY(page1, "Golden Maize Flour");
const packY = findTextY(page1, "(0) Tj");
const footerY = findTextY(page1, "Kiosk.ke");
console.log(`page1: title=${titleY} phone=${phoneY} family=${familyY} pack=${packY} footer=${footerY}`);
if (titleY == null || titleY < 780) failures.push(`title should be near top (got ${titleY})`);
if (phoneY == null || phoneY > titleY!) failures.push(`phone should sit under the title (got ${phoneY})`);
if (familyY == null || familyY > phoneY!) failures.push(`price list should sit under the phone (got ${familyY})`);
if (packY == null || packY >= familyY!) failures.push(`first pack should be below the family heading (got ${packY})`);
if (footerY == null || footerY > 50) failures.push(`footer should be near bottom (got ${footerY})`);

if (failures.length) {
  console.error("FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS — layout coordinates are upright and ordered correctly");
