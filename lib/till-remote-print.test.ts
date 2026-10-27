import { describe, expect, it } from "bun:test";

import { ApiRequestError } from "@/lib/api";
import { isIgnorableTillPrintLoadError } from "@/lib/till-remote-print";

describe("till print queue errors", () => {
  it("ignores a signed-out poll so Business does not warn about a missing slip", () => {
    const error = new ApiRequestError("Not authenticated", 401, {
      status: 401,
      title: "Unauthorized",
    });
    expect(isIgnorableTillPrintLoadError(error)).toBe(true);
  });

  it("still reports a real queue failure", () => {
    const error = new ApiRequestError("Stored print slip is unreadable", 500, {
      status: 500,
      title: "Internal Server Error",
    });
    expect(isIgnorableTillPrintLoadError(error)).toBe(false);
  });
});
