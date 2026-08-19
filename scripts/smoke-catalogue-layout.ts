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

// Cover page (stream 0): title near top (high y), footer near bottom (low y)
const cover = streams[0];
const titleY = findTextY(cover, "Robinson Wholesalers");
const phoneY = findTextY(cover, "0722 555 000");
const indexY = findTextY(cover, "Golden Maize Flour");
const footerY = findTextY(cover, "Kiosk.ke");
console.log(`cover: title=${titleY} phone=${phoneY} index=${indexY} footer=${footerY}`);
if (titleY == null || titleY < 760) failures.push(`title should be near top (got ${titleY})`);
if (phoneY == null || phoneY > titleY! || phoneY < 640) failures.push(`phone should sit under the title (got ${phoneY})`);
if (indexY == null || indexY > phoneY!) failures.push(`A–Z index should sit under the phone band (got ${indexY})`);
if (footerY == null || footerY > 60) failures.push(`footer should be near bottom (got ${footerY})`);

// Price list (stream 1): column heads, family band, pack row, footer
const prod = streams[1];
const headerY = findTextY(prod, "Price list");
const bandY = findTextY(prod, "GOLDEN MAIZE FLOUR");
const packY = findTextY(prod, "(0) Tj");
const prodFooterY = findTextY(prod, "Page 2 of");
console.log(`prod: header=${headerY} band=${bandY} pack=${packY} footer=${prodFooterY}`);
if (headerY == null || headerY < 770) failures.push(`product header should be near top (got ${headerY})`);
if (bandY == null || bandY >= headerY!) failures.push(`family band should be below header (got ${bandY})`);
if (packY == null || packY >= bandY!) failures.push(`first pack should be below the family band (got ${packY})`);
if (prodFooterY == null || prodFooterY > 60) failures.push(`product footer should be near bottom (got ${prodFooterY})`);

if (failures.length) {
  console.error("FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS — layout coordinates are upright and ordered correctly");
