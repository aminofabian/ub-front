import { describe, expect, test } from "bun:test";

import { menuSections, platesToShow, type PublicMenuDish } from "./public-menu";

function dish(name: string, heading: string | null, extra: Partial<PublicMenuDish> = {}): PublicMenuDish {
  return { id: name, heading, name, description: null, price: 100, imageUrl: null, servedNow: true, ...extra };
}

describe("menuSections", () => {
  test("follows the menu's heading order and puts unfiled dishes last", () => {
    const sections = menuSections({
      headings: ["Mains", "Drinks"],
      dishes: [dish("Soda", "Drinks"), dish("Pilau", "Mains"), dish("Mandazi", null), dish("Stew", "Mains")],
    });
    expect(sections.map((s) => s.title)).toEqual(["Mains", "Drinks", "More from the kitchen"]);
    expect(sections[0].dishes.map((d) => d.name)).toEqual(["Pilau", "Stew"]);
    expect(new Set(sections.map((s) => s.id)).size).toBe(3);
  });

  test("a menu with no headings is one untitled section", () => {
    const sections = menuSections({ headings: [], dishes: [dish("Chips", null), dish("Tea", null)] });
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeNull();
  });

  test("a dish under a heading the menu no longer lists is not lost", () => {
    const sections = menuSections({ headings: ["Mains"], dishes: [dish("Pilau", "Mains"), dish("Cake", "Desserts")] });
    expect(sections[1].dishes.map((d) => d.name)).toEqual(["Cake"]);
  });

  test("an empty menu has no sections", () => {
    expect(menuSections({ headings: ["Mains"], dishes: [] })).toEqual([]);
  });
});

describe("platesToShow", () => {
  test("only pictured dishes, those being served first", () => {
    const plates = platesToShow(
      [
        dish("Plain", null),
        dish("Off", null, { imageUrl: "a", servedNow: false }),
        dish("On", null, { imageUrl: "b" }),
        dish("Also on", null, { imageUrl: "c" }),
      ],
      2,
    );
    expect(plates.map((d) => d.name)).toEqual(["On", "Also on"]);
    expect(platesToShow([dish("Plain", null)], 3)).toEqual([]);
  });
});
