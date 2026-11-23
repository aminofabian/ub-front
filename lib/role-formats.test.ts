import { describe, expect, test } from "bun:test";

import { rolesForBusiness } from "./role-formats";

const roles = [
  "owner", "admin", "manager", "cashier", "stock_manager", "pharmacist",
  "kitchen_staff", "waiter", "butcher_cashier", "grocery_clerk", "service_staff", "custom_role",
].map((key) => ({ id: `id-${key}`, key }));

const shop = (...storeTypes: string[]) => ({ profile: { storeTypes } });
const keys = (list: Array<{ key: string }>) => list.map((r) => r.key);

describe("rolesForBusiness", () => {
  test("a chemist is offered the pharmacist and none of the kitchen, butchery, grocery or salon roles", () => {
    expect(keys(rolesForBusiness(roles, shop("pharmacy")))).toEqual([
      "owner", "admin", "manager", "cashier", "stock_manager", "pharmacist", "custom_role",
    ]);
  });

  test("clinic roles are offered to a clinic only", () => {
    const withClinic = [...roles, ...["clinician", "nurse", "clinic_receptionist"].map((key) => ({ id: `id-${key}`, key }))];
    const chemist = keys(rolesForBusiness(withClinic, shop("pharmacy")));
    expect(chemist).not.toContain("clinician");
    expect(chemist).not.toContain("nurse");
    expect(chemist).not.toContain("clinic_receptionist");
    const both = keys(rolesForBusiness(withClinic, shop("pharmacy", "clinic")));
    expect(both).toContain("pharmacist");
    expect(both).toContain("clinician");
    expect(both).toContain("nurse");
    expect(both).toContain("clinic_receptionist");
    expect(both).not.toContain("service_staff");
  });

  test("a restaurant is offered kitchen staff and waiters, not the pharmacist", () => {
    const k = keys(rolesForBusiness(roles, shop("restaurant")));
    expect(k).toContain("kitchen_staff");
    expect(k).toContain("waiter");
    expect(k).not.toContain("pharmacist");
    expect(k).not.toContain("butcher_cashier");
  });

  test("a shop running two formats is offered both sets", () => {
    const k = keys(rolesForBusiness(roles, shop("pharmacy", "salon")));
    expect(k).toContain("pharmacist");
    expect(k).toContain("service_staff");
    expect(k).not.toContain("waiter");
  });

  test("a role someone already holds stays in the list", () => {
    const k = keys(rolesForBusiness(roles, shop("pharmacy"), ["id-waiter"]));
    expect(k).toContain("waiter");
    expect(k).not.toContain("kitchen_staff");
  });

  test("a shop of unknown format is not offered another format's jobs", () => {
    const offered = keys(rolesForBusiness(roles, null));
    expect(offered).toContain("cashier");
    expect(offered).toContain("custom_role");
    expect(offered).not.toContain("pharmacist");
    expect(offered).not.toContain("butcher_cashier");
    expect(offered).not.toContain("kitchen_staff");
    expect(keys(rolesForBusiness(roles, { profile: { storeTypes: [] } }))).not.toContain("waiter");
  });

  test("a mini mart and a mixed shop are not offered clinic, butchery, kitchen or salon jobs", () => {
    const catalog = [
      ...roles,
      ...["clinician", "nurse", "clinic_receptionist", "grocery_clerk", "supplier_trade_desk"].map((key) => ({
        id: `id-${key}`,
        key,
        name: key,
      })),
    ];
    for (const format of ["mini-mart", "mixed-shop"] as const) {
      const offered = keys(rolesForBusiness(catalog, shop(format)));
      expect(offered).toContain("cashier");
      expect(offered).toContain("manager");
      expect(offered).not.toContain("nurse");
      expect(offered).not.toContain("clinic_receptionist");
      expect(offered).not.toContain("clinician");
      expect(offered).not.toContain("butcher_cashier");
      expect(offered).not.toContain("pharmacist");
      expect(offered).not.toContain("kitchen_staff");
      expect(offered).not.toContain("waiter");
      expect(offered).not.toContain("service_staff");
      expect(offered).not.toContain("supplier_trade_desk");
    }
    expect(keys(rolesForBusiness(catalog, shop("mini-mart")))).toContain("grocery_clerk");
    expect(keys(rolesForBusiness(catalog, shop("mixed-shop")))).not.toContain("grocery_clerk");
  });

  test("a role is still gated when only its name came through", () => {
    const named = [
      { id: "n", key: "", name: "Nurse" },
      { id: "b", key: "", name: "Butcher Cashier" },
      { id: "c", key: "cashier", name: "Cashier" },
    ];
    const names = (format: string) =>
      rolesForBusiness(named, shop(format)).map((role) => role.name);
    expect(names("mini-mart")).toEqual(["Cashier"]);
    expect(names("clinic")).toEqual(["Nurse", "Cashier"]);
    expect(names("butchery")).toEqual(["Butcher Cashier", "Cashier"]);
  });

});

const catalog = [
  "owner", "admin", "manager", "viewer", "cashier", "stock_manager", "custom_role",
  "butcher_cashier", "grocery_clerk", "grocery_manager",
  "supplier_trade_desk", "supplier_catalogue", "supplier_accounts",
  "kitchen_staff", "waiter", "service_staff", "pharmacist",
  "clinician", "nurse", "clinic_receptionist",
].map((key) => ({ id: `id-${key}`, key }));

function offered(types: string[], flags?: Record<string, boolean>) {
  return new Set(
    keys(rolesForBusiness(catalog, { profile: { storeTypes: types }, featureFlags: flags })),
  );
}

function hides(got: Set<string>, ...hidden: string[]) {
  for (const key of hidden) expect(got.has(key)).toBe(false);
}

describe("roles offered per business format", () => {
  test("a shelf shop and a guest house get the till and the stock room, nothing specialised", () => {
    for (const format of ["mixed-shop", "cosmetics", "wines-spirits", "other", "lodging"]) {
      const got = offered([format]);
      expect(got.has("cashier")).toBe(true);
      expect(got.has("stock_manager")).toBe(true);
      hides(
        got,
        "butcher_cashier", "grocery_clerk", "waiter", "kitchen_staff", "service_staff",
        "pharmacist", "nurse", "clinician", "supplier_trade_desk",
      );
    }
  });

  test("grocery counters get a department head; a mixed shop does not", () => {
    for (const format of ["mini-mart", "full-grocery", "fresh-market"]) {
      const got = offered([format]);
      expect(got.has("grocery_clerk")).toBe(true);
      expect(got.has("grocery_manager")).toBe(true);
      hides(got, "waiter", "kitchen_staff", "nurse", "butcher_cashier", "pharmacist", "service_staff");
    }
    hides(offered(["mixed-shop"]), "grocery_clerk", "grocery_manager");
  });

  test("a café and a takeaway cook, and take payment at the counter", () => {
    for (const format of ["cafe", "fast-food"]) {
      const got = offered([format]);
      expect(got.has("kitchen_staff")).toBe(true);
      expect(got.has("cashier")).toBe(true);
      hides(got, "waiter", "service_staff", "pharmacist", "nurse", "butcher_cashier", "grocery_clerk");
    }
  });

  test("a restaurant and a bar also seat people, so they get a waiter", () => {
    for (const format of ["restaurant", "bar"]) {
      const got = offered([format]);
      expect(got.has("kitchen_staff")).toBe(true);
      expect(got.has("waiter")).toBe(true);
      hides(got, "service_staff", "pharmacist", "nurse", "grocery_clerk", "supplier_trade_desk");
    }
    const roomsAndBar = offered(["bar", "lodging"]);
    expect(roomsAndBar.has("waiter")).toBe(true);
    expect(roomsAndBar.has("kitchen_staff")).toBe(true);
    hides(roomsAndBar, "service_staff", "nurse");
  });

  test("a chair, a station or a treatment room gets service staff and a till, not a stock room", () => {
    for (const format of ["barbershop", "salon", "spa", "nail-studio", "beauty-parlour"]) {
      const got = offered([format]);
      expect(got.has("service_staff")).toBe(true);
      expect(got.has("cashier")).toBe(true);
      hides(got, "stock_manager", "waiter", "kitchen_staff", "nurse", "pharmacist", "butcher_cashier");
    }
    const salonShelf = offered(["salon", "mixed-shop"]);
    expect(salonShelf.has("service_staff")).toBe(true);
    expect(salonShelf.has("stock_manager")).toBe(true);
  });

  test("a butchery, a chemist and a clinic each keep their own counter", () => {
    const butchery = offered(["butchery"]);
    expect(butchery.has("butcher_cashier")).toBe(true);
    hides(butchery, "grocery_clerk", "waiter", "nurse", "pharmacist", "service_staff");

    const chemist = offered(["pharmacy"]);
    expect(chemist.has("pharmacist")).toBe(true);
    hides(chemist, "clinician", "nurse", "clinic_receptionist", "service_staff", "waiter");

    const clinic = offered(["clinic"]);
    expect(clinic.has("clinician")).toBe(true);
    expect(clinic.has("nurse")).toBe(true);
    expect(clinic.has("clinic_receptionist")).toBe(true);
    hides(clinic, "pharmacist", "service_staff", "waiter", "kitchen_staff", "butcher_cashier");
  });

  test("a wholesale desk has trade roles and stock, and a till only once it sells over the counter", () => {
    const wholesale = offered(["supplier", "other"]);
    expect(wholesale.has("supplier_trade_desk")).toBe(true);
    expect(wholesale.has("supplier_catalogue")).toBe(true);
    expect(wholesale.has("supplier_accounts")).toBe(true);
    expect(wholesale.has("stock_manager")).toBe(true);
    hides(wholesale, "cashier", "grocery_clerk", "waiter", "kitchen_staff", "pharmacist", "nurse");

    const counter = offered(["supplier", "other"], { "supplier.counter_orders": true });
    expect(counter.has("cashier")).toBe(true);
    expect(counter.has("grocery_clerk")).toBe(true);
    expect(counter.has("supplier_trade_desk")).toBe(true);
  });
});
