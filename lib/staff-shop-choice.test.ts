import { describe, expect, it } from "bun:test";

import type { PublicSignInDestination } from "@/lib/api";
import { filterStaffShopChoices } from "@/lib/staff-shop-choice";

const shops: PublicSignInDestination[] = [
  { slug: "jaza", name: "Jaza", primaryHost: "jaza.kiosk.ke", door: "STAFF" },
  { slug: "babes", name: "Babes", primaryHost: "babes.kiosk.ke", door: "STAFF" },
  {
    slug: "zetuzetu",
    name: "ZetuZetu",
    primaryHost: "zetuzetu.kiosk.ke",
    door: "STAFF",
  },
];

describe("filterStaffShopChoices", () => {
  it("returns every shop when the query is blank", () => {
    expect(filterStaffShopChoices(shops, "  ")).toEqual(shops);
  });

  it("matches a shop name", () => {
    expect(filterStaffShopChoices(shops, "babe").map((row) => row.slug)).toEqual([
      "babes",
    ]);
  });

  it("matches the address and requires every word", () => {
    expect(
      filterStaffShopChoices(shops, "zetu kiosk").map((row) => row.slug),
    ).toEqual(["zetuzetu"]);
    expect(filterStaffShopChoices(shops, "jaza babes")).toEqual([]);
  });
});
