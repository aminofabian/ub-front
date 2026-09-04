import { describe, expect, test } from "bun:test";

import {
  defaultShopMailHtml,
  resolveShopMailBrand,
} from "@/lib/shop-mail-brand";

describe("resolveShopMailBrand", () => {
  test("uses tenant primary and readable on-primary ink", () => {
    const brand = resolveShopMailBrand(
      {
        displayName: "Palmart",
        primaryColor: "#0F766E",
        accentColor: "#14B8A6",
        logoUrl: "https://cdn.example/logo.png",
      },
      "Fallback Shop",
    );
    expect(brand.displayName).toBe("Palmart");
    expect(brand.primary).toBe("#0f766e");
    expect(brand.logoUrl).toContain("logo.png");
    expect(brand.onPrimary).toBe("#FFFDF8");
    expect(brand.cssVars["--mail-brand" as keyof typeof brand.cssVars]).toBe(
      "#0f766e",
    );
  });

  test("picks dark ink on light primary", () => {
    const brand = resolveShopMailBrand({ primaryColor: "#F5E6C8" }, "Shop");
    expect(brand.onPrimary).toBe("#1c1917");
  });

  test("embeds logo and primary into starter HTML", () => {
    const brand = resolveShopMailBrand({
      displayName: "Zetu",
      primaryColor: "#7C3AED",
      logoUrl: "https://cdn.example/z.png",
    });
    const html = defaultShopMailHtml(brand);
    expect(html).toContain("https://cdn.example/z.png");
    expect(html).toContain("#7c3aed");
    expect(html).toContain("{{shop}}");
  });
});
