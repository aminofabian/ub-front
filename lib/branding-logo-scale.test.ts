import { describe, expect, test } from "bun:test";

import {
  BRANDING_LOGO_SCALE_DEFAULT,
  BRANDING_LOGO_SCALE_MAX,
  BRANDING_LOGO_SCALE_MIN,
  brandingLogoScaleCss,
  clampBrandingLogoScale,
  STOREFRONT_LOGO_SCALE_VAR,
  storefrontLogoImageStyle,
} from "@/lib/branding-logo-scale";

describe("clampBrandingLogoScale", () => {
  test("defaults garbage and missing values", () => {
    expect(clampBrandingLogoScale(undefined)).toBe(BRANDING_LOGO_SCALE_DEFAULT);
    expect(clampBrandingLogoScale(null)).toBe(BRANDING_LOGO_SCALE_DEFAULT);
    expect(clampBrandingLogoScale("nope")).toBe(BRANDING_LOGO_SCALE_DEFAULT);
    expect(clampBrandingLogoScale(Number.NaN)).toBe(BRANDING_LOGO_SCALE_DEFAULT);
  });

  test("clamps to the usable range", () => {
    expect(clampBrandingLogoScale(0.1)).toBe(BRANDING_LOGO_SCALE_MIN);
    expect(clampBrandingLogoScale(9)).toBe(BRANDING_LOGO_SCALE_MAX);
    expect(clampBrandingLogoScale(1.23)).toBe(1.25);
  });
});

describe("storefront logo scale CSS", () => {
  test("writes the custom property as a unitless multiplier", () => {
    expect(brandingLogoScaleCss(1.5)).toBe("1.5");
    expect(storefrontLogoImageStyle("md").height).toContain(
      `var(${STOREFRONT_LOGO_SCALE_VAR}, 1)`,
    );
  });
});
