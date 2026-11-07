import { describe, expect, it } from "vitest";

import { fitNameLines, type TextMeasure } from "@/lib/price-tags/name-fit";

/** Every character is one unit wide; lines wrap on spaces like a doc does. */
const measure: TextMeasure = {
  getTextWidth: (text) => text.length,
  splitTextToSize(text, width) {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (next.length <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  },
};

describe("fitNameLines", () => {
  it("leaves a name that fits alone", () => {
    expect(fitNameLines(measure, "Sunlight 500g", 12)).toEqual(["Sunlight", "500g"]);
  });

  it("keeps the size when a long name is cut", () => {
    const lines = fitNameLines(measure, "Sunlight Detergent Powder Lemon Fresh 500g", 12);
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines.join(" ")).toMatch(/…/);
    expect(lines.join(" ").endsWith("500g")).toBe(true);
  });

  it("keeps a colour before the size", () => {
    const lines = fitNameLines(measure, "Sunlight Detergent Powder Pink 500g", 12);
    expect(lines.join(" ")).toContain("Pink 500g");
  });

  it("tells two variants apart on one line", () => {
    const small = fitNameLines(measure, "Royco Mchuzi Mix Chicken 7g", 16, 1);
    const large = fitNameLines(measure, "Royco Mchuzi Mix Chicken 200g", 16, 1);
    expect(small).toHaveLength(1);
    expect(small[0].length).toBeLessThanOrEqual(16);
    expect(small[0]).not.toEqual(large[0]);
    expect(large[0].endsWith("200g")).toBe(true);
  });

  it("falls back to cutting the end when even the variant is too wide", () => {
    const lines = fitNameLines(measure, "Supercalifragilistic Detergent Megapack500g", 6, 1);
    expect(lines).toHaveLength(1);
    expect(lines[0].endsWith("…")).toBe(true);
    expect(lines[0].length).toBeLessThanOrEqual(6);
  });
});
