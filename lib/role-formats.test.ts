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

  test("a shop of unknown format is offered every role", () => {
    expect(rolesForBusiness(roles, null)).toHaveLength(roles.length);
    expect(rolesForBusiness(roles, { profile: { storeTypes: [] } })).toHaveLength(roles.length);
  });
});
