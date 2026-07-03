import { describe, expect, it } from "bun:test";

import { PROBLEM_TITLES } from "@/lib/config";
import {
  isRefreshAlreadyRotatedProblem,
  isSessionIdleExpiredProblem,
} from "@/lib/session-recovery";

describe("isRefreshAlreadyRotatedProblem", () => {
  it("matches detail from rotation grace 401", () => {
    expect(
      isRefreshAlreadyRotatedProblem({
        title: "Unauthorized",
        status: 401,
        detail: PROBLEM_TITLES.refreshAlreadyRotated,
      }),
    ).toBe(true);
  });

  it("ignores generic unauthorized", () => {
    expect(
      isRefreshAlreadyRotatedProblem({
        title: "Unauthorized",
        status: 401,
      }),
    ).toBe(false);
  });
});

describe("isSessionIdleExpiredProblem", () => {
  it("matches idle timeout detail", () => {
    expect(
      isSessionIdleExpiredProblem({
        title: "Unauthorized",
        status: 401,
        detail: PROBLEM_TITLES.sessionIdleExpired,
      }),
    ).toBe(true);
  });

  it("ignores unrelated problems", () => {
    expect(
      isSessionIdleExpiredProblem({
        title: "Session is no longer active",
        status: 401,
      }),
    ).toBe(false);
  });
});
