export type SearchableSelectOption = {
  value: string;
  label: string;
  hint?: string;
  /** Matched by search only — e.g. barcode — not shown in the trigger. */
  search?: string;
};

/** True when the typed name is not already an option (exact, case-insensitive). */
export function shouldOfferCreate(
  query: string,
  options: Pick<SearchableSelectOption, "label">[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return !options.some((o) => o.label.trim().toLowerCase() === q);
}

export function matchesSearchableSelectQuery(
  option: Pick<SearchableSelectOption, "label" | "hint" | "search">,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.label.toLowerCase().includes(q) ||
    (option.hint?.toLowerCase().includes(q) ?? false) ||
    (option.search?.toLowerCase().includes(q) ?? false)
  );
}
