export type NavSectionLike = {
  id: string;
  items: readonly { href: string }[];
};

/**
 * Picks the nav section that owns the current route. When multiple sections
 * share the same href (e.g. Home and Organization both list `/business`),
 * prefer the section with more items so setup links (Users, Settings, …)
 * surface instead of the single-item Home stub.
 */
export function resolveActiveNavSectionId<T extends NavSectionLike>(
  sections: readonly T[],
  pathname: string,
  itemIsActive: (pathname: string, href: string) => boolean,
): string | null {
  const matching = sections.filter((section) =>
    section.items.some((item) => itemIsActive(pathname, item.href)),
  );
  if (matching.length === 0) {
    return null;
  }
  if (matching.length === 1) {
    return matching[0].id;
  }

  return matching.reduce((best, section) =>
    section.items.length > best.items.length ? section : best,
  ).id;
}
