/**
 * Local POS fallbacks for well-known catalog gaps where the tenant never
 * uploaded a product photo. Prefer real catalog thumbnails when present.
 */
const NAME_FALLBACKS: Array<{ match: RegExp; src: string }> = [
  { match: /\bcashews?\b/i, src: "/pos-placeholders/cashew-nuts.jpg" },
];

export function posTileFallbackThumb(
  name: string | null | undefined,
): string | null {
  const t = name?.trim();
  if (!t) return null;
  for (const row of NAME_FALLBACKS) {
    if (row.match.test(t)) return row.src;
  }
  return null;
}

export function posTileThumbUrl(
  name: string | null | undefined,
  thumbnailUrl: string | null | undefined,
): string | null {
  const primary = thumbnailUrl?.trim();
  if (primary) return primary;
  return posTileFallbackThumb(name);
}
