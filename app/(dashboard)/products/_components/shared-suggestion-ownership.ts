/** Whether a shared-catalog product is already on this shop's shelf. */

export type SharedSuggestionOwnership = {
  inShop: boolean;
  /** Shop product to open, when we know which one. */
  itemId: string | null;
};

type SharedIdentity = {
  name: string;
  barcode?: string | null;
  alreadyImported: boolean;
  adoptedItemId?: string | null;
};

type ShopIdentity = {
  id: string;
  name: string;
  barcode?: string | null;
};

function matchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function sharedSuggestionOwnership(
  product: SharedIdentity,
  shopItems: ShopIdentity[],
): SharedSuggestionOwnership {
  const adoptedId = product.adoptedItemId?.trim() ?? "";
  if (product.alreadyImported && adoptedId) {
    return { inShop: true, itemId: adoptedId };
  }

  const barcode = product.barcode?.trim() ?? "";
  if (barcode) {
    const byBarcode = shopItems.find((item) => (item.barcode ?? "").trim() === barcode);
    if (byBarcode) return { inShop: true, itemId: byBarcode.id };
  }

  const name = matchText(product.name);
  if (name.length >= 2) {
    const byName = shopItems.find((item) => matchText(item.name) === name);
    if (byName) return { inShop: true, itemId: byName.id };
  }

  if (product.alreadyImported) return { inShop: true, itemId: null };
  return { inShop: false, itemId: null };
}
