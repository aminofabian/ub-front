import { describe, expect, it } from "bun:test";

import {
  applyBusinessProfileToLandingContent,
  businessSocialLinks,
  formatBusinessHours,
  normalizeStorefrontSection,
  parseStorefrontDesignJson,
  resolveStorefrontDesign,
  serializeStorefrontDesign,
  storefrontSectionConfig,
  storefrontSectionEnabled,
  storefrontSectionsInRegion,
} from "@/lib/storefront-design";

describe("parseStorefrontDesignJson", () => {
  it("returns null for empty or garbage input", () => {
    expect(parseStorefrontDesignJson(null)).toBeNull();
    expect(parseStorefrontDesignJson("")).toBeNull();
    expect(parseStorefrontDesignJson("not json")).toBeNull();
    expect(parseStorefrontDesignJson("[]")).toBeNull();
    expect(parseStorefrontDesignJson('{"version":99}')).toBeNull();
  });

  it("normalizes a valid design", () => {
    const design = parseStorefrontDesignJson(
      JSON.stringify({
        version: 1,
        brandKit: { radius: "soft", surface: "#FFFCF5" },
        photos: {
          hero: { url: "https://cdn.example/hero.jpg", focalX: 70, focalY: 35, fit: "cover" },
        },
      }),
    );
    expect(design?.brandKit?.radius).toBe("soft");
    expect(design?.brandKit?.surface).toBe("#fffcf5");
    expect(design?.photos?.hero?.focalX).toBe(70);
  });

  it("clamps focal points and drops unknown keys", () => {
    const design = parseStorefrontDesignJson(
      JSON.stringify({
        version: 1,
        brandKit: { radius: "bogus", nope: true },
        photos: {
          hero: { url: "https://cdn.example/hero.jpg", focalX: 999, focalY: -5 },
        },
        sections: [{ id: "testimonials" }],
      }),
    );
    expect(design?.brandKit?.radius).toBeUndefined();
    expect(design?.photos?.hero?.focalX).toBe(100);
    expect(design?.photos?.hero?.focalY).toBe(0);
    expect(design?.photos?.hero?.fit).toBe("cover");
    expect((design as { sections?: unknown })?.sections).toBeUndefined();
  });

  it("rejects a hero without a url", () => {
    const design = parseStorefrontDesignJson(
      JSON.stringify({
        version: 1,
        photos: { hero: { focalX: 50, focalY: 50 } },
      }),
    );
    expect(design).toBeNull();
  });

  it("round-trips through serialize", () => {
    const raw =
      '{"version":1,"brandKit":{"radius":"round","surface":"#123456"},"photos":{"hero":{"url":"https://cdn.example/hero.jpg","focalX":80,"focalY":20,"fit":"contain"}}}';
    const design = parseStorefrontDesignJson(raw);
    const reserialized = serializeStorefrontDesign(design);
    // JSON key order is not significant — compare the parsed documents.
    expect(parseStorefrontDesignJson(reserialized)).toEqual(design);
  });

  it("serializes an empty form to null so the backend can clear it", () => {
    expect(serializeStorefrontDesign({ version: 1 })).toBeNull();
    expect(serializeStorefrontDesign(null)).toBeNull();
  });
});

describe("formatBusinessHours", () => {
  const design = (days: Record<string, unknown>, note?: string) =>
    parseStorefrontDesignJson(JSON.stringify({ version: 1, business: { hours: { days, note } } }))
      ?.business?.hours ?? null;

  it("groups consecutive days with the same schedule", () => {
    const hours = design({
      mon: { open: true, openTime: "08:00", closeTime: "19:00" },
      tue: { open: true, openTime: "08:00", closeTime: "19:00" },
      wed: { open: true, openTime: "08:00", closeTime: "19:00" },
      thu: { open: true, openTime: "08:00", closeTime: "19:00" },
      fri: { open: true, openTime: "08:00", closeTime: "19:00" },
      sat: { open: true, openTime: "08:00", closeTime: "19:00" },
      sun: { open: false, openTime: "08:00", closeTime: "19:00" },
    });
    expect(formatBusinessHours(hours)).toBe("Mon–Sat 8:00–19:00");
  });

  it("splits different schedules and appends the note", () => {
    const hours = design(
      {
        mon: { open: true, openTime: "09:00", closeTime: "17:00" },
        tue: { open: true, openTime: "09:00", closeTime: "17:00" },
        wed: { open: false, openTime: "08:00", closeTime: "19:00" },
        thu: { open: true, openTime: "09:00", closeTime: "17:00" },
        fri: { open: true, openTime: "09:00", closeTime: "17:00" },
        sat: { open: false, openTime: "08:00", closeTime: "19:00" },
        sun: { open: false, openTime: "08:00", closeTime: "19:00" },
      },
      "Open holidays",
    );
    expect(formatBusinessHours(hours)).toBe("Mon–Tue 9:00–17:00, Thu–Fri 9:00–17:00 · Open holidays");
  });

  it("returns the note alone (or null) when nothing is open", () => {
    const closed = design({
      mon: { open: false, openTime: "08:00", closeTime: "19:00" },
      tue: { open: false, openTime: "08:00", closeTime: "19:00" },
      wed: { open: false, openTime: "08:00", closeTime: "19:00" },
      thu: { open: false, openTime: "08:00", closeTime: "19:00" },
      fri: { open: false, openTime: "08:00", closeTime: "19:00" },
      sat: { open: false, openTime: "08:00", closeTime: "19:00" },
      sun: { open: false, openTime: "08:00", closeTime: "19:00" },
    });
    expect(formatBusinessHours(closed)).toBeNull();
    expect(formatBusinessHours(design({}, "By appointment"))).toBe("By appointment");
    expect(
      formatBusinessHours(
        design(
          {
            mon: { open: false, openTime: "08:00", closeTime: "19:00" },
            tue: { open: false, openTime: "08:00", closeTime: "19:00" },
            wed: { open: false, openTime: "08:00", closeTime: "19:00" },
            thu: { open: false, openTime: "08:00", closeTime: "19:00" },
            fri: { open: false, openTime: "08:00", closeTime: "19:00" },
            sat: { open: false, openTime: "08:00", closeTime: "19:00" },
            sun: { open: false, openTime: "08:00", closeTime: "19:00" },
          },
          "By appointment",
        ),
      ),
    ).toBe("By appointment");
  });
});

describe("business profile", () => {
  it("parses contact, location, hours and social groups", () => {
    const design = parseStorefrontDesignJson(
      JSON.stringify({
        version: 1,
        business: {
          tagline: "Pens, paper, gifts and everyday essentials.",
          description: "A small shop in the city centre.",
          contact: { phone: "+254700000000", whatsapp: "+254700000000", email: "hi@flyworks.ke" },
          location: { address: "Moi Avenue", town: "Nairobi", mapUrl: "https://maps.google.com/?q=x" },
          hours: {
            days: {
              mon: { open: true, openTime: "08:00", closeTime: "19:00" },
              tue: { open: true, openTime: "08:00", closeTime: "19:00" },
              wed: { open: true, openTime: "08:00", closeTime: "19:00" },
              thu: { open: true, openTime: "08:00", closeTime: "19:00" },
              fri: { open: true, openTime: "08:00", closeTime: "19:00" },
              sat: { open: true, openTime: "08:00", closeTime: "19:00" },
              sun: { open: false, openTime: "08:00", closeTime: "19:00" },
            },
          },
          social: { instagram: "@flyworkske", tiktok: "https://tiktok.com/@flyworks" },
        },
      }),
    );
    const biz = design?.business;
    expect(biz?.tagline).toBe("Pens, paper, gifts and everyday essentials.");
    expect(biz?.contact?.email).toBe("hi@flyworks.ke");
    expect(biz?.location?.town).toBe("Nairobi");
    expect(biz?.hours?.days.sun.open).toBe(false);
    expect(biz?.social?.instagram).toBe("@flyworkske");
  });

  it("drops invalid day schedules and unknown social keys", () => {
    const design = parseStorefrontDesignJson(
      JSON.stringify({
        version: 1,
        business: {
          hours: {
            days: {
              mon: { open: true, openTime: "9am", closeTime: "19:00" },
              tue: { open: false, openTime: "25:99", closeTime: "19:00" },
            },
          },
          social: { instagram: "ok", myspace: "nope" },
        },
      }),
    );
    expect(design?.business?.hours?.days.mon.open).toBe(false);
    expect(design?.business?.hours?.days.tue.open).toBe(false);
    expect(design?.business?.hours?.days.wed.open).toBe(false);
    expect(design?.business?.social?.instagram).toBe("ok");
    expect(design?.business?.social).not.toHaveProperty("myspace");
  });

  it("derives legacy landing content from the business profile", () => {
    const design = parseStorefrontDesignJson(
      JSON.stringify({
        version: 1,
        business: {
          tagline: "Pens, paper and gifts.",
          contact: { whatsapp: "+254700000000" },
          location: { address: "Moi Avenue", town: "Nairobi" },
          hours: {
            days: {
              mon: { open: true, openTime: "08:00", closeTime: "19:00" },
              tue: { open: true, openTime: "08:00", closeTime: "19:00" },
              wed: { open: true, openTime: "08:00", closeTime: "19:00" },
              thu: { open: true, openTime: "08:00", closeTime: "19:00" },
              fri: { open: true, openTime: "08:00", closeTime: "19:00" },
              sat: { open: true, openTime: "08:00", closeTime: "19:00" },
              sun: { open: false, openTime: "08:00", closeTime: "19:00" },
            },
          },
        },
      }),
    );
    const merged = applyBusinessProfileToLandingContent(
      { headline: "FLYWORKS", ctaLabel: "Message us" },
      design?.business,
    );
    expect(merged).toEqual({
      headline: "FLYWORKS",
      subheadline: "Pens, paper and gifts.",
      phone: null,
      whatsapp: "+254700000000",
      hours: "Mon–Sat 8:00–19:00",
      address: "Moi Avenue, Nairobi",
      ctaLabel: "Message us",
    });
  });

  it("keeps explicit landing content when the profile has nothing to add", () => {
    const explicit = { headline: "FLYWORKS", hours: "By appointment" };
    expect(applyBusinessProfileToLandingContent(explicit, null)).toEqual(explicit);
    expect(applyBusinessProfileToLandingContent(explicit, {})).toEqual(explicit);
  });

  it("normalizes social handles into links", () => {
    const design = parseStorefrontDesignJson(
      JSON.stringify({
        version: 1,
        business: { social: { instagram: "@flyworkske", tiktok: "https://tiktok.com/@flyworks" } },
      }),
    );
    const links = businessSocialLinks(design?.business);
    expect(links).toEqual([
      { key: "instagram", label: "Instagram", href: "https://instagram.com/flyworkske" },
      { key: "tiktok", label: "TikTok", href: "https://tiktok.com/@flyworks" },
    ]);
  });
});

describe("sections", () => {
  it("normalizes a section and its settings", () => {
    const section = normalizeStorefrontSection({
      id: "promo",
      enabled: true,
      settings: { title: "20% OFF", coupon: "WELCOME10", endsAt: "bogus" },
    });
    expect(section?.enabled).toBe(true);
    if (section?.id === "promo") {
      expect(section.settings.title).toBe("20% OFF");
      expect(section.settings.coupon).toBe("WELCOME10");
      expect(section.settings.endsAt).toBe("");
      expect(section.settings.subtitle).toBe("");
    }
  });

  it("accepts a valid endsAt and drops unknown section ids", () => {
    const good = normalizeStorefrontSection({
      id: "promo",
      enabled: false,
      settings: { endsAt: "2026-12-25T18:00:00.000Z" },
    });
    if (good?.id === "promo") {
      expect(good.settings.endsAt).toBe("2026-12-25T18:00:00.000Z");
    }
    expect(normalizeStorefrontSection({ id: "testimonials", enabled: true })).toBeNull();
    expect(normalizeStorefrontSection({ enabled: true })).toBeNull();
  });

  it("groups sections by region in design order", () => {
    const design = parseStorefrontDesignJson(
      JSON.stringify({
        version: 1,
        sections: [
          { id: "social", enabled: true, settings: {} },
          { id: "announcement", enabled: true, settings: { text: "Free delivery" } },
          { id: "promo", enabled: false, settings: { title: "Sale" } },
          { id: "contact", enabled: true, settings: {} },
          { id: "about", enabled: true, settings: { heading: "About us" } },
        ],
      }),
    );
    expect(
      storefrontSectionsInRegion(design, "pre").map((s) => s.id),
    ).toEqual(["announcement"]);
    expect(
      storefrontSectionsInRegion(design, "post").map((s) => s.id),
    ).toEqual(["social", "contact", "about"]);
    expect(storefrontSectionsInRegion(null, "pre")).toEqual([]);
  });

  it("normalizes the hero section settings", () => {
    const section = normalizeStorefrontSection({
      id: "hero",
      enabled: true,
      settings: {
        headline: "Fresh groceries",
        height: "huge",
        overlay: "dark",
        showCta: false,
      },
    });
    expect(section?.enabled).toBe(true);
    if (section?.id === "hero") {
      expect(section.settings.headline).toBe("Fresh groceries");
      expect(section.settings.height).toBe("medium"); // invalid → default
      expect(section.settings.overlay).toBe("dark");
      expect(section.settings.showCta).toBe(false);
      expect(section.settings.showWhatsapp).toBe(true);
      expect(section.settings.subheadline).toBe("");
    }
  });

  it("keeps shelves sections with empty settings", () => {
    const categories = normalizeStorefrontSection({
      id: "categories",
      enabled: true,
      settings: { bogus: true },
    });
    expect(categories?.enabled).toBe(true);
    expect(categories?.settings).toEqual({});
    const products = normalizeStorefrontSection({ id: "products", enabled: false });
    expect(products?.settings).toEqual({});
  });

  it("groups shelves sections in their own region and exposes helpers", () => {
    const design = parseStorefrontDesignJson(
      JSON.stringify({
        version: 1,
        sections: [
          { id: "announcement", enabled: true, settings: { text: "Free delivery" } },
          { id: "hero", enabled: true, settings: { height: "large" } },
          { id: "categories", enabled: false, settings: {} },
          { id: "products", enabled: true, settings: {} },
        ],
      }),
    );
    expect(
      storefrontSectionsInRegion(design, "shelves").map((s) => s.id),
    ).toEqual(["hero", "products"]);
    expect(storefrontSectionEnabled(design, "hero")).toBe(true);
    expect(storefrontSectionEnabled(design, "categories")).toBe(false);
    expect(storefrontSectionEnabled(design, "social")).toBe(false);
    expect(storefrontSectionConfig(design, "products")?.enabled).toBe(true);
    expect(storefrontSectionConfig(null, "hero")).toBeNull();
  });

  it("round-trips sections through serialize", () => {
    const raw =
      '{"version":1,"sections":[{"id":"announcement","enabled":true,"settings":{"text":"Free delivery today"}}]}';
    const design = parseStorefrontDesignJson(raw);
    expect(serializeStorefrontDesign(design)).toBe(raw);
  });
});

describe("resolveStorefrontDesign", () => {
  it("falls back to theme defaults when there is no design", () => {
    const resolved = resolveStorefrontDesign(null);
    expect(resolved.radius).toBe("sharp");
    expect(resolved.buttons).toBe("solid");
    expect(resolved.density).toBe("cozy");
    expect(resolved.surfaceHex).toBeNull();
    expect(resolved.heroPhoto).toBeNull();
  });

  it("applies merchant overrides", () => {
    const design = parseStorefrontDesignJson(
      JSON.stringify({
        version: 1,
        brandKit: { radius: "round", density: "airy", surface: "#0A1218" },
        photos: { hero: { url: "https://cdn.example/hero.jpg", focalX: 25, focalY: 25, fit: "cover" } },
      }),
    );
    const resolved = resolveStorefrontDesign(design);
    expect(resolved.radius).toBe("round");
    expect(resolved.density).toBe("airy");
    expect(resolved.surfaceHex).toBe("#0a1218");
    expect(resolved.heroPhoto?.focalX).toBe(25);
  });
});
