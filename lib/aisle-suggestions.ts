/** Slug for shelf zone `code` from a display name. */
export function labelToAisleCode(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "zone";
}
