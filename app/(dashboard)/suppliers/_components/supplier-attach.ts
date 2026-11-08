import type {
  MarketplaceAttachNote,
  MarketplaceAttachResult,
} from "@/lib/marketplace-api";

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
  /** The shop already stocks this (same barcode, or same name), so adding links it instead of creating an item. */
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

/** Products the shop does not stock yet (and has not linked): the ones adding would create. */
export function newProductIds(products: AttachPickerProduct[]): string[] {
  return products
    .filter((p) => p.inShop === false && !p.alreadyLinked)
    .map((p) => p.id);
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
 * user ticked, or null when they added the whole shelf. `topUp` is true when
 * the supplier was already in the directory.
 */
export function describeAttachResult(
  result: MarketplaceAttachResult,
  requested: number | null,
  opts: { topUp?: boolean } = {},
): AttachSummary {
  const linked = result.linkedExisting + result.createdItems;
  const parts: string[] = [];
  if (result.createdItems > 0) {
    parts.push(
      `${result.createdItems} new ${plural(result.createdItems, "item")} created and linked`,
    );
  }
  if (result.linkedExisting > 0) {
    parts.push(
      `${result.linkedExisting} existing ${plural(result.linkedExisting, "item")} linked`,
    );
  }
  if (result.alreadyLinked > 0) {
    parts.push(`${result.alreadyLinked} already linked`);
  }
  if (result.skipped > 0) {
    parts.push(`${result.skipped} not added`);
  }
  if (parts.length === 0) {
    parts.push("No products linked");
  }

  const nothingLanded =
    linked === 0 && result.skipped > 0 && (requested === null || requested > 0);

  return {
    title: `${result.supplierName} ${opts.topUp ? "updated" : "added"}`,
    description: parts.join(" · "),
    tone: nothingLanded ? "warning" : "success",
  };
}

export type AttachReportGroups = {
  /** Already in the shop: linked to the supplier instead of being added again. */
  existing: MarketplaceAttachNote[];
  alreadyLinked: MarketplaceAttachNote[];
  skipped: MarketplaceAttachNote[];
};

/** The server's per-product notes, sorted into the sections the report shows. */
export function groupAttachNotes(
  result: MarketplaceAttachResult,
): AttachReportGroups {
  const groups: AttachReportGroups = {
    existing: [],
    alreadyLinked: [],
    skipped: [],
  };
  for (const note of result.notes ?? []) {
    if (note.outcome === "existing_linked") groups.existing.push(note);
    else if (note.outcome === "already_linked") groups.alreadyLinked.push(note);
    else groups.skipped.push(note);
  }
  return groups;
}

/** Whether something happened that is worth spelling out product by product. */
export function hasAttachReport(result: MarketplaceAttachResult): boolean {
  return (result.notes?.length ?? 0) > 0 || (result.notesOmitted ?? 0) > 0;
}

/** What to call a note's product: its name, else its barcode. */
export function noteLabel(note: MarketplaceAttachNote): string {
  return note.name?.trim() || note.barcode?.trim() || "A product";
}
