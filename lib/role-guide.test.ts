import { describe, expect, it } from "bun:test";

import { orderRolesForPicker, roleAreas, roleGuide } from "@/lib/role-guide";

const supplierShop = { profile: { storeTypes: ["other", "supplier"] } };
const miniMart = { profile: { storeTypes: ["mini-mart"] } };

describe("orderRolesForPicker", () => {
  it("offers the everyday jobs first and owner last, and never the customer's account", () => {
    const keys = ["owner", "admin", "manager", "cashier", "viewer", "buyer", "kitchen_staff", "supplier_trade_desk"];
    const ordered = orderRolesForPicker(keys.map((key) => ({ key }))).map((role) => role.key);
    expect(ordered).toEqual(["manager", "supplier_trade_desk", "cashier", "kitchen_staff", "viewer", "admin", "owner"]);
  });
});

describe("roleAreas", () => {
  const role = { id: "1", key: "x", name: "X", permissionKeys: ["storefront.orders.read", "sales.sell"] };

  it("names an area in the supplier's words in a supplier's shop", () => {
    expect(roleAreas(role, supplierShop)).toEqual(["Trade orders", "Selling at the till"]);
    expect(roleAreas(role, miniMart)).toEqual(["Online orders", "Selling at the till"]);
  });

  it("says nothing when the permissions are not known", () => {
    expect(roleAreas({ id: "1", key: "x", name: "X" }, miniMart)).toEqual([]);
  });
});

describe("roleGuide", () => {
  it("uses the server's line for a role it has no words for, and warns on owner", () => {
    expect(roleGuide({ id: "1", key: "waiter", name: "Waiter", description: "Takes orders at tables." }, miniMart).job).toBe(
      "Takes orders at tables.",
    );
    expect(roleGuide({ id: "2", key: "owner", name: "Owner" }, miniMart).caution).not.toBeNull();
  });
});
