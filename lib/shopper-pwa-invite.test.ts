import { beforeEach, describe, expect, it } from "bun:test";

import {
  readShopperPwaInviteRecord,
  shouldShowShopperPwaInvite,
  shopperPwaInviteKey,
  writeShopperPwaInviteRecord,
} from "@/lib/shopper-pwa-invite";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  const localStorage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    clear: () => memory.clear(),
  };
  Object.defineProperty(globalThis, "window", {
    value: { localStorage },
    configurable: true,
    writable: true,
  });
});

describe("shopper PWA invite persistence", () => {
  it("keys storage per shop slug", () => {
    expect(shopperPwaInviteKey("Flyworks")).toBe("ub.shopperPwa.flyworks");
  });

  it("hides the chip after install is recorded", () => {
    writeShopperPwaInviteRecord("flyworks", "installed");
    expect(readShopperPwaInviteRecord("flyworks")).toBe("installed");
    expect(
      shouldShowShopperPwaInvite({ slug: "flyworks", standalone: false }),
    ).toBe(false);
  });

  it("hides the chip after the shopper dismisses it", () => {
    writeShopperPwaInviteRecord("flyworks", "dismissed");
    expect(
      shouldShowShopperPwaInvite({ slug: "flyworks", standalone: false }),
    ).toBe(false);
  });

  it("shows while unset, and never in an already-installed display", () => {
    expect(
      shouldShowShopperPwaInvite({ slug: "flyworks", standalone: false }),
    ).toBe(true);
    expect(
      shouldShowShopperPwaInvite({ slug: "flyworks", standalone: true }),
    ).toBe(false);
  });
});
