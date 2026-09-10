import { describe, expect, it } from "bun:test";

import { fileFromImageBase64, logoPromptChips } from "@/lib/ai-logo";

describe("logoPromptChips", () => {
  it("picks a butcher-specific starter", () => {
    expect(logoPromptChips("Butchery")).toEqual([
      "Bold butcher mark, no extra text",
      "Letter from the shop name",
    ]);
  });

  it("falls back to a geometric mark", () => {
    expect(logoPromptChips("other")).toEqual([
      "Simple geometric mark",
      "Letter from the shop name",
    ]);
  });
});

describe("fileFromImageBase64", () => {
  it("builds a PNG File from Base64", () => {
    const file = fileFromImageBase64("Zm9v", "image/png", "logo.png");
    expect(file.name).toBe("logo.png");
    expect(file.type).toBe("image/png");
    expect(file.size).toBe(3);
  });
});
