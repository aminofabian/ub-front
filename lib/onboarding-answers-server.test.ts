import { describe, expect, test } from "bun:test";

import { onboardingAnswersForServer } from "./onboarding-questionnaire";

describe("answers sent to the onboarding API", () => {
  test("dish prices go as numbers and half-typed rows are left out", () => {
    const answers = onboardingAnswersForServer({
      storeTypes: ["restaurant"],
      foodMenuItems: [
        { name: " Chips ", price: "1,250" },
        { name: "Soda", price: "70" },
        { name: "No price yet", price: "" },
        { name: "  ", price: "100" },
        { name: "Nonsense", price: "abc" },
      ],
    });

    expect(answers.foodMenuItems).toEqual([
      { name: "Chips", price: 1250 },
      { name: "Soda", price: 70 },
    ]);
  });

  test("a shop without food answers is sent unchanged", () => {
    const answers = onboardingAnswersForServer({
      storeTypes: ["mini-mart"],
      selectedDepartments: ["Drinks"],
    });

    expect(answers).toEqual({
      storeTypes: ["mini-mart"],
      selectedDepartments: ["Drinks"],
    });
    expect("foodMenuItems" in answers).toBe(false);
  });
});
