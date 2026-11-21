import { sharedSuggestionOwnership } from "./shared-suggestion-ownership";

/** One row in the add-product match list. `open` is the standalone exact hit. */

export type SuggestionRowPlan =
  | {
      source: "shared";
      catalogId: string;
      inShop: boolean;
      itemId: string | null;
      open: boolean;
    }
  | {
      source: "shop";
      itemId: string;
      open: boolean;
    };

type CatalogHit = {
  id: string;
  name: string;
  barcode?: string | null;
  alreadyImported: boolean;
  adoptedItemId?: string | null;
};

type ShopHit = {
  id: string;
  name: string;
  barcode?: string | null;
};

type Query = {
  name: string;
  barcode: string;
};

type BuiltRow = {
  source: "shared" | "shop";
  catalogId: string | null;
  itemId: string | null;
  name: string;
  barcode: string;
  inShop: boolean;
};

const MIN_NAME_LEN = 2;
const BARCODE_PATTERN = /^\d{6,}$/;
const SIZE_TOKEN =
  /^(?:\d+(?:[.,]\d+)?(?:g|gm|kg|ml|l|cl|mg|oz|pcs|pc)?|g|gm|kg|ml|l|cl|mg|oz|pcs|pc)$/;
const SHORT_TOKEN_LEN = 4;

function matchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function barcodeOf(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function queryBarcode(query: Query): string {
  const barcode = query.barcode.trim();
  if (BARCODE_PATTERN.test(barcode)) return barcode;
  const name = query.name.trim();
  if (BARCODE_PATTERN.test(name)) return name;
  return "";
}

function queryName(query: Query): string {
  const name = query.name.trim();
  if (name.length < MIN_NAME_LEN || BARCODE_PATTERN.test(name)) return "";
  return matchText(name);
}

function nameTokens(value: string): string[] {
  return matchText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 0);
}

function strongNameTokens(queryNameText: string): string[] {
  return nameTokens(queryNameText).filter(
    (token) => token.length >= MIN_NAME_LEN && !SIZE_TOKEN.test(token),
  );
}

function tokenMatchesName(token: string, words: string[], folded: string): boolean {
  if (words.some((word) => word.startsWith(token))) return true;
  return token.length > SHORT_TOKEN_LEN && folded.includes(token);
}

function nameMatchesQuery(candidateName: string, queryNameText: string): boolean {
  const strong = strongNameTokens(queryNameText);
  if (strong.length === 0) return true;
  const words = nameTokens(candidateName);
  const folded = words.join("");
  return strong.every((token) => tokenMatchesName(token, words, folded));
}

function isCovered(item: ShopHit, shared: BuiltRow[]): boolean {
  const barcode = barcodeOf(item.barcode);
  const name = matchText(item.name);
  return shared.some((row) => {
    if (row.itemId === item.id) return true;
    if (barcode && row.barcode === barcode) return true;
    return name.length >= MIN_NAME_LEN && matchText(row.name) === name;
  });
}

function buildRows(catalog: CatalogHit[], shop: ShopHit[]): BuiltRow[] {
  const shared = catalog.map((product) => {
    const ownership = sharedSuggestionOwnership(product, shop);
    return {
      source: "shared" as const,
      catalogId: product.id,
      itemId: ownership.itemId,
      name: product.name,
      barcode: barcodeOf(product.barcode),
      inShop: ownership.inShop,
    };
  });
  const shopOnly = shop
    .filter((item) => !isCovered(item, shared))
    .map((item) => ({
      source: "shop" as const,
      catalogId: null,
      itemId: item.id,
      name: item.name,
      barcode: barcodeOf(item.barcode),
      inShop: true,
    }));
  return [...shopOnly, ...shared];
}

function toPlan(row: BuiltRow, open: boolean): SuggestionRowPlan {
  const canOpen = open && row.inShop && Boolean(row.itemId);
  if (row.source === "shop" && row.itemId) {
    return { source: "shop", itemId: row.itemId, open: canOpen };
  }
  return {
    source: "shared",
    catalogId: row.catalogId ?? "",
    inShop: row.inShop,
    itemId: row.itemId,
    open: canOpen,
  };
}

function exactBarcodeRow(rows: BuiltRow[], shop: ShopHit[], code: string): BuiltRow | null {
  const listed = rows.find((row) => row.barcode === code);
  if (listed) return listed;
  const owned = shop.find((item) => barcodeOf(item.barcode) === code);
  if (!owned) return null;
  const linked = rows.find((row) => row.itemId === owned.id);
  if (linked) return linked;
  return {
    source: "shop",
    catalogId: null,
    itemId: owned.id,
    name: owned.name,
    barcode: code,
    inShop: true,
  };
}

function standaloneRow(rows: BuiltRow[], shop: ShopHit[], query: Query): BuiltRow | null {
  const code = queryBarcode(query);
  if (code) {
    const exact = exactBarcodeRow(rows, shop, code);
    if (exact) return exact;
  }
  const name = queryName(query);
  if (name) {
    const owned = rows.find(
      (row) => row.inShop && Boolean(row.itemId) && matchText(row.name) === name,
    );
    if (owned) return owned;
  }
  if (rows.length === 1 && rows[0].inShop && rows[0].itemId) return rows[0];
  return null;
}

export function planSuggestionRows(
  query: Query,
  catalog: CatalogHit[],
  shop: ShopHit[],
): SuggestionRowPlan[] {
  const typedName = queryName(query);
  const rows = buildRows(catalog, shop).filter(
    (row) => !typedName || nameMatchesQuery(row.name, typedName),
  );
  if (rows.length === 0) return [];
  const exact = standaloneRow(rows, shop, query);
  if (exact) return [toPlan(exact, true)];
  return rows.map((row) => toPlan(row, false));
}
