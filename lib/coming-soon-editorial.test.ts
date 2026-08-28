import { describe, expect, it } from "bun:test";

import { buildComingSoonEditorial } from "@/lib/coming-soon-editorial";

type Card = {
  id: string;
  sku: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  price: number | null;
};

type Cat = {
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
  itemCount?: number;
};

function item(id: string, name: string, extras: Partial<Card> = {}): Card {
  return { id, sku: id, name, variantName: null, imageUrl: null, price: null, ...extras };
}

function category(id: string, name: string, extras: Partial<Cat> = {}): Cat {
  return { id, name, parentId: null, slug: id, ...extras };
}

describe("buildComingSoonEditorial", () => {
  it("dresses a grocery from its own products, not stock aisle copy", () => {
    const content = buildComingSoonEditorial({
      storeName: "FLYWORKS",
      currency: "KES",
      countryCode: "KE",
      totalCount: 48,
      areaLabel: "Westlands",
      catalogItems: [
        item("1", "Fresh paprika", {
          imageUrl: "https://cdn.example/paprika.jpg",
          price: 240,
        }),
        item("2", "Uht milk 1l", { imageUrl: "https://cdn.example/milk.jpg", price: 180 }),
        item("3", "Digestive biscuits", { price: 80 }),
        item("4", "Roasted almonds", { price: 50 }),
      ],
      categories: [
        category("c1", "Produce", { itemCount: 12 }),
        category("c2", "Dairy", { itemCount: 8 }),
      ],
    });

    expect(content.description).not.toMatch(/mini-mart|Nairobi|1,000\+|Same-day/i);
    expect(content.heroCells.map((c) => c.name)).toEqual(
      expect.arrayContaining(["Fresh Paprika", "Uht Milk 1L"]),
    );
    expect(content.heroCells[0]?.price).toMatch(/240/);
    expect(content.chips.some((c) => c.label.includes("48"))).toBe(true);
    expect(content.chips.some((c) => c.label === "Westlands")).toBe(true);
    expect(content.teasers.map((t) => t.name)).toEqual(["Produce", "Dairy"]);
    expect(content.footerPlace).toBe("Westlands");
    expect(content.marquee).toContain("Fresh Paprika");
    expect(JSON.stringify(content)).not.toMatch(/15%/);
  });

  it("works for a cosmetics shop without grocery language", () => {
    const content = buildComingSoonEditorial({
      storeName: "Bloom Beauty",
      currency: "KES",
      catalogItems: [
        item("a", "Satin lipstick", { imageUrl: "https://cdn.example/lip.jpg", price: 950 }),
        item("b", "Vitamin c serum", { imageUrl: "https://cdn.example/serum.jpg", price: 1800 }),
        item("c", "Soft matte foundation", { price: 2200 }),
      ],
      categories: [category("make", "Makeup", { itemCount: 20 })],
    });

    expect(content.description.toLowerCase()).toContain("makeup");
    expect(content.description).not.toMatch(/grocer|paprika|essentials delivered/i);
    expect(content.heroCells[0]?.name).toBe("Satin Lipstick");
    expect(content.shelfHeading).toBe("Already on the shelf");
    expect(content.promises[0]?.title).toBe("Satin Lipstick");
  });

  it("falls back to merchant copy when the shelf is empty", () => {
    const content = buildComingSoonEditorial({
      storeName: "Kamau Pharmacy",
      landingContent: {
        subheadline: "Prescriptions, wellness, and daily care from the chemist you know.",
        address: "Tom Mboya Street, Kisumu",
        hours: "Mon-Sat 8:00-19:00",
        whatsapp: "+254700000000",
      },
    });

    expect(content.description).toContain("chemist you know");
    expect(content.heroCells).toEqual([]);
    expect(content.chips.map((c) => c.kind)).toEqual(["place", "hours"]);
    expect(content.footerPlace).toBe("Kisumu");
    expect(content.contactLabel).toBe("WhatsApp");
    expect(content.shelfHeading).toBe("When we open");
    expect(content.description).not.toMatch(/mini-mart/i);
  });

  it("uses a custom headline when it is not just the store name", () => {
    const content = buildComingSoonEditorial({
      storeName: "Print Atelier",
      landingContent: { headline: "Posters that stop the street." },
    });
    expect(content.headline.mode).toBe("custom");
    expect(content.headline.lines[0]).toBe("Posters that stop the street.");
  });

  it("keeps the editorial headline when CMS headline is the store name", () => {
    const content = buildComingSoonEditorial({
      storeName: "FLYWORKS",
      landingContent: { headline: "FLYWORKS" },
    });
    expect(content.headline.mode).toBe("editorial");
    expect(content.headline.lines).toEqual(["Something", "worth", "waiting for."]);
  });

  it("only claims M-Pesa for Kenyan shops without other chips crowding it", () => {
    const kes = buildComingSoonEditorial({
      storeName: "Kiosk",
      currency: "KES",
      countryCode: "KE",
    });
    expect(kes.chips.some((c) => c.label === "M-Pesa ready")).toBe(true);

    const usd = buildComingSoonEditorial({
      storeName: "Kiosk",
      currency: "USD",
    });
    expect(usd.chips.some((c) => c.label === "M-Pesa ready")).toBe(false);
  });

  it("does not invent a launch countdown or Nairobi", () => {
    const content = buildComingSoonEditorial({ storeName: "Oak & Ink" });
    expect(content.stats).toEqual([]);
    expect(content.footerPlace).toBeNull();
    expect(JSON.stringify(content)).not.toMatch(/Nairobi|Same-day|1,000\+|mini-mart/i);
  });
});
