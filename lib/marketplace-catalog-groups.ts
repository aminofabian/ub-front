import type { MarketplaceCatalogProductPreview } from "@/lib/marketplace-api";

export type CatalogProductGroup = {
  id: string;
  label: string;
  thumbnailUrl: string | null;
  items: MarketplaceCatalogProductPreview[];
};

const SIZE_RANK: { match: RegExp; rank: number }[] = [
  { match: /\bextra\s*small\b|\bxs\b/, rank: 0 },
  { match: /\bsmall\b|\bsml\b/, rank: 1 },
  { match: /\bmedium\b|\bmed\b/, rank: 2 },
  { match: /\blarge\b|\blrg\b/, rank: 3 },
  { match: /\bextra\s*large\b|\bxl\b/, rank: 4 },
  { match: /\bwhole\b/, rank: 5 },
  { match: /\bbunch\b/, rank: 6 },
  { match: /\bpair\b/, rank: 7 },
  { match: /\bpiece\b|\bpc\b/, rank: 8 },
  { match: /\bpack\b/, rank: 9 },
  { match: /\bkg\b/, rank: 10 },
];

export function normalizeCatalogLabel(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function isCatalogVariant(product: MarketplaceCatalogProductPreview): boolean {
  if (product.variantOfItemId?.trim()) return true;
  if (product.parentItemName?.trim()) return true;
  return (product.name?.trim() || "").includes(" · ");
}

/** Family folder the product belongs to — parent name, then "Name · pack", then the SKU name. */
export function catalogFamilyLabel(product: MarketplaceCatalogProductPreview): string {
  const parent = product.parentItemName?.trim();
  if (parent) return parent;
  const name = product.name?.trim() || product.sku?.trim() || "Product";
  const sep = name.indexOf(" · ");
  return sep > 0 ? name.slice(0, sep) : name;
}

export function catalogFamilyId(product: MarketplaceCatalogProductPreview): string {
  return `name:${normalizeCatalogLabel(catalogFamilyLabel(product))}`;
}

export function catalogFamilyAnchor(id: string): string {
  return `catalog-family-${id.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`;
}

/** Wholesale carton: units inside one supplier pack. Hidden when size is 1 or missing. */
export function catalogWholesalePack(
  product: Pick<MarketplaceCatalogProductPreview, "packSize" | "packUnit">,
): { size: number; unit: string } | null {
  const size = Number(product.packSize);
  if (!Number.isFinite(size) || size <= 1) return null;
  const unit = (product.packUnit ?? "pcs").trim() || "pcs";
  return { size, unit };
}

export function catalogEachFromPack(
  product: Pick<
    MarketplaceCatalogProductPreview,
    "packSize" | "unitPrice"
  >,
): number | null {
  const pack = catalogWholesalePack(product);
  const price = product.unitPrice;
  if (!pack || price == null || !Number.isFinite(price) || pack.size <= 0) {
    return null;
  }
  return Math.round((price / pack.size) * 100) / 100;
}

/** Pack / size line shown under a family heading. "Avocado Medium" → "Medium". */
export function catalogPackLabel(
  product: MarketplaceCatalogProductPreview,
  familyLabel: string,
): string {
  const name = (product.name?.trim() || product.sku?.trim() || "Product").replace(
    /\s+/g,
    " ",
  );
  const family = familyLabel.trim();
  if (family) {
    const lower = name.toLowerCase();
    const fam = family.toLowerCase();
    if (lower.startsWith(fam)) {
      const next = name.slice(family.length);
      if (next === "" || /^[\s\-–·:]/.test(next)) {
        const rest = next.replace(/^[\s\-–·:]+/, "").trim();
        if (rest) return rest;
      }
    }
  }
  const sep = name.indexOf(" · ");
  if (sep > 0) {
    const rest = name.slice(sep + 3).trim();
    if (rest) return rest;
  }
  return name;
}

function sizeRank(label: string): number {
  const n = label.toLowerCase();
  for (const row of SIZE_RANK) {
    if (row.match.test(n)) return row.rank;
  }
  return 40;
}

export function compareCatalogProducts(
  a: MarketplaceCatalogProductPreview,
  b: MarketplaceCatalogProductPreview,
  familyLabel: string,
): number {
  const aLabel = catalogPackLabel(a, familyLabel);
  const bLabel = catalogPackLabel(b, familyLabel);
  const size = sizeRank(aLabel) - sizeRank(bLabel);
  if (size !== 0) return size;
  const named = aLabel.localeCompare(bLabel, "en", { sensitivity: "base", numeric: true });
  if (named !== 0) return named;
  const aPrice = a.unitPrice;
  const bPrice = b.unitPrice;
  if (aPrice != null && bPrice != null && aPrice !== bPrice) return aPrice - bPrice;
  return a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true });
}

function familyThumbnail(
  product: MarketplaceCatalogProductPreview,
): string | null {
  const parent = product.parentImageUrl?.trim();
  if (parent) return parent;
  if (!isCatalogVariant(product)) {
    return product.imageUrl?.trim() || null;
  }
  return product.imageUrl?.trim() || null;
}

export function groupCatalogProducts(
  products: readonly MarketplaceCatalogProductPreview[],
): CatalogProductGroup[] {
  const groups = new Map<string, CatalogProductGroup>();

  for (const product of products) {
    const id = catalogFamilyId(product);
    const existing = groups.get(id);
    const thumb = familyThumbnail(product);
    if (!existing) {
      groups.set(id, {
        id,
        label: catalogFamilyLabel(product),
        thumbnailUrl: thumb,
        items: [product],
      });
      continue;
    }
    existing.items.push(product);
    if (!existing.thumbnailUrl && thumb) existing.thumbnailUrl = thumb;
    if (!isCatalogVariant(product)) {
      existing.label = catalogFamilyLabel(product);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) =>
        compareCatalogProducts(a, b, group.label),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));
}

export function catalogFamilyLetters(groups: readonly CatalogProductGroup[]): string[] {
  const letters = new Set<string>();
  for (const group of groups) {
    const ch = group.label.trim().charAt(0).toUpperCase();
    if (ch >= "A" && ch <= "Z") letters.add(ch);
  }
  return [...letters].sort();
}

export function firstFamilyForLetter(
  groups: readonly CatalogProductGroup[],
  letter: string,
): CatalogProductGroup | undefined {
  const needle = letter.trim().toUpperCase();
  return groups.find((g) => g.label.trim().charAt(0).toUpperCase() === needle);
}
