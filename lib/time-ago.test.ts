import { describe, expect, test } from "bun:test";

import { timeAgo } from "./time-ago";

describe("timeAgo", () => {
  const now = new Date("2026-11-22T12:00:00Z");

  test("says how long ago in the largest whole unit", () => {
    expect(timeAgo("2026-11-22T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-11-22T11:35:00Z", now)).toBe("25 minutes ago");
    expect(timeAgo("2026-11-22T07:00:00Z", now)).toBe("5 hours ago");
    expect(timeAgo("2026-11-19T12:00:00Z", now)).toBe("3 days ago");
  });

  test("uses the singular for one", () => {
    expect(timeAgo("2026-11-22T11:00:00Z", now)).toBe("1 hour ago");
    expect(timeAgo("2026-11-21T12:00:00Z", now)).toBe("1 day ago");
  });

  test("is empty when the time cannot be read", () => {
    expect(timeAgo(null, now)).toBe("");
    expect(timeAgo("not a date", now)).toBe("");
  });
});
