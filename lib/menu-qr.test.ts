import { describe, expect, test } from "bun:test";

import {
  defaultMenuQrOptions,
  menuQrGrid,
  menuQrHeadline,
  menuQrPages,
  readableAddress,
  readMenuQrOptions,
  tableOrderUrl,
  tablesWithCodes,
} from "./menu-qr";

const options = defaultMenuQrOptions("Test Diner");
const tables = [
  { id: "1", name: "Table 1", active: true, qrToken: "aa11" },
  { id: "2", name: "Table 2", active: true, qrToken: null },
  { id: "3", name: "Table 3", active: false, qrToken: "cc33" },
  { id: "4", name: "Patio", active: true, qrToken: "dd44" },
];

describe("menuQrPages", () => {
  test("the menu code fills exactly one page with the same address", () => {
    const pages = menuQrPages({ options, origin: "https://diner.kiosk.ke/", tables });
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(4);
    expect(new Set(pages[0].map((c) => c.url))).toEqual(new Set(["https://diner.kiosk.ke/"]));
    expect(pages[0][0].address).toBe("diner.kiosk.ke");
    expect(pages[0][0].label).toBeNull();
  });

  test("the address in words can be left off", () => {
    const pages = menuQrPages({ options: { ...options, address: false }, origin: "https://diner.kiosk.ke", tables });
    expect(pages[0][0].address).toBeNull();
  });

  test("table codes are one per table that is in use and has a code, and never print the address", () => {
    const pages = menuQrPages({ options: { ...options, target: "tables" }, origin: "https://diner.kiosk.ke", tables });
    const cells = pages.flat();
    expect(cells.map((c) => c.label)).toEqual(["Table 1", "Patio"]);
    expect(cells[0].url).toBe("https://diner.kiosk.ke/shop/table?t=aa11");
    expect(cells.every((c) => c.address == null)).toBe(true);
  });

  test("many tables run on to more pages", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: String(i), name: `T${i}`, active: true, qrToken: `t${i}` }));
    const pages = menuQrPages({ options: { ...options, target: "tables", layout: "cards" }, origin: "https://x.test", tables: many });
    expect(pages.map((p) => p.length)).toEqual([4, 4, 1]);
    const posters = menuQrPages({ options: { ...options, target: "tables", layout: "poster" }, origin: "https://x.test", tables: many });
    expect(posters).toHaveLength(9);
  });

  test("no table with a code means nothing to print", () => {
    expect(menuQrPages({ options: { ...options, target: "tables" }, origin: "https://x.test", tables: [] })).toEqual([]);
  });
});

describe("helpers", () => {
  test("grid by layout and paper", () => {
    expect(menuQrGrid("poster", "a4")).toEqual({ columns: 1, rows: 1 });
    expect(menuQrGrid("cards", "a5")).toEqual({ columns: 1, rows: 2 });
    expect(menuQrGrid("stickers", "a4")).toEqual({ columns: 3, rows: 4 });
  });

  test("addresses", () => {
    expect(tableOrderUrl("https://diner.kiosk.ke/", "ab12")).toBe("https://diner.kiosk.ke/shop/table?t=ab12");
    expect(readableAddress("https://diner.kiosk.ke/")).toBe("diner.kiosk.ke");
    expect(tablesWithCodes(tables).map((t) => t.id)).toEqual(["1", "4"]);
  });

  test("the usual wording follows the target unless the owner wrote their own", () => {
    expect(menuQrHeadline({ target: "menu", headline: " " })).toBe("Scan for our menu");
    expect(menuQrHeadline({ target: "tables", headline: "" })).toBe("Scan to order from your table");
    expect(menuQrHeadline({ target: "menu", headline: "See what is cooking" })).toBe("See what is cooking");
  });

  test("saved choices fall back to defaults when unknown", () => {
    expect(readMenuQrOptions("junk", "Test Diner")).toEqual(options);
    expect(readMenuQrOptions({ target: "tables", layout: "banner", paper: "a5", address: false, title: "" }, "Test Diner")).toMatchObject({
      target: "tables",
      layout: "cards",
      paper: "a5",
      address: false,
      title: "Test Diner",
    });
  });
});
