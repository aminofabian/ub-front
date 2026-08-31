export type SearchableSelectOption = {
  value: string;
  label: string;
  hint?: string;
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
