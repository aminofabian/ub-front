import { describe, expect, test } from "bun:test";

import { parseRealtimeError } from "./realtime-error";

describe("parseRealtimeError", () => {
  test("parses the server's top-level error frame", () => {
    expect(
      parseRealtimeError({
        v: 1,
        type: "error",
        code: 4403,
        message: "Channel not permitted",
      }),
    ).toEqual({ code: 4403, message: "Channel not permitted" });
  });

  test("parses the legacy nested shape", () => {
    expect(
      parseRealtimeError({
        type: "error",
        data: { code: 4401, message: "Reauthenticate" },
      }),
    ).toEqual({ code: 4401, message: "Reauthenticate" });
  });

  test("ignores non-error frames and malformed input", () => {
    expect(parseRealtimeError({ type: "support.message", data: {} })).toBeNull();
    expect(parseRealtimeError(null)).toBeNull();
    expect(parseRealtimeError("error")).toBeNull();
  });
});
