import { buildMarketplaceCatalogueHtml } from "../app/marketplace/_lib/marketplace-catalogue-html";
import type { MarketplaceSupplierDetail } from "../lib/marketplace-api";

const products = [
  {
    id: "a1",
    name: "Apple · Green",
    slug: "apple-green",
    barcode: null,
    sku: null,
    categoryName: "Fruit",
    imageUrl: null,
    packSize: null,
    packUnit: null,
    minOrderQty: null,
    unitPrice: 25,
    currency: "KES",
    available: true,
    itemId: "apple",
    variantOfItemId: null,
    parentItemName: "Apple",
    parentImageUrl: null,
  },
  {
    id: "a2",
    name: "Apple · Pink",
    slug: "apple-pink",
    barcode: null,
    sku: null,
    categoryName: "Fruit",
    imageUrl: null,
    packSize: null,
    packUnit: null,
    minOrderQty: null,
    unitPrice: 25,
    currency: "KES",
    available: true,
    itemId: "apple-pink",
    variantOfItemId: "apple",
    parentItemName: "Apple",
    parentImageUrl: null,
  },
  {
    id: "b1",
    name: "Broccoli",
    slug: "broccoli",
    barcode: null,
    sku: null,
    categoryName: "Veg",
    imageUrl: null,
    packSize: null,
    packUnit: null,
    minOrderQty: null,
    unitPrice: 50,
    currency: "KES",
    available: true,
    itemId: "broccoli",
    variantOfItemId: null,
    parentItemName: null,
    parentImageUrl: null,
  },
  {
    id: "g1",
    name: "Grapes · 50g",
    slug: "grapes",
    barcode: null,
    sku: null,
    categoryName: "Fruit",
    imageUrl: null,
    packSize: null,
    packUnit: null,
    minOrderQty: null,
    unitPrice: null,
    currency: "KES",
    available: true,
    itemId: "grapes",
    variantOfItemId: null,
    parentItemName: "Grapes",
    parentImageUrl: null,
  },
];

const detail: MarketplaceSupplierDetail = {
  id: "githurai",
  name: "Grocery (Githurai)",
  slug: "grocery-githurai",
  description: null,
  supplierType: null,
  listedBy: "Palmart Fresh Foods & Butchery",
  location: "Mirema",
  locations: ["Githurai"],
  status: "active",
  contactEmail: null,
  contactPhone: "0714282874",
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

const html = buildMarketplaceCatalogueHtml({ detail });
const fs = await import("node:fs");
fs.writeFileSync("/tmp/catalogue-githurai.html", html);

const failures: string[] = [];
if (!html.startsWith("<!DOCTYPE html>")) failures.push("missing doctype");
if (!html.includes("Fraunces")) failures.push("missing Fraunces");
if (!html.includes("Grocery (Githurai)")) failures.push("missing supplier name");
if (!html.includes("0714 282 874")) failures.push("phone not spaced");
if (!html.includes("https://wa.me/254714282874")) failures.push("missing wa.me");
if (!html.includes('"name":"Apple"')) failures.push("missing Apple family");
if (!html.includes('"Green"')) failures.push("missing Green pack");
if (!html.includes("Ask")) failures.push("missing Ask price");
if (html.includes("<script>") && html.includes("</Apple")) failures.push("broken script");
if (html.toLowerCase().includes("<img")) failures.push("unexpected img");

console.log(`bytes=${html.length} apple=${html.includes("Apple")} wa=${html.includes("wa.me")}`);
if (failures.length) {
  console.error("FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS — HTML price list matches the Githurai sheet");
