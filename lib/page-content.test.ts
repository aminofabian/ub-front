import { describe, expect, it } from "bun:test";

import { extractPageContent } from "@/lib/page-content";

describe("extractPageContent", () => {
  it("reads Spring page content", () => {
    const rows = extractPageContent<{ id: string }>({
      content: [{ id: "a" }, { id: "b" }],
    });
    expect(rows).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("reads plain arrays", () => {
    expect(extractPageContent([1, 2])).toEqual([1, 2]);
  });

  it("returns empty for unknown shapes", () => {
    expect(extractPageContent(null)).toEqual([]);
  });
});
