/**
 * Mirrors backend {@code PublicHostResolverService#nameToSlug} so landing
 * shop-finder previews match the subdomain we will look up.
 */
export function businessNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Accepts a business name, slug, or pasted shop host/URL and returns a
 * lookup query suitable for {@code resolve-by-shop}.
 */
export function normalizeShopLookupQuery(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  let candidate = trimmed;
  if (/^https?:\/\//i.test(candidate)) {
    try {
      candidate = new URL(candidate).hostname;
    } catch {
      /* keep raw */
    }
  }

  const hostOnly = candidate
    .replace(/^www\./i, "")
    .split("/")[0]
    ?.trim()
    .toLowerCase();

  if (hostOnly && hostOnly.includes(".")) {
    const left = hostOnly.split(".")[0]?.trim() ?? "";
    return left || hostOnly;
  }

  return trimmed;
}
