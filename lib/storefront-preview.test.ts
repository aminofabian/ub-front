import { describe, expect, it } from "bun:test";

import {
  parseStorefrontPreview,
  storefrontPreviewUrl,
} from "@/lib/storefront-preview";

describe("parseStorefrontPreview", () => {
  it("parses theme, landing and design overrides", () => {
    const preview = parseStorefrontPreview(
      "mart",
      "coming-soon-editorial",
      '{"version":1,"brandKit":{"radius":"soft"}}',
    );
    expect(preview.themeId).toBe("mart");
    expect(preview.landingId).toBe("coming-soon-editorial");
    expect(preview.designJson).toBe('{"version":1,"brandKit":{"radius":"soft"}}');
  });

  it("ignores unknown ids and empty design", () => {
    const preview = parseStorefrontPreview("not-a-theme", "", "   ");
    expect(preview.themeId).toBeNull();
    expect(preview.landingId).toBeNull();
    expect(preview.designJson).toBeNull();
  });
});

describe("storefrontPreviewUrl", () => {
  it("appends the draft design param when provided", () => {
    const url = storefrontPreviewUrl(
      "https://flyworks.kiosk.ke",
      "store",
      "butcher-board",
      { designJson: '{"version":1,"brandKit":{"surface":"#0a1218"}}' },
    );
    expect(url).toContain("previewTheme=butcher-board");
    expect(url).toContain(
      "previewDesign=" +
        encodeURIComponent('{"version":1,"brandKit":{"surface":"#0a1218"}}'),
    );
  });

  it("stays clean without a draft", () => {
    const url = storefrontPreviewUrl(
      "https://flyworks.kiosk.ke/",
      "landing",
      "fresh-market",
    );
    expect(url).toBe(
      "https://flyworks.kiosk.ke/?previewLanding=fresh-market",
    );
    expect(url).not.toContain("previewDesign");
  });
});
