/** Lowercase alphanumerics only — so F-11301 and f11301 compare equal. */
export function compactSearchKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Match a typed query against catalog-ish fields. Prefers a plain substring,
 * then a compact manufacturer-code match (SKU / barcode / supplier code).
 */
export function textMatchesQuery(
  query: string,
  ...fields: Array<string | number | null | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const compactQ = compactSearchKey(q);
  return fields.some((field) => {
    if (field == null || field === "") {
      return false;
    }
    const raw = String(field).toLowerCase();
    if (raw.includes(q)) {
      return true;
    }
    return compactQ.length >= 3 && compactSearchKey(raw).includes(compactQ);
  });
}
