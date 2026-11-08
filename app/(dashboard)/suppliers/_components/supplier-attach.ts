import type { MarketplaceAttachResult } from "@/lib/marketplace-api";

/**
 * A product on a global supplier's shelf, as the "add supplier" step lists it.
 * The shop-side flags are only known for global suppliers; another shop's
 * supplier is previewed from its public listing, which cannot say them.
 */
export type AttachPickerProduct = {
  id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  categoryName: string | null;
  packSize: number | null;
  packUnit: string | null;
  unitPrice: number | null;
  currency: string | null;
  /** The shop already stocks this barcode, so adding links it instead of creating an item. */
  inShop?: boolean;
  /** Already linked to the shop's copy of this supplier. */
  alreadyLinked?: boolean;
};

export type AttachMode = "all" | "choose";

export function plural(count: number, singular: string, many?: string): string {
  return count === 1 ? singular : (many ?? `${singular}s`);
}

/** Products that adding would still change (everything not already linked). */
export function addableProducts(
  products: AttachPickerProduct[],
): AttachPickerProduct[] {
  return products.filter((p) => !p.alreadyLinked);
}

/** Every word typed must appear in the name, barcode, SKU or category. */
export function filterAttachProducts(
  products: AttachPickerProduct[],
  query: string,
): AttachPickerProduct[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return products;
  return products.filter((p) => {
    const haystack = [p.name, p.barcode, p.sku, p.categoryName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

export type AttachCta = { label: string; disabled: boolean };

/** The confirm button for the current choice. */
export function attachCta(opts: {
  mode: AttachMode;
  selectedCount: number;
  addableCount: number;
  alreadyConnected: boolean;
  busy: boolean;
}): AttachCta {
  const { mode, selectedCount, addableCount, alreadyConnected, busy } = opts;
  if (busy) return { label: "Adding…", disabled: true };

  const count = mode === "all" ? addableCount : selectedCount;
  const noun = plural(count, "product");

  if (alreadyConnected) {
    if (count === 0) {
      return {
        label: mode === "all" ? "Nothing new to add" : "Choose products to add",
        disabled: true,
      };
    }
    return { label: `Add ${count} ${noun}`, disabled: false };
  }
  if (count === 0) {
    return {
      label: mode === "all" ? "Add supplier" : "Add supplier only",
      disabled: false,
    };
  }
  return { label: `Add supplier and ${count} ${noun}`, disabled: false };
}

export type AttachSummary = {
  title: string;
  description: string | undefined;
  tone: "success" | "warning";
};

/**
 * Toast wording for a finished attach. `requested` is how many products the
 * user ticked, or null when they added the whole shelf.
 */
export function describeAttachResult(
  result: MarketplaceAttachResult,
  requested: number | null,
): AttachSummary {
  const linked = result.linkedExisting + result.createdItems;
  const parts: string[] = [];
  if (linked > 0) {
    parts.push(`${linked} ${plural(linked, "product")} linked`);
  }
  if (result.createdItems > 0) {
    parts.push(
      `${result.createdItems} new ${plural(result.createdItems, "item")} created`,
    );
  }
  // Only when nothing new landed: a first attach from another shop's supplier
  // counts the same link twice on the server, which would read as noise here.
  if (result.alreadyLinked > 0 && linked === 0) {
    parts.push(`${result.alreadyLinked} already linked`);
  }
  if (result.skipped > 0) {
    parts.push(`${result.skipped} could not be added`);
  }
  if (parts.length === 0) {
    parts.push("No products linked");
  }

  const nothingLanded =
    linked === 0 && result.skipped > 0 && (requested === null || requested > 0);

  return {
    title: `${result.supplierName} added`,
    description: parts.join(" · "),
    tone: nothingLanded ? "warning" : "success",
  };
}
