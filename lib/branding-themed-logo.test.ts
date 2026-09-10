import { describe, expect, test } from "bun:test";

import {
  resolveHeroLogo,
  resolveStorefrontLogoSurface,
  resolveThemedLogoUrl,
} from "@/lib/branding-themed-logo";

describe("resolveThemedLogoUrl", () => {
  test("uses the dark mark on dark chrome and the light mark on light chrome", () => {
    const urls = {
      logoUrl: "https://cdn.example/light.png",
      logoDarkUrl: "https://cdn.example/dark.png",
    };
    expect(resolveThemedLogoUrl(urls, "light")).toBe(
      "https://cdn.example/light.png",
    );
    expect(resolveThemedLogoUrl(urls, "dark")).toBe(
      "https://cdn.example/dark.png",
    );
  });

  test("falls back to the other mark when one is missing", () => {
    expect(
      resolveThemedLogoUrl({ logoUrl: "https://cdn.example/light.png" }, "dark"),
    ).toBe("https://cdn.example/light.png");
    expect(
      resolveThemedLogoUrl(
        { logoDarkUrl: "https://cdn.example/dark.png" },
        "light",
      ),
    ).toBe("https://cdn.example/dark.png");
  });
});

describe("resolveStorefrontLogoSurface", () => {
  test("maps live dark storefronts to the dark mark", () => {
    expect(resolveStorefrontLogoSurface("butcher-board")).toBe("dark");
    expect(resolveStorefrontLogoSurface("boutique-shelf")).toBe("dark");
    expect(resolveStorefrontLogoSurface("spirits-cellar")).toBe("dark");
    expect(resolveStorefrontLogoSurface("chem-lab")).toBe("dark");
  });

  test("keeps light storefronts on the light mark", () => {
    expect(resolveStorefrontLogoSurface("mart")).toBe("light");
    expect(resolveStorefrontLogoSurface("comilmart")).toBe("light");
    expect(resolveStorefrontLogoSurface("milk-run")).toBe("light");
  });

  test("follows Chem lab day/night", () => {
    expect(resolveStorefrontLogoSurface("chem-lab", "light")).toBe("light");
    expect(resolveStorefrontLogoSurface("chem-lab", "dark")).toBe("dark");
  });
});

describe("resolveHeroLogo", () => {
  test("uses the dark mark on the hero panel when both exist", () => {
    expect(
      resolveHeroLogo({
        logoUrl: "https://cdn.example/light.png",
        logoDarkUrl: "https://cdn.example/dark.png",
      }),
    ).toEqual({ url: "https://cdn.example/dark.png", knockout: false });
  });

  test("knocks the light mark out to white when the dark file is missing", () => {
    expect(
      resolveHeroLogo({ logoUrl: "https://cdn.example/light.png" }),
    ).toEqual({ url: "https://cdn.example/light.png", knockout: true });
  });
});
