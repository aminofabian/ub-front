/**
 * Markup on cost. 25 means the selling price is 125% of the buying price,
 * so the buying price is the selling price divided by 1.25.
 */
export function parseMarkupPct(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function buyingPriceFromSelling(
  sellingRaw: string,
  markupPct: number | null | undefined,
): string {
  if (markupPct == null || !Number.isFinite(markupPct) || markupPct < 0) return "";
  const sell = Number(sellingRaw);
  if (!Number.isFinite(sell) || sell <= 0) return "";
  const cost = sell / (1 + markupPct / 100);
  return String(Math.round(cost * 100) / 100);
}

export function buyingFollowsShare(
  buyingRaw: string,
  sellingRaw: string,
  markupPct: number | null | undefined,
): boolean {
  if (!buyingRaw.trim()) return true;
  const derived = buyingPriceFromSelling(sellingRaw, markupPct);
  if (!derived) return false;
  return Number(buyingRaw) === Number(derived);
}

export function shelfShareTarget(
  supplierId: string | null | undefined,
  departmentId: string | null | undefined,
  categoryId: string | null | undefined,
): { kind: "supplier" | "department" | "category"; id: string } | null {
  const supplier = supplierId?.trim() ?? "";
  if (supplier) return { kind: "supplier", id: supplier };
  const category = categoryId?.trim() ?? "";
  if (category) return { kind: "category", id: category };
  const department = departmentId?.trim() ?? "";
  if (department) return { kind: "department", id: department };
  return null;
}

/** Supplier markup wins, then the category, then the department. Blank means no default. */
export function resolveMarkupPct(
  supplierMarkup: number | string | null | undefined,
  departmentMarkup: number | string | null | undefined,
  categoryMarkup: number | string | null | undefined,
): number | null {
  const supplier = parseMarkupPct(supplierMarkup);
  if (supplier != null) return supplier;
  const category = parseMarkupPct(categoryMarkup);
  if (category != null) return category;
  return parseMarkupPct(departmentMarkup);
}
