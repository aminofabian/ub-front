import { describe, expect, test } from "bun:test";

import { APP_ROUTES } from "./config";
import { isServiceCashier, serviceCashierMayOpen, trimNavForServiceOnly } from "./service-nav";

const section = (id: string, hrefs: string[], entryHref = hrefs[0]!) => ({
  id,
  entryHref,
  items: hrefs.map((href) => ({ href, label: href })),
});

const FULL = [
  section("overview", [APP_ROUTES.business]),
  section("org", [APP_ROUTES.businessSettings, APP_ROUTES.businessMobile, APP_ROUTES.users, APP_ROUTES.businessImport]),
  section("catalog", [APP_ROUTES.products, APP_ROUTES.categories]),
  section("services", [APP_ROUTES.servicesFloor, APP_ROUTES.services, APP_ROUTES.commissions], APP_ROUTES.services),
  section("procurement", [APP_ROUTES.order]),
  section("inventory", [APP_ROUTES.inventoryStock]),
  section("store", [APP_ROUTES.store]),
  section("ops", [APP_ROUTES.shifts, APP_ROUTES.pricing, APP_ROUTES.discounts], APP_ROUTES.pricing),
  section("payments", [APP_ROUTES.paymentsDayLedger, APP_ROUTES.airtime]),
  section("credits", [APP_ROUTES.creditsOnTab]),
  section("sales", [APP_ROUTES.sales, APP_ROUTES.salesQuick, APP_ROUTES.cashier]),
];

describe("trimNavForServiceOnly", () => {
  test("a shop that sells goods keeps every section and every page", () => {
    expect(trimNavForServiceOnly(FULL, false)).toEqual(FULL);
  });

  test("a service-only shop loses the shelf sections and gets Services second", () => {
    const ids = trimNavForServiceOnly(FULL, true).map((s) => s.id);
    expect(ids).toEqual(["overview", "services", "org", "ops", "payments", "sales"]);
  });

  test("shelf pages go from the sections that stay, and the rest is kept", () => {
    const trimmed = trimNavForServiceOnly(FULL, true);
    const hrefs = (id: string) => trimmed.find((s) => s.id === id)!.items.map((i) => i.href);
    expect(hrefs("org")).toEqual([APP_ROUTES.businessSettings, APP_ROUTES.users]);
    expect(hrefs("ops")).toEqual([APP_ROUTES.shifts]);
    expect(hrefs("payments")).toEqual([APP_ROUTES.paymentsDayLedger]);
    expect(hrefs("sales")).toEqual([APP_ROUTES.sales, APP_ROUTES.cashier]);
  });

  test("a section whose entry page was removed opens on its first remaining page", () => {
    const ops = trimNavForServiceOnly(FULL, true).find((s) => s.id === "ops")!;
    expect(ops.entryHref).toBe(APP_ROUTES.shifts);
  });

  test("the products and stock pages move under Services, only when the person could open them", () => {
    const services = trimNavForServiceOnly(FULL, true).find((s) => s.id === "services")!;
    expect(services.items.map((i) => i.href)).toEqual([
      APP_ROUTES.servicesFloor,
      APP_ROUTES.services,
      APP_ROUTES.commissions,
      APP_ROUTES.products,
      APP_ROUTES.inventoryStock,
    ]);
    expect(services.items[0]!.group).toBe("Today");
    expect(services.items[3]!.group).toBe("Products on the shelf");

    // A barber who may not see products or stock gets neither.
    const noShelf = FULL.filter((s) => s.id !== "catalog" && s.id !== "inventory");
    const without = trimNavForServiceOnly(noShelf, true).find((s) => s.id === "services")!;
    expect(without.items.map((i) => i.href)).toEqual([APP_ROUTES.servicesFloor, APP_ROUTES.services, APP_ROUTES.commissions]);
  });

  test("a section left with nothing is dropped", () => {
    const only = [section("ops", [APP_ROUTES.pricing, APP_ROUTES.discounts])];
    expect(trimNavForServiceOnly(only, true)).toEqual([]);
  });

  test("the Setup menu is regrouped by what the owner is doing, keeping every page it had", () => {
    const setup = [
      section("org", [
        APP_ROUTES.business,
        APP_ROUTES.businessSettings,
        APP_ROUTES.paymentsSettings,
        APP_ROUTES.businessConfiguration,
        APP_ROUTES.businessBranding,
        APP_ROUTES.businessThemes,
        APP_ROUTES.businessMobile,
        APP_ROUTES.users,
        APP_ROUTES.payroll,
        APP_ROUTES.inbox,
        APP_ROUTES.support,
        APP_ROUTES.businessLogs,
        "/some/new/page",
      ]),
    ];
    const items = trimNavForServiceOnly(setup, true)[0]!.items;
    expect(items.map((i) => [i.group, i.href])).toEqual([
      ["Your shop", APP_ROUTES.business],
      ["Your shop", APP_ROUTES.businessSettings],
      ["Your shop", APP_ROUTES.businessConfiguration],
      ["Your page online", APP_ROUTES.businessBranding],
      ["Your page online", APP_ROUTES.businessThemes],
      ["Your people", APP_ROUTES.users],
      ["Your people", APP_ROUTES.payroll],
      ["Getting paid", APP_ROUTES.paymentsSettings],
      ["Talking to customers", APP_ROUTES.inbox],
      ["Talking to customers", APP_ROUTES.support],
      ["Records", APP_ROUTES.businessLogs],
      // A page this file has not heard of is kept, at the end, rather than lost.
      [undefined, "/some/new/page"],
    ]);
  });
});

describe("a cashier in a service-only shop", () => {
  test("is a cashier, in a shop with no shelves", () => {
    expect(isServiceCashier("cashier", true)).toBe(true);
    expect(isServiceCashier(" Cashier ", true)).toBe(true);
    // The same role in a shop that sells goods keeps what it had.
    expect(isServiceCashier("cashier", false)).toBe(false);
    expect(isServiceCashier("owner", true)).toBe(false);
    expect(isServiceCashier("service_staff", true)).toBe(false);
    expect(isServiceCashier(null, true)).toBe(false);
  });

  test("may open the till and their profile, and nothing else", () => {
    expect(serviceCashierMayOpen(APP_ROUTES.cashier)).toBe(true);
    expect(serviceCashierMayOpen(`${APP_ROUTES.cashier}?activate=first-sale`)).toBe(true);
    expect(serviceCashierMayOpen(`${APP_ROUTES.cashier}/`)).toBe(true);
    expect(serviceCashierMayOpen(APP_ROUTES.myProfile)).toBe(true);
    for (const closed of [
      APP_ROUTES.business,
      APP_ROUTES.shifts,
      APP_ROUTES.servicesFloor,
      APP_ROUTES.servicesSell,
      APP_ROUTES.servicesAppointments,
      APP_ROUTES.commissions,
      APP_ROUTES.sales,
      APP_ROUTES.users,
      // A page whose address merely starts with the till's is not the till.
      `${APP_ROUTES.cashier}-reports`,
    ]) {
      expect(serviceCashierMayOpen(closed)).toBe(false);
    }
  });
});
