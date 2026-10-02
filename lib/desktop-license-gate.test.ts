import { afterEach, describe, expect, it } from "bun:test";

import {
  isDesktopLicenseWriteBlocked,
  setDesktopLicenseReadOnly,
} from "@/lib/desktop-license-gate";

const ORIGINAL_RUNTIME = process.env.NEXT_PUBLIC_RUNTIME;

afterEach(() => {
  if (ORIGINAL_RUNTIME === undefined) {
    delete process.env.NEXT_PUBLIC_RUNTIME;
  } else {
    process.env.NEXT_PUBLIC_RUNTIME = ORIGINAL_RUNTIME;
  }
  setDesktopLicenseReadOnly(false);
});

describe("desktop license write gate", () => {
  it("does nothing outside the desktop runtime", () => {
    process.env.NEXT_PUBLIC_RUNTIME = "cloud";
    setDesktopLicenseReadOnly(true);
    expect(isDesktopLicenseWriteBlocked("POST", "/api/v1/sales")).toBe(false);
  });

  it("does nothing while the license is writable", () => {
    process.env.NEXT_PUBLIC_RUNTIME = "desktop";
    setDesktopLicenseReadOnly(false);
    expect(isDesktopLicenseWriteBlocked("POST", "/api/v1/sales")).toBe(false);
  });

  it("blocks ordinary writes while read-only", () => {
    process.env.NEXT_PUBLIC_RUNTIME = "desktop";
    setDesktopLicenseReadOnly(true);
    expect(isDesktopLicenseWriteBlocked("POST", "/api/v1/sales")).toBe(true);
    expect(isDesktopLicenseWriteBlocked("PUT", "/api/v1/products/1")).toBe(true);
    expect(isDesktopLicenseWriteBlocked("DELETE", "/api/v1/customers/1")).toBe(
      true,
    );
  });

  it("lets reads through while read-only", () => {
    process.env.NEXT_PUBLIC_RUNTIME = "desktop";
    setDesktopLicenseReadOnly(true);
    expect(isDesktopLicenseWriteBlocked("GET", "/api/v1/sales")).toBe(false);
    expect(isDesktopLicenseWriteBlocked("HEAD", "/api/v1/sales")).toBe(false);
    expect(isDesktopLicenseWriteBlocked("OPTIONS", "/api/v1/sales")).toBe(false);
  });

  it("keeps install-recovery writes writable while read-only", () => {
    process.env.NEXT_PUBLIC_RUNTIME = "desktop";
    setDesktopLicenseReadOnly(true);
    // §12 — an expired license must not strand a wedged install.
    expect(isDesktopLicenseWriteBlocked("POST", "/api/v1/desktop/setup")).toBe(
      false,
    );
    expect(
      isDesktopLicenseWriteBlocked("POST", "/api/v1/desktop/setup/reset"),
    ).toBe(false);
    expect(isDesktopLicenseWriteBlocked("POST", "/api/v1/desktop/connect")).toBe(
      false,
    );
    expect(
      isDesktopLicenseWriteBlocked("POST", "/api/v1/desktop/reconnect"),
    ).toBe(false);
    expect(
      isDesktopLicenseWriteBlocked("POST", "/api/v1/desktop/reconnect/refresh"),
    ).toBe(false);
    expect(isDesktopLicenseWriteBlocked("POST", "/api/v1/auth/login")).toBe(
      false,
    );
    expect(isDesktopLicenseWriteBlocked("POST", "/api/v1/license")).toBe(false);
  });

  it("ignores query strings when matching whitelist prefixes", () => {
    process.env.NEXT_PUBLIC_RUNTIME = "desktop";
    setDesktopLicenseReadOnly(true);
    expect(
      isDesktopLicenseWriteBlocked("POST", "/api/v1/desktop/setup?x=1"),
    ).toBe(false);
    expect(isDesktopLicenseWriteBlocked("POST", "/api/v1/sales?x=1")).toBe(true);
  });
});
