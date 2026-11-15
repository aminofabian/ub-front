import { describe, expect, test } from "bun:test";

import { COUNTER_VOICES, defaultFoodTillLights, foodTillKind, nairobiClock, nairobiHour, readFoodTillLights } from "./food-till";

describe("foodTillKind", () => {
  test("a bar that serves food is run from the bar; otherwise the fullest house wins", () => {
    expect(foodTillKind(["restaurant", "bar"])).toBe("bar");
    expect(foodTillKind(["cafe", "restaurant"])).toBe("restaurant");
    expect(foodTillKind(["cafe"])).toBe("cafe");
    expect(foodTillKind(["fast-food"])).toBe("takeaway");
    expect(foodTillKind([" Bar "])).toBe("bar");
    expect(foodTillKind(null)).toBe("restaurant");
  });
});

describe("lights", () => {
  test("a bar starts low at any hour; others follow the sun in Nairobi", () => {
    expect(defaultFoodTillLights("bar", 11)).toBe("night");
    expect(defaultFoodTillLights("restaurant", 11)).toBe("day");
    expect(defaultFoodTillLights("restaurant", 19)).toBe("night");
    expect(defaultFoodTillLights("cafe", 5)).toBe("night");
    expect(defaultFoodTillLights("cafe", 6)).toBe("day");
  });

  test("only a real saved choice is kept", () => {
    expect(readFoodTillLights("night")).toBe("night");
    expect(readFoodTillLights("dusk")).toBeNull();
    expect(readFoodTillLights(null)).toBeNull();
  });

  test("the clock is Nairobi's, three hours ahead of UTC with no summer time", () => {
    const lateUtc = new Date(Date.UTC(2026, 10, 15, 22, 5));
    expect(nairobiHour(lateUtc)).toBe(1);
    expect(nairobiClock(lateUtc)).toBe("01:05");
    expect(nairobiClock(new Date(Date.UTC(2026, 5, 1, 9, 30)))).toBe("12:30");
  });
});

describe("voices", () => {
  test("every house has every line, and the bar speaks of rounds", () => {
    for (const voice of Object.values(COUNTER_VOICES)) {
      for (const line of Object.values(voice)) expect(line.trim().length).toBeGreaterThan(3);
    }
    expect(COUNTER_VOICES.bar.order).toBe("This round");
    expect(COUNTER_VOICES.bar.sent).toContain("The bar has it");
  });
});
