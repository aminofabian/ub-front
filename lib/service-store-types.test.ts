import { describe, expect, test } from "bun:test";

import {
  CATALOG_ELIGIBLE_STORE_TYPES,
  SERVICE_STORE_TYPES,
  getBusinessStoreTypes,
  isGroceryOperationsBusiness,
  isServiceBusiness,
  isServiceOnlyBusiness,
  serviceStationLabel,
} from "./business-store-type";
import { starterServicesForStoreTypes } from "./service-starter-kits";

const business = (storeTypes: string[]) => ({ profile: { storeTypes } });

describe("service store types", () => {
  test("a kinyozi is a service business", () => {
    expect(isServiceBusiness(business(["barbershop"]))).toBe(true);
    expect(getBusinessStoreTypes(business(["barbershop"]))).toEqual(["barbershop"]);
  });

  test("a mixed salon that sells cosmetics is both", () => {
    const mixed = business(["cosmetics", "salon"]);
    expect(isServiceBusiness(mixed)).toBe(true);
    expect(getBusinessStoreTypes(mixed)).toEqual(["cosmetics", "salon"]);
  });

  test("retail shops are not service businesses", () => {
    expect(isServiceBusiness(business(["mini-mart", "butchery"]))).toBe(false);
    expect(isServiceBusiness(business([]))).toBe(false);
    expect(isServiceBusiness(null)).toBe(false);
  });

  test("service types do not unlock the grocery counter or the starter catalogue", () => {
    expect(isGroceryOperationsBusiness(business(["barbershop"]))).toBe(false);
    for (const type of SERVICE_STORE_TYPES) {
      expect(CATALOG_ELIGIBLE_STORE_TYPES).not.toContain(type);
    }
  });

  test("legacy single storeType and onboarding answers still resolve", () => {
    expect(isServiceBusiness({ profile: { storeType: "spa" } })).toBe(true);
    expect(
      isServiceBusiness({ onboarding: { answers: { storeTypes: ["nail-studio"] } } }),
    ).toBe(true);
  });

  test("service-only means no retail format at all", () => {
    expect(isServiceOnlyBusiness(business(["barbershop"]))).toBe(true);
    expect(isServiceOnlyBusiness(business(["salon", "spa"]))).toBe(true);
    expect(isServiceOnlyBusiness(business(["salon", "cosmetics"]))).toBe(false);
    expect(isServiceOnlyBusiness(business(["mini-mart"]))).toBe(false);
    expect(isServiceOnlyBusiness(business([]))).toBe(false);
  });

  test("a seat is named for the shop", () => {
    expect(serviceStationLabel(business(["barbershop"]))).toBe("Chair");
    expect(serviceStationLabel(business(["spa"]))).toBe("Room");
    expect(serviceStationLabel(business(["nail-studio"]))).toBe("Station");
    expect(serviceStationLabel(business(["salon", "spa"]))).toBe("Chair");
  });
});

describe("starter services", () => {
  test("a kinyozi gets a starter list with durations and no prices", () => {
    const list = starterServicesForStoreTypes(["barbershop"]);
    expect(list.length).toBeGreaterThan(3);
    for (const service of list) {
      expect(service.durationMinutes).toBeGreaterThan(0);
      // Never a price: the shop types its own.
      expect(Object.keys(service).sort()).toEqual(["durationMinutes", "name", "storeType"]);
    }
  });

  test("every service format has its own starter list", () => {
    for (const type of SERVICE_STORE_TYPES) {
      const list = starterServicesForStoreTypes([type]);
      expect(list.length).toBeGreaterThan(3);
      expect(list.every((s) => s.storeType === type)).toBe(true);
    }
  });

  test("a shop that is a kinyozi, a salon, a spa and a nail studio sees all four lists", () => {
    const list = starterServicesForStoreTypes(["barbershop", "salon", "spa", "nail-studio"]);
    const names = list.map((s) => s.name);
    expect(names).toContain("Haircut");
    expect(names).toContain("Box braids");
    expect(names).toContain("Full body massage");
    expect(names).toContain("Gel polish");
    // A service two formats share is offered once, under the first.
    expect(names.filter((n) => n === "Hair colouring")).toHaveLength(1);
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length);
  });

  test("retail types and unknown values get nothing", () => {
    expect(starterServicesForStoreTypes(["mini-mart", "not-a-type"])).toEqual([]);
    expect(starterServicesForStoreTypes(null)).toEqual([]);
  });

  test("names are not duplicated across formats", () => {
    const list = starterServicesForStoreTypes(["barbershop", "barbershop"]);
    const names = list.map((s) => s.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});
