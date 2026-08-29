/** Display-only helpers for the synthetic SYS-UNASSIGNED supplier bucket. */

export const SYSTEM_UNASSIGNED_SUPPLIER_CODE = "SYS-UNASSIGNED";

/** Merchant-facing label — never persisted; backend keeps "Unassigned (migrate)". */
export const UNLINKED_SUPPLIER_DISPLAY_LABEL = "Suppliers Not Linked";

const LEGACY_UNASSIGNED_NAMES = new Set([
  "unassigned (migrate)",
  "unassigned",
]);

export function isSystemUnassignedSupplier(input: {
  code?: string | null;
  name?: string | null;
}): boolean {
  const code = input.code?.trim();
  if (code === SYSTEM_UNASSIGNED_SUPPLIER_CODE) return true;
  const name = input.name?.trim().toLowerCase();
  return !!name && LEGACY_UNASSIGNED_NAMES.has(name);
}

/** Plain-text supplier name for labels, toasts, PDFs, and aria strings. */
export function displaySupplierName(input: {
  name?: string | null;
  code?: string | null;
  fallback?: string;
}): string {
  if (isSystemUnassignedSupplier(input)) {
    return UNLINKED_SUPPLIER_DISPLAY_LABEL;
  }
  const trimmed = input.name?.trim();
  if (trimmed) return trimmed;
  return input.fallback?.trim() || "Supplier";
}

/** Drop synthetic placeholder links from merchant-facing supplier lists. */
export function isRealSupplierLink(input: {
  supplierName?: string | null;
  supplierCode?: string | null;
}): boolean {
  return !isSystemUnassignedSupplier({
    name: input.supplierName,
    code: input.supplierCode,
  });
}
