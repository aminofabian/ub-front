import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

import type { OnboardingQuestionnaireAnswers } from "@/lib/onboarding-questionnaire";

type MenuItem = {
  id: string;
  name: string;
  kind: string;
  price: number | null;
  stationId: string | null;
  sortOrder: number;
};

const shop = {
  stations: [] as { id: string; name: string }[],
  items: [] as MenuItem[],
  patches: 0,
  failMenu: false,
  tables: [] as { branchId: string; name: string }[],
  failTables: false,
  pictures: [] as { id: string; name: string }[],
  failPictures: false,
};

mock.module("@/lib/api", () => ({
  fetchBranches: async () => [
    { id: "branch-1", name: "Mirema branch", active: true },
  ],
  patchBranch: async () => undefined,
  createBranch: async () => undefined,
  updateBusiness: async () => undefined,
  fetchItemTypes: async () => [],
  createItemType: async () => undefined,
  updateMyBranding: async () => undefined,
  updateMe: async () => undefined,
  fetchOnboardingState: async () => ({ status: "pending", step: 1 }),
  patchOnboardingState: async () => {
    shop.patches += 1;
    return { status: "active", step: 8 };
  },
  uploadMyBrandingLogo: async () => undefined,
  uploadMyBrandingLogoDark: async () => undefined,
  uploadMyBrandingLogoPair: async () => undefined,
  uploadMyBrandingFavicon: async () => undefined,
  uploadMyBrandingOgImage: async () => undefined,
  uploadMyBrandingAssetKit: async () => undefined,
  uploadMyBrandingAppIcon: async () => undefined,
}));

mock.module("@/lib/restaurant-api", () => ({
  fetchTables: async (branchId: string) => {
    if (shop.failTables) {
      throw new Error("Tables are not available.");
    }
    return shop.tables.filter((table) => table.branchId === branchId);
  },
  createTable: async (body: { branchId: string; name: string }) => {
    shop.tables.push({ branchId: body.branchId, name: body.name });
    return { id: `table-${shop.tables.length}`, ...body };
  },
  fetchMenu: async () => {
    if (shop.failMenu) {
      throw new Error("The restaurant is switched off for this shop.");
    }
    return {
      categories: [],
      items: shop.items,
      modifierGroups: [],
      stations: shop.stations,
    };
  },
  createStation: async (name: string) => {
    const station = { id: `station-${shop.stations.length + 1}`, name };
    shop.stations.push(station);
    return station;
  },
  createMenuItem: async (body: {
    name: string;
    kind: string;
    price: number;
    stationId: string | null;
    sortOrder: number;
  }) => {
    const item: MenuItem = {
      id: `item-${shop.items.length + 1}`,
      name: body.name,
      kind: body.kind,
      price: body.price,
      stationId: body.stationId,
      sortOrder: body.sortOrder,
    };
    shop.items.push(item);
    return item;
  },
  setMenuItemPicture: async (id: string, file: File) => {
    if (shop.failPictures) {
      throw new Error("The picture was refused.");
    }
    const item = shop.items.find((row) => row.id === id);
    shop.pictures.push({ id, name: file.name });
    return item;
  },
}));

const { applyOnboardingQuestionnaire } = await import(
  "@/lib/onboarding-questionnaire-apply"
);

const foodAnswers: OnboardingQuestionnaireAnswers = {
  branchCount: "1",
  branchLocalities: ["Mirema"],
  storeTypes: ["restaurant"],
  selectedDepartments: [],
  onlineStore: "no",
  storeThemeId: "store-theme",
  landingTemplateId: "landing-template",
  displayName: "Mirema Kitchen",
  primaryColor: "#0D9488",
  accentColor: "#5EEAD4",
  ownerPhone: "0712345678",
  foodStations: ["Kitchen", "Grill"],
  foodMenuItems: [
    { name: "Chips", price: "250" },
    { name: "Soda", price: "70" },
  ],
  sellsProducts: false,
};

describe("food setup writes the kitchen and first dishes", () => {
  beforeEach(() => {
    shop.stations.length = 0;
    shop.items.length = 0;
    shop.patches = 0;
    shop.failMenu = false;
    shop.tables.length = 0;
    shop.failTables = false;
    shop.pictures.length = 0;
    shop.failPictures = false;
  });

  afterAll(() => {
    mock.restore();
  });

  it("creates the stations and dishes, priced and sent to the first station", async () => {
    const result = await applyOnboardingQuestionnaire(foodAnswers, {
      business: null,
    });

    expect(result.completed).toBe(true);
    expect(
      result.phases.some(
        (phase) => phase.phase === "restaurant" && phase.status === "done",
      ),
    ).toBe(true);
    expect(shop.stations.map((station) => station.name)).toEqual([
      "Kitchen",
      "Grill",
    ]);
    expect(shop.items).toHaveLength(2);
    expect(shop.items[0]).toMatchObject({
      name: "Chips",
      kind: "DISH",
      price: 250,
      stationId: "station-1",
      sortOrder: 0,
    });
    expect(shop.items[1]).toMatchObject({
      name: "Soda",
      price: 70,
      stationId: "station-1",
      sortOrder: 1,
    });
  });

  it("uploads a picture onto the dish it belongs to, and still finishes if that fails", async () => {
    const chips = new File(["a"], "chips.jpg", { type: "image/jpeg" });
    const withPicture = {
      ...foodAnswers,
    };

    const saved = await applyOnboardingQuestionnaire(withPicture, {
      business: null,
      foodMenuPictures: [{ name: "Chips", file: chips }],
    });

    expect(saved.completed).toBe(true);
    expect(saved.warnings).toHaveLength(0);
    expect(shop.pictures).toEqual([{ id: "item-1", name: "chips.jpg" }]);

    shop.failPictures = true;
    const again = await applyOnboardingQuestionnaire(withPicture, {
      business: null,
      foodMenuPictures: [{ name: "Chips", file: chips }],
    });

    expect(again.completed).toBe(true);
    expect(again.warnings.join(" ")).toContain("Chips was saved without its picture");
    expect(shop.items.map((item) => item.name)).toEqual(["Chips", "Soda"]);
  });

  it("a retry after the same answers creates nothing twice", async () => {
    await applyOnboardingQuestionnaire(foodAnswers, { business: null });
    await applyOnboardingQuestionnaire(foodAnswers, { business: null });

    expect(shop.stations.map((station) => station.name)).toEqual([
      "Kitchen",
      "Grill",
    ]);
    expect(shop.items.map((item) => item.name)).toEqual(["Chips", "Soda"]);
  });

  it("on a retry, dishes go to the first station the owner named", async () => {
    // A previous attempt created both stations; the server lists them alphabetically.
    shop.stations.push(
      { id: "station-1", name: "Bar" },
      { id: "station-2", name: "Kitchen" },
    );

    await applyOnboardingQuestionnaire(foodAnswers, { business: null });

    expect(shop.items.map((item) => item.stationId)).toEqual([
      "station-2",
      "station-2",
    ]);
  });

  it("sets up the tables a restaurant asked for at its first location, once", async () => {
    const answers = { ...foodAnswers, foodTableCount: 3 };

    await applyOnboardingQuestionnaire(answers, { business: null });
    // A retry (the phone step failing, say) must not add them again.
    const again = await applyOnboardingQuestionnaire(answers, { business: null });

    expect(again.completed).toBe(true);
    expect(again.warnings).toHaveLength(0);
    expect(shop.tables).toEqual([
      { branchId: "branch-1", name: "Table 1" },
      { branchId: "branch-1", name: "Table 2" },
      { branchId: "branch-1", name: "Table 3" },
    ]);
  });

  it("keeps a table the owner already has and adds only the missing ones", async () => {
    shop.tables.push({ branchId: "branch-1", name: "table 2" });

    await applyOnboardingQuestionnaire(
      { ...foodAnswers, foodTableCount: 3 },
      { business: null },
    );

    expect(shop.tables.map((table) => table.name)).toEqual([
      "table 2",
      "Table 1",
      "Table 3",
    ]);
  });

  it("makes no tables for zero, for no answer, or for a café with a stale count", async () => {
    await applyOnboardingQuestionnaire(
      { ...foodAnswers, foodTableCount: 0 },
      { business: null },
    );
    await applyOnboardingQuestionnaire(foodAnswers, { business: null });
    await applyOnboardingQuestionnaire(
      { ...foodAnswers, storeTypes: ["cafe"], foodTableCount: 8 },
      { business: null },
    );

    expect(shop.tables).toHaveLength(0);
  });

  it("a refused table becomes a warning and the kitchen and dishes are still set up", async () => {
    shop.failTables = true;

    const result = await applyOnboardingQuestionnaire(
      { ...foodAnswers, foodTableCount: 4 },
      { business: null },
    );

    expect(result.completed).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Floor");
    expect(shop.tables).toHaveLength(0);
    expect(shop.stations).toHaveLength(2);
    expect(shop.items).toHaveLength(2);
  });

  it("a refused menu endpoint becomes a warning, not a failed setup", async () => {
    shop.failMenu = true;

    const result = await applyOnboardingQuestionnaire(foodAnswers, {
      business: null,
    });

    expect(result.completed).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("switched off");
    expect(
      result.phases.some(
        (phase) => phase.phase === "restaurant" && phase.status === "skipped",
      ),
    ).toBe(true);
    expect(shop.stations).toHaveLength(0);
    expect(shop.items).toHaveLength(0);
  });

  it("survives a resume where the empty section list was dropped by the API", async () => {
    const resumed = {
      ...foodAnswers,
      selectedDepartments: undefined as unknown as string[],
    };

    const result = await applyOnboardingQuestionnaire(resumed, {
      business: null,
    });

    expect(result.completed).toBe(true);
    expect(shop.stations.map((station) => station.name)).toEqual([
      "Kitchen",
      "Grill",
    ]);
  });

  it("leaves a retail shop alone even if food answers were left behind", async () => {
    const result = await applyOnboardingQuestionnaire(
      { ...foodAnswers, storeTypes: ["mini-mart"] },
      { business: null },
    );

    expect(result.completed).toBe(true);
    expect(
      result.phases.some(
        (phase) => phase.phase === "restaurant" && phase.status === "skipped",
      ),
    ).toBe(true);
    expect(shop.stations).toHaveLength(0);
    expect(shop.items).toHaveLength(0);
  });
});
