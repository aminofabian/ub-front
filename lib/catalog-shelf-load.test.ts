import { describe, expect, test } from "bun:test";

import {
  shelfAisles,
  shelfAnnouncement,
  shelfBaysFilled,
  shelfLoadCopy,
  shelfSecondsLeft,
  shelfTimeLeftPhrase,
} from "./catalog-shelf-load";

describe("time left", () => {
  test("is measured from the pace so far", () => {
    // 1,000 of 5,000 in 10 seconds: 4,000 to go at 100 a second.
    expect(shelfSecondsLeft({ loaded: 1000, total: 5000, done: false, elapsedMs: 10_000 })).toBe(40);
  });

  test("is not guessed from the small first slice", () => {
    expect(shelfSecondsLeft({ loaded: 100, total: 5000, done: false, elapsedMs: 2000 })).toBeNull();
  });

  test("is not guessed before anything has loaded, or after it is done", () => {
    expect(shelfSecondsLeft({ loaded: 0, total: 5000, done: false, elapsedMs: 3000 })).toBeNull();
    expect(shelfSecondsLeft({ loaded: 5000, total: 5000, done: true, elapsedMs: 3000 })).toBeNull();
    expect(shelfSecondsLeft({ loaded: 100, total: 0, done: false, elapsedMs: 3000 })).toBeNull();
  });

  test("is said in words a person would use", () => {
    expect(shelfTimeLeftPhrase(null)).toBe("");
    expect(shelfTimeLeftPhrase(5)).toBe("Last crate coming in.");
    expect(shelfTimeLeftPhrase(30)).toBe("Less than a minute left.");
    expect(shelfTimeLeftPhrase(70)).toBe("About a minute left.");
    expect(shelfTimeLeftPhrase(200)).toBe("About 3 minutes left.");
  });
});

describe("what the loader says", () => {
  test("before the first slice", () => {
    const c = shelfLoadCopy({ loaded: 0, total: 0, done: false, elapsedMs: 0 }, "medicines");
    expect(c.headline).toBe("Opening the medicines catalogue");
  });

  test("while loading it invites choosing and says what is next", () => {
    const c = shelfLoadCopy({ loaded: 100, total: 5214, done: false, elapsedMs: 2000 }, "medicines");
    expect(c.headline).toBe("of 5,214 medicines unpacked");
    expect(c.detail).toBe("You can start choosing now. Fetching the next 500. Review opens when the last one lands.");
  });

  test("it names the quarter marks and the time left once there is a pace to go by", () => {
    const c = shelfLoadCopy({ loaded: 2700, total: 5214, done: false, elapsedMs: 30_000 }, "medicines");
    expect(c.detail).toContain("Halfway.");
    expect(c.detail).toContain("Less than a minute left.");
  });

  test("the last slice is named by its real size", () => {
    const c = shelfLoadCopy({ loaded: 5100, total: 5214, done: false, elapsedMs: 60_000 }, "medicines");
    expect(c.detail).toContain("Fetching the next 114.");
  });

  test("when done", () => {
    expect(shelfLoadCopy({ loaded: 5214, total: 5214, done: true, elapsedMs: 1 }, "medicines").headline).toBe(
      "All 5,214 medicines are unpacked",
    );
  });
});

test("a bay is full only when all of it has arrived", () => {
  expect(shelfBaysFilled(0, 5000, 20)).toBe(0);
  expect(shelfBaysFilled(249, 5000, 20)).toBe(0);
  expect(shelfBaysFilled(250, 5000, 20)).toBe(1);
  expect(shelfBaysFilled(5000, 5000, 20)).toBe(20);
  expect(shelfBaysFilled(100, 0, 20)).toBe(0);
});

test("a screen reader hears quarter marks, not every tick", () => {
  const at = (loaded: number) => shelfAnnouncement({ loaded, total: 4000, done: false, elapsedMs: 1 }, "medicines");
  expect(at(100)).toContain("first 100");
  expect(at(900)).toContain("first 900");
  expect(at(1000)).toBe("25 percent of the medicines have loaded.");
  expect(at(1400)).toBe(at(1000));
  expect(at(2100)).toBe("50 percent of the medicines have loaded.");
});

describe("aisles", () => {
  const products = [
    { id: "a", categoryName: "Pain relief" },
    { id: "b", categoryName: "Pain relief" },
    { id: "c", categoryName: "pain relief " },
    { id: "d", categoryName: "Antibiotics" },
    { id: "e", categoryName: null },
    { id: "f", categoryName: "Antibiotics", alreadyImported: true },
  ];

  test("are grouped by name, biggest first, with what is ticked", () => {
    const aisles = shelfAisles(products, (id) => id === "a" || id === "d");
    expect(aisles.map((a) => [a.name, a.total, a.selected])).toEqual([
      ["Pain relief", 3, 1],
      ["Antibiotics", 1, 1],
      ["Other", 1, 0],
    ]);
  });

  test("are capped", () => {
    expect(shelfAisles(products, () => true, 1)).toHaveLength(1);
  });
});
