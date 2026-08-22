import { describe, expect, it } from "bun:test";

import {
  CLOUDINARY_TRANSFORMS,
  cloudinaryTransformUrl,
} from "@/lib/cloudinary-transform";

describe("cloudinaryTransformUrl", () => {
  it("inserts the transform after /image/upload/", () => {
    const url =
      "https://res.cloudinary.com/demo/image/upload/v1721234567/ub/abc/design/hero.jpg";
    expect(cloudinaryTransformUrl(url, CLOUDINARY_TRANSFORMS.enhance)).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_enhance/v1721234567/ub/abc/design/hero.jpg",
    );
  });

  it("works without a version segment", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/ub/abc/hero.png";
    expect(cloudinaryTransformUrl(url, CLOUDINARY_TRANSFORMS.removeBackground)).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_background_removal/ub/abc/hero.png",
    );
  });

  it("returns null for non-Cloudinary urls", () => {
    expect(cloudinaryTransformUrl("https://cdn.example/hero.jpg", "e_enhance")).toBeNull();
    expect(cloudinaryTransformUrl("", "e_enhance")).toBeNull();
  });
});
