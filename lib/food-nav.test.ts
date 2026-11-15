import { describe, expect, test } from "bun:test";

import { APP_ROUTES } from "./config";
import { trimNavForFoodOnly } from "./food-nav";

const section = (id: string, hrefs: string[], entryHref = hrefs[0]!) => ({
  id,
  entryHref,
  items: hrefs.map((href) => ({ href, label: href })),
});

const RESTAURANT = [
  APP_ROUTES.restaurantFloor,
  APP_ROUTES.restaurantCounter,
  APP_ROUTES.restaurantKitchen,
  APP_ROUTES.restaurantMenu,
  APP_ROUTES.restaurantReports,
];

const FULL = [
  section("overview", [APP_ROUTES.business]),
  section("org", [APP_ROUTES.businessSettings, APP_ROUTES.businessMobile, APP_ROUTES.users]),
  section("catalog", [APP_ROUTES.products, APP_ROUTES.priceTags, APP_ROUTES.aisles]),
  section("restaurant", RESTAURANT, APP_ROUTES.restaurantCounter),
  section("procurement", [APP_ROUTES.order]),
  section("inventory", [APP_ROUTES.inventoryStock]),
  section("store", [APP_ROUTES.store]),
  section("ops", [APP_ROUTES.shifts, APP_ROUTES.pricing, APP_ROUTES.discounts], APP_ROUTES.pricing),
  section("payments", [APP_ROUTES.paymentsDayLedger, APP_ROUTES.airtime, APP_ROUTES.onlineAirtime]),
  section("customers", [APP_ROUTES.customers, APP_ROUTES.analyticsCustomers]),
  section("credits", [APP_ROUTES.creditsOnTab]),
  section("sales", [APP_ROUTES.sales, APP_ROUTES.salesQuick, APP_ROUTES.salesPendingCarts]),
];

describe("trimNavForFoodOnly", () => {
  test("a shop that is not food-only keeps every section and every page", () => {
    expect(trimNavForFoodOnly(FULL, false, false)).toEqual(FULL);
    expect(trimNavForFoodOnly(FULL, false, true)).toEqual(FULL);
  });

  test("a food-only shop loses the shelf sections and gets Restaurant second", () => {
    const ids = trimNavForFoodOnly(FULL, true, false).map((s) => s.id);
    expect(ids).toEqual(["overview", "restaurant", "org", "procurement", "inventory", "ops", "payments", "customers", "sales"]);
  });

  test("shelf pages go from the sections that stay, and the rest is kept", () => {
    const trimmed = trimNavForFoodOnly(FULL, true, false);
    const hrefs = (id: string) => trimmed.find((s) => s.id === id)!.items.map((i) => i.href);
    expect(hrefs("org")).toEqual([APP_ROUTES.businessSettings, APP_ROUTES.users]);
    expect(hrefs("ops")).toEqual([APP_ROUTES.shifts]);
    expect(hrefs("payments")).toEqual([APP_ROUTES.paymentsDayLedger]);
    expect(hrefs("customers")).toEqual([APP_ROUTES.customers]);
    expect(hrefs("sales")).toEqual([APP_ROUTES.sales]);
    // A kitchen still buys and counts.
    expect(hrefs("procurement")).toEqual([APP_ROUTES.order]);
    expect(hrefs("inventory")).toEqual([APP_ROUTES.inventoryStock]);
  });

  test("a section whose entry page was hidden opens on the first page left", () => {
    const ops = trimNavForFoodOnly(FULL, true, false).find((s) => s.id === "ops")!;
    expect(ops.entryHref).toBe(APP_ROUTES.shifts);
  });

  test("the product list moves under Restaurant, before the report, only for someone who could open it", () => {
    const restaurant = trimNavForFoodOnly(FULL, true, false).find((s) => s.id === "restaurant")!;
    expect(restaurant.items.map((i) => i.href)).toEqual([
      APP_ROUTES.restaurantFloor,
      APP_ROUTES.restaurantCounter,
      APP_ROUTES.restaurantKitchen,
      APP_ROUTES.restaurantMenu,
      APP_ROUTES.products,
      APP_ROUTES.restaurantReports,
    ]);
    expect((restaurant.items as { group?: string }[]).map((i) => i.group)).toEqual([
      "Service",
      "Service",
      "Service",
      "Your menu",
      "Your menu",
      "Your menu",
    ]);

    const noCatalog = FULL.filter((s) => s.id !== "catalog");
    const cook = trimNavForFoodOnly(noCatalog, true, false).find((s) => s.id === "restaurant")!;
    expect(cook.items.map((i) => i.href)).toEqual(RESTAURANT);
  });

  test("a restaurant or bar opens on the floor, a café or counter on the counter", () => {
    const entry = (tableService: boolean) =>
      trimNavForFoodOnly(FULL, true, tableService).find((s) => s.id === "restaurant")!.entryHref;
    expect(entry(true)).toBe(APP_ROUTES.restaurantFloor);
    expect(entry(false)).toBe(APP_ROUTES.restaurantCounter);
  });

  test("a waiter who has only the floor and the kitchen still gets a section that opens", () => {
    const waiter = [section("restaurant", [APP_ROUTES.restaurantFloor, APP_ROUTES.restaurantKitchen], APP_ROUTES.restaurantCounter)];
    const trimmed = trimNavForFoodOnly(waiter, true, false);
    expect(trimmed[0]!.entryHref).toBe(APP_ROUTES.restaurantFloor);
  });
});
