import { describe, expect, test } from "bun:test";

import {
  draftsToPayload,
  groupsToDrafts,
  minutesInWords,
  missingOptionGroup,
  optionsExtra,
  stillOffered,
  toggleOption,
  type ServiceOptionGroup,
} from "./service-options";

const groups: ServiceOptionGroup[] = [
  {
    id: "len",
    name: "Hair length",
    required: true,
    multiple: false,
    options: [
      { id: "short", name: "Short", priceDelta: 0, extraMinutes: 0 },
      { id: "long", name: "Long", priceDelta: 500, extraMinutes: 60 },
    ],
  },
  {
    id: "style",
    name: "Finish",
    required: false,
    multiple: false,
    options: [{ id: "curl", name: "Curled ends", priceDelta: 150.5, extraMinutes: 10 }],
  },
  {
    id: "extras",
    name: "Extras",
    required: false,
    multiple: true,
    options: [
      { id: "packs", name: "Extra packs", priceDelta: 300, extraMinutes: 0 },
      { id: "wash", name: "Wash first", priceDelta: 200, extraMinutes: 15 },
    ],
  },
];

describe("choosing options", () => {
  test("a pick-one group keeps one choice", () => {
    expect(toggleOption(groups, ["short"], "long")).toEqual(["long"]);
  });

  test("a group that must be chosen cannot be cleared by tapping again", () => {
    expect(toggleOption(groups, ["long"], "long")).toEqual(["long"]);
  });

  test("an optional pick-one group clears on a second tap", () => {
    expect(toggleOption(groups, ["long", "curl"], "curl")).toEqual(["long"]);
  });

  test("extras switch on and off and keep the service's order", () => {
    expect(toggleOption(groups, ["wash"], "packs")).toEqual(["packs", "wash"]);
    expect(toggleOption(groups, ["packs", "wash"], "packs")).toEqual(["wash"]);
  });

  test("an unknown option changes nothing", () => {
    expect(toggleOption(groups, ["long"], "gone")).toEqual(["long"]);
  });

  test("price and time add up, to the cent", () => {
    expect(optionsExtra(groups, ["long", "curl", "wash"])).toEqual({ price: 850.5, minutes: 85 });
    expect(optionsExtra(groups, [])).toEqual({ price: 0, minutes: 0 });
  });

  test("a required group with nothing chosen is named", () => {
    expect(missingOptionGroup(groups, ["packs"])).toBe("Hair length");
    expect(missingOptionGroup(groups, ["short"])).toBeNull();
  });

  test("choices the service no longer offers drop out", () => {
    expect(stillOffered(groups, ["gone", "wash", "long"])).toEqual(["long", "wash"]);
  });

  test("minutes read as hours once past the hour", () => {
    expect(minutesInWords(45)).toBe("45 min");
    expect(minutesInWords(120)).toBe("2 h");
    expect(minutesInWords(195)).toBe("3 h 15 min");
  });
});

describe("editing options", () => {
  test("what was saved comes back unchanged", () => {
    const out = draftsToPayload(groupsToDrafts(groups));
    expect("groups" in out && out.groups).toEqual(groups);
  });

  test("empty price and minutes mean nothing is added", () => {
    const out = draftsToPayload([
      { name: " Length ", required: true, multiple: false, options: [{ name: " Short ", price: "", minutes: "" }] },
    ]);
    expect(out).toEqual({
      groups: [
        { name: "Length", required: true, multiple: false, options: [{ name: "Short", priceDelta: 0, extraMinutes: 0 }] },
      ],
    });
  });

  test.each([
    [[{ name: "", required: false, multiple: false, options: [{ name: "A", price: "", minutes: "" }] }], "Give every group a name"],
    [[{ name: "Length", required: false, multiple: false, options: [] }], "Add at least one choice under Length"],
    [
      [{ name: "Length", required: false, multiple: false, options: [{ name: "Long", price: "", minutes: "" }, { name: "long", price: "", minutes: "" }] }],
      "listed twice under Length",
    ],
    [[{ name: "Length", required: false, multiple: false, options: [{ name: "Long", price: "-5", minutes: "" }] }], "adds to the price"],
    [[{ name: "Length", required: false, multiple: false, options: [{ name: "Long", price: "", minutes: "1.5" }] }], "minutes Long adds"],
    [[{ name: "Length", required: false, multiple: false, options: [{ name: "Long", price: "", minutes: "601" }] }], "minutes Long adds"],
  ])("a bad draft is refused in words", (drafts, expected) => {
    const out = draftsToPayload(drafts);
    expect("error" in out && out.error).toContain(expected);
  });

  test("the same group name twice is refused", () => {
    const one = { name: "Length", required: false, multiple: false, options: [{ name: "Long", price: "", minutes: "" }] };
    const out = draftsToPayload([one, { ...one, name: "length" }]);
    expect("error" in out && out.error).toContain("listed twice");
  });
});
