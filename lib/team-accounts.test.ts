import { describe, expect, test } from "bun:test";

import { accountEmailLabel, accountHandle, isNoSignInEmail } from "./team-accounts";

describe("accounts with no sign-in", () => {
  test("the placeholder address is recognised, whatever its case", () => {
    expect(isNoSignInEmail("staff.9f2c1a7b4d6e8f01@team.invalid")).toBe(true);
    expect(isNoSignInEmail(" Staff.ABC@TEAM.INVALID ")).toBe(true);
    expect(isNoSignInEmail("mike@salon.test")).toBe(false);
    expect(isNoSignInEmail("team.invalid@salon.test")).toBe(false);
    expect(isNoSignInEmail(null)).toBe(false);
  });

  test("the placeholder is never shown: the list says there is no sign-in yet", () => {
    expect(accountEmailLabel("staff.9f2c1a7b4d6e8f01@team.invalid")).toBe("No sign-in yet");
    expect(accountEmailLabel("mike@salon.test")).toBe("mike@salon.test");
  });

  test("buttons name such a person by name, others by address", () => {
    expect(accountHandle({ name: "Mike", email: "staff.9f2c@team.invalid" })).toBe("Mike");
    expect(accountHandle({ name: "Lenah", email: "lenah@salon.test" })).toBe("lenah@salon.test");
    expect(accountHandle({ name: " ", email: "staff.9f2c@team.invalid" })).toBe("this person");
  });
});
