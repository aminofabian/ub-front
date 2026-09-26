import { describe, expect, it } from "bun:test";

import {
  formatSharePrice,
  productShareCarouselUrls,
  productShareMessage,
  productShareOgDescription,
  productShareOgGalleryImages,
  productShareOgImageUrl,
  productShareOgTitle,
  type ProductShareItem,
} from "@/lib/product-share-seo";

function item(overrides: Partial<ProductShareItem> = {}): ProductShareItem {
  return {
    id: "007f6af0-e5d9-4cf5-98dd-5c16bbdc58a5",
    sku: "BAG-25",
    name: "Carrier Bag",
    description: null,
    variantName: "Bottom #25",
    currency: "KES",
    price: 50,
    images: [],
    ...overrides,
  };
}

describe("formatSharePrice", () => {
  it("formats KES as KSh with /=", () => {
    expect(formatSharePrice("KES", 50)).toBe("KSh 50/=");
    expect(formatSharePrice("KES", 2999)).toBe("KSh 2,999/=");
  });

  it("formats other currencies with ISO code", () => {
    expect(formatSharePrice("UGX", 15000)).toBe("UGX 15,000");
  });
});

describe("productShareOgTitle", () => {
  it("leads with price when catalog has a price", () => {
    expect(productShareOgTitle(item())).toBe(
      "🔥 ONLY KSh 50/= — Order Now",
    );
  });

  it("falls back to product heading without a price", () => {
    expect(productShareOgTitle(item({ price: null }))).toBe(
      "✨ Carrier Bag Bottom #25",
    );
  });
});

describe("productShareOgDescription", () => {
  it("includes pay-on-delivery and WhatsApp when set", () => {
    const text = productShareOgDescription(item(), {
      whatsapp: "0706683570",
    });
    expect(text).toContain("Payment on delivery");
    expect(text).toContain("0706 683 570");
    expect(text).toContain("Carrier Bag Bottom #25");
  });

  it("omits contact when shop has no phone", () => {
    const text = productShareOgDescription(item());
    expect(text).toContain("Payment on delivery");
    expect(text).not.toContain("WhatsApp");
  });
});

describe("productShareOgImageUrl", () => {
  it("builds an absolute /og/product URL", () => {
    expect(
      productShareOgImageUrl({
        origin: "https://palmart.co.ke",
        slug: "palmart",
        itemId: "abc-123",
      }),
    ).toBe("https://palmart.co.ke/og/product?slug=palmart&item=abc-123");
  });
});

describe("productShareCarouselUrls", () => {
  it("returns sized gallery URLs capped at 5", () => {
    const urls = productShareCarouselUrls(
      item({
        images: [
          {
            url: "https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
          },
          {
            url: "https://res.cloudinary.com/demo/image/upload/v1/b.jpg",
          },
          {
            url: "https://res.cloudinary.com/demo/image/upload/v1/c.jpg",
          },
        ],
      }),
    );
    expect(urls).toHaveLength(3);
    expect(urls[0]).toContain("c_fill,w_1080,h_1080");
    expect(urls[0]).toContain("/a.jpg");
  });

  it("dedupes identical URLs", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/a.jpg";
    expect(
      productShareCarouselUrls(item({ images: [{ url }, { url }] })),
    ).toHaveLength(1);
  });
});

describe("productShareOgGalleryImages", () => {
  it("pads gallery slides for og:image", () => {
    const slides = productShareOgGalleryImages(
      item({
        images: [
          {
            url: "https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
          },
        ],
      }),
      "Carrier Bag",
    );
    expect(slides).toHaveLength(1);
    expect(slides[0]!.url).toContain("c_pad,w_1200,h_630");
    expect(slides[0]!.alt).toBe("Carrier Bag · 1");
  });
});

describe("productShareMessage", () => {
  it("builds a WhatsApp-ready multi-line body with bold markers", () => {
    const text = productShareMessage(
      item(),
      "https://palmart.co.ke/products/carrier-bag",
      { phone: "0706683570" },
      "Palmart",
    );
    expect(text).toContain("✨ *NEW IN!*");
    expect(text).toContain("*ONLY KSh 50/=*");
    expect(text).toContain("*Carrier Bag Bottom #25*");
    expect(text).toContain("_Palmart_");
    expect(text).toContain("https://palmart.co.ke/products/carrier-bag");
    expect(text).toContain("*0706 683 570*");
    expect(text).toContain("👇 Tap to order:");
  });
});
