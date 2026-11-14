import { describe, expect, test } from "bun:test";

import { colourPreviewVars, isHexColour, SERVICE_STARTER_PHOTOS, serviceLookFor, weekHours } from "./service-landing";

describe("serviceLookFor", () => {
  test("reads the kind of shop from what it sells", () => {
    expect(serviceLookFor(["Haircut", "Beard trim", "Kids cut"])).toBe("barber");
    expect(serviceLookFor(["Box braids", "Weave install", "Blow dry"])).toBe("salon");
    expect(serviceLookFor(["Full body massage", "Facial"])).toBe("spa");
    expect(serviceLookFor(["Gel manicure", "Pedicure", "Acrylic nails"])).toBe("nails");
  });

  test("a mixed shop goes with the larger part, and an unknown one is a barber", () => {
    expect(serviceLookFor(["Haircut", "Shave", "Manicure"])).toBe("barber");
    expect(serviceLookFor(["Haircut", "Manicure", "Pedicure"])).toBe("nails");
    expect(serviceLookFor([])).toBe("barber");
    expect(serviceLookFor(["Consultation"])).toBe("barber");
  });

  test("every look has all three photographs and their descriptions", () => {
    for (const photos of Object.values(SERVICE_STARTER_PHOTOS)) {
      for (const key of ["hero", "menu", "visit"] as const) {
        expect(photos[key]).toStartWith("https://images.unsplash.com/photo-");
        expect(photos.alt[key].length).toBeGreaterThan(10);
      }
    }
  });
});

describe("colours", () => {
  test("only a full hex colour is accepted", () => {
    expect(isHexColour("#1D4B3B")).toBe(true);
    expect(isHexColour("#abc")).toBe(false);
    expect(isHexColour("red")).toBe(false);
    expect(isHexColour("#1d4b3b; background:url(x)")).toBe(false);
    expect(colourPreviewVars("javascript:alert(1)")).toEqual({});
  });

  test("text on the colour is whichever reads: light on dark, dark on light", () => {
    expect(colourPreviewVars("#16181D")["--primary-foreground"]).toBe("#ffffff");
    expect(colourPreviewVars("#f4d35e")["--primary-foreground"]).toBe("#15231f");
    expect(colourPreviewVars("#1D4B3B")["--storefront-brand"]).toBe("#1d4b3b");
  });
});

describe("weekHours", () => {
  test("lists all seven days, marks today and the closed days", () => {
    const rows = weekHours({ mon: { open: "08:00", close: "19:00" }, sat: { open: "09:30", close: "20:00" } }, "sat");
    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({ key: "mon", day: "Monday", hours: "8:00 am to 7:00 pm", today: false });
    expect(rows[5]).toEqual({ key: "sat", day: "Saturday", hours: "9:30 am to 8:00 pm", today: true });
    expect(rows[6]!.hours).toBeNull();
    expect(weekHours(undefined, "mon").every((r) => r.hours === null)).toBe(true);
  });
});
