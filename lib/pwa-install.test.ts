import { describe, expect, it } from "vitest";

import { detectPwaInstallKind } from "@/lib/pwa-install";

describe("detectPwaInstallKind", () => {
  it("treats an already-installed display as standalone", () => {
    expect(detectPwaInstallKind("Mozilla/5.0 (iPhone)", true, false)).toBe(
      "standalone",
    );
  });

  it("routes iPhone Safari to add-to-home-screen", () => {
    expect(
      detectPwaInstallKind(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        false,
        false,
      ),
    ).toBe("ios");
  });

  it("uses the native prompt when Chromium offered one", () => {
    expect(
      detectPwaInstallKind(
        "Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile Safari/537.36",
        false,
        true,
      ),
    ).toBe("prompt");
  });

  it("falls back to Chrome menu instructions on Android without a prompt", () => {
    expect(
      detectPwaInstallKind(
        "Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile Safari/537.36",
        false,
        false,
      ),
    ).toBe("android-manual");
  });

  it("marks desktop without a prompt as unavailable", () => {
    expect(
      detectPwaInstallKind(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36",
        false,
        false,
      ),
    ).toBe("unavailable");
  });
});
