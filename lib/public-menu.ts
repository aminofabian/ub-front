import { apiUrl } from "./config";

/**
 * Client for the menu on a restaurant's public web page (`/api/v1/public/businesses/{slug}/menu`).
 * Nobody is signed in and nothing can be ordered from it. Shapes mirror `docs/openapi/phase-1.yaml`.
 */

export type PublicMenuDish = {
  id: string;
  heading: string | null;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  /** False when it is off for now: sold out, or outside the hours it is served. */
  servedNow: boolean;
};

export type PublicMenu = {
  shopName: string;
  currency: string;
  /** Headings in the menu's own order; only those with a dish under them. */
  headings: string[];
  dishes: PublicMenuDish[];
  branches: { name: string; address: string | null }[];
};

/** Null when the restaurant has not put its menu on its web page (or is not a restaurant). */
export async function fetchPublicMenu(slug: string): Promise<PublicMenu | null> {
  const res = await fetch(apiUrl(`/api/v1/public/businesses/${encodeURIComponent(slug.trim())}/menu`), {
    headers: { Accept: "application/json" },
    // A menu changes a few times a day, not a few times a minute.
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return (await res.json()) as PublicMenu;
}

export type MenuSection = { id: string; title: string | null; dishes: PublicMenuDish[] };

/**
 * The menu as it is printed: one section per heading in the menu's order, then whatever has no
 * heading. A menu with no headings at all is one untitled section.
 */
export function menuSections(menu: Pick<PublicMenu, "headings" | "dishes">): MenuSection[] {
  const sections: MenuSection[] = [];
  menu.headings.forEach((title, index) => {
    const dishes = menu.dishes.filter((d) => d.heading === title);
    if (dishes.length > 0) sections.push({ id: `menu-${index + 1}`, title, dishes });
  });
  const known = new Set(sections.map((s) => s.title));
  const loose = menu.dishes.filter((d) => d.heading == null || !known.has(d.heading));
  if (loose.length > 0) {
    sections.push({ id: "menu-more", title: sections.length > 0 ? "More from the kitchen" : null, dishes: loose });
  }
  return sections;
}

/** Up to `count` dishes to show off at the top: those with a picture, ones being served first. */
export function platesToShow(dishes: PublicMenuDish[], count: number): PublicMenuDish[] {
  const pictured = dishes.filter((d) => Boolean(d.imageUrl));
  return [...pictured.filter((d) => d.servedNow), ...pictured.filter((d) => !d.servedNow)].slice(0, count);
}
