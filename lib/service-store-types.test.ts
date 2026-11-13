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
      expect(Object.keys(service).sort()).toEqual(["durationMinutes", "name"]);
    }
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
