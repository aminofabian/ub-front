import { describe, expect, it } from "bun:test";

import {
  publicSupplierPortalPath,
  publicSupplierPortalUrl,
} from "@/lib/public-supplier-portal";

describe("publicSupplierPortalPath", () => {
  it("builds /s/{slug}", () => {
    expect(publicSupplierPortalPath("jamro")).toBe("/s/jamro");
  });
});

describe("publicSupplierPortalUrl", () => {
  it("joins origin and path", () => {
    expect(publicSupplierPortalUrl("jamro", "https://demo.palmart.co.ke")).toBe(
      "https://demo.palmart.co.ke/s/jamro",
    );
  });
});
