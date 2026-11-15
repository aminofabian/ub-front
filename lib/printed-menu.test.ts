import { describe, expect, test } from "bun:test";

import {
  defaultPrintedMenuOptions,
  NO_HEADING,
  printedHeadings,
  printedPrice,
  printedSections,
  readPrintedMenuOptions,
} from "./printed-menu";
import type { MenuItemRecord, MenuRecord } from "./restaurant-api";

function item(name: string, categoryId: string | null, extra: Partial<MenuItemRecord> = {}): MenuItemRecord {
  return {
    id: name,
    categoryId,
    name,
    kind: "DISH",
    itemId: null,
    price: 100,
    taxRateId: null,
    stationId: null,
    available: true,
    active: true,
    sellable: true,
    sortOrder: 0,
    modifierGroupIds: [],
    ...extra,
  };
}

function menu(items: MenuItemRecord[]): MenuRecord {
  return {
    categories: [
      { id: "mains", name: "Mains", active: true },
      { id: "drinks", name: "Drinks", active: true },
      { id: "old", name: "Old", active: false },
    ] as MenuRecord["categories"],
    items,
    modifierGroups: [],
    stations: [],
  };
}

const options = defaultPrintedMenuOptions("Test Diner");

describe("printedPrice", () => {
  test("drops cents that are not there and separates thousands", () => {
    expect(printedPrice(350, null)).toBe("350");
    expect(printedPrice(1200, null)).toBe("1,200");
    expect(printedPrice(99.5, null)).toBe("99.50");
    expect(printedPrice(1250, "KES")).toBe("KES 1,250");
  });
});

describe("printedSections", () => {
  test("keeps the menu's heading order and leaves out what cannot be printed", () => {
    const sections = printedSections(
      menu([
        item("Soda", "drinks"),
        item("Pilau", "mains"),
        item("Switched off", "mains", { active: false }),
        item("No price", "mains", { price: null }),
        item("Loose", null),
        item("Orphan", "old"),
      ]),
      options,
    );
    expect(sections.map((s) => s.title)).toEqual(["Mains", "Drinks", "Also"]);
    expect(sections[0].dishes.map((d) => d.name)).toEqual(["Pilau"]);
    expect(sections[2].dishes.map((d) => d.name)).toEqual(["Loose", "Orphan"]);
  });

  test("a menu with no headings is one untitled section", () => {
    const sections = printedSections(menu([item("Chips", null)]), options);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeNull();
  });

  test("hidden headings are left off, including the dishes with no heading", () => {
    const m = menu([item("Soda", "drinks"), item("Pilau", "mains"), item("Loose", null)]);
    const sections = printedSections(m, { ...options, hidden: ["drinks", NO_HEADING] });
    expect(sections.map((s) => s.title)).toEqual(["Mains"]);
  });

  test("prints the ordinary price, not the happy hour one, and descriptions only when asked", () => {
    const m = menu([item("Beer", "drinks", { price: 200, regularPrice: 300, description: " Cold " })]);
    expect(printedSections(m, options)[0].dishes[0]).toMatchObject({ price: "300", description: "Cold" });
    expect(printedSections(m, { ...options, descriptions: false, currency: true })[0].dishes[0]).toMatchObject({
      price: "KES 300",
      description: null,
    });
  });

  test("pictures appear only on the picture template, pictured dishes first", () => {
    const m = menu([item("Plain", "mains"), item("Shown", "mains", { imageUrl: "/a.jpg" })]);
    expect(printedSections(m, options)[0].dishes.every((d) => d.imageUrl == null)).toBe(true);
    const pictured = printedSections(m, { ...options, template: "pictures" })[0].dishes;
    expect(pictured.map((d) => d.name)).toEqual(["Shown", "Plain"]);
    expect(pictured[0].imageUrl).toBe("/a.jpg");
  });
});

describe("printedHeadings", () => {
  test("lists only headings with something to print, with counts", () => {
    const headings = printedHeadings(menu([item("Pilau", "mains"), item("Stew", "mains"), item("Loose", null)]));
    expect(headings).toEqual([
      { id: "mains", name: "Mains", count: 2 },
      { id: NO_HEADING, name: "Everything else", count: 1 },
    ]);
  });
});

describe("readPrintedMenuOptions", () => {
  test("falls back to defaults for anything unknown or the wrong shape", () => {
    expect(readPrintedMenuOptions(null, "Test Diner")).toEqual(options);
    const read = readPrintedMenuOptions(
      { template: "neon", paper: "a5", ink: 7, title: "", line: "By the lake", hidden: ["mains", 4], descriptions: "yes" },
      "Test Diner",
    );
    expect(read).toMatchObject({
      template: "house",
      paper: "a5",
      ink: "ink",
      title: "Test Diner",
      line: "By the lake",
      hidden: ["mains"],
      descriptions: true,
    });
  });
});
