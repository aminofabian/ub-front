import { describe, expect, it } from "bun:test";

import {
  formatApiProblemMessage,
  getBranchGuidanceKind,
  getPosGuidanceKind,
  isAuthRecoveryUserMessage,
  isBareRequestFailureMessage,
  isItemNotFoundProblem,
  isSessionRelatedProblem,
  isTenantContextMissingProblem,
  isTransientBackendStatus,
  isUnmappedTenantHostProblem,
  shouldOmitHttpErrorToast,
} from "@/lib/problem";

describe("formatApiProblemMessage", () => {
  it("does not duplicate Spring ResponseStatusException title=detail", () => {
    expect(
      formatApiProblemMessage({
        title: "No non-expired stock available for Brookside (SKU-1)",
        status: 400,
        detail: "No non-expired stock available for Brookside (SKU-1)",
      }),
    ).toBe("No non-expired stock available for Brookside (SKU-1)");
  });

  it("prefers detail when title is a generic HTTP status phrase", () => {
    expect(
      formatApiProblemMessage({
        title: "Bad Request",
        status: 400,
        detail: "No non-expired stock available for Brookside",
      }),
    ).toBe("No non-expired stock available for Brookside");
  });
});

describe("isItemNotFoundProblem", () => {
  it("matches pricing/catalog item missing detail", () => {
    expect(
      isItemNotFoundProblem({
        type: "urn:problem:bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Item not found",
      }),
    ).toBe(true);
  });

  it("ignores unrelated problems", () => {
    expect(
      isItemNotFoundProblem({
        title: "Bad Request",
        status: 400,
        detail: "Branch not found",
      }),
    ).toBe(false);
  });
});

describe("isSessionRelatedProblem", () => {
  it("treats authenticated 401 as session failure", () => {
    expect(
      isSessionRelatedProblem(401, {
        title: "Session is no longer active",
        status: 401,
        type: "urn:problem:unauthorized",
      }),
    ).toBe(true);
  });

  it("ignores 401 on public login calls", () => {
    expect(
      isSessionRelatedProblem(
        401,
        { title: "Incorrect email or password.", status: 401 },
        { requiresAuth: false },
      ),
    ).toBe(false);
  });

  it("matches token_expired and invalid access token signals", () => {
    expect(
      isSessionRelatedProblem(403, {
        code: "token_expired",
        title: "Invalid or expired access token",
      }),
    ).toBe(true);
  });

  it("matches revoked-session and refresh-token titles", () => {
    expect(
      isSessionRelatedProblem(401, {
        title: "Invalid or expired token",
        status: 401,
      }),
    ).toBe(true);
  });

  it("matches tenant token mismatch forbidden", () => {
    expect(
      isSessionRelatedProblem(403, {
        title: "Token tenant does not match resolved host tenant",
        status: 403,
        type: "urn:problem:forbidden",
      }),
    ).toBe(true);
  });

  it("does not sign out on refresh-already-rotated (benign duplicate)", () => {
    expect(
      isSessionRelatedProblem(401, {
        title: "Unauthorized",
        status: 401,
        detail: "Refresh token already rotated",
      }),
    ).toBe(false);
    expect(
      isSessionRelatedProblem(401, {
        title: "Refresh token already rotated",
        status: 401,
      }),
    ).toBe(false);
  });

  it("signs out on session idle timeout", () => {
    expect(
      isSessionRelatedProblem(401, {
        title: "Unauthorized",
        status: 401,
        detail: "Session idle timeout expired",
      }),
    ).toBe(true);
  });

  it("ignores generic permission-denied 403", () => {
    expect(
      isSessionRelatedProblem(403, {
        title: "Forbidden",
        status: 403,
        type: "urn:problem:permission-denied",
      }),
    ).toBe(false);
  });

  it("ignores bare 403 with no problem body", () => {
    expect(isSessionRelatedProblem(403, {})).toBe(false);
  });

  it("ignores 403 on public calls", () => {
    expect(
      isSessionRelatedProblem(
        403,
        {
          title: "Forbidden",
          status: 403,
          type: "urn:problem:permission-denied",
        },
        { requiresAuth: false },
      ),
    ).toBe(false);
  });

  it("does not sign out when tenant context is missing", () => {
    expect(
      isSessionRelatedProblem(400, {
        title: "Bad Request",
        status: 400,
        detail:
          "Tenant context missing. Provide mapped Host header or X-Tenant-Id.",
      }),
    ).toBe(false);
  });

  it("ignores missing tenant context on public calls", () => {
    expect(
      isSessionRelatedProblem(
        400,
        {
          title: "Bad Request",
          status: 400,
          detail:
            "Tenant context missing. Provide mapped Host header or X-Tenant-Id.",
        },
        { requiresAuth: false },
      ),
    ).toBe(false);
  });

  it("ignores unmapped tenant host 404 (routing problem, not auth)", () => {
    expect(
      isSessionRelatedProblem(404, {
        type: "urn:problem:tenant-not-found",
        title: "Tenant not found",
        status: 404,
        detail: "No active tenant mapping found for host: kiosk.zelisline.com",
      }),
    ).toBe(false);
  });
});

describe("isTenantContextMissingProblem", () => {
  it("matches TenantRequestIds 400 detail", () => {
    expect(
      isTenantContextMissingProblem({
        title: "Bad Request",
        status: 400,
        detail:
          "Tenant context missing. Provide mapped Host header or X-Tenant-Id.",
      }),
    ).toBe(true);
  });

  it("ignores unrelated 400 problems", () => {
    expect(
      isTenantContextMissingProblem({
        title: "Bad Request",
        status: 400,
        detail: "Branch not found",
      }),
    ).toBe(false);
  });
});

describe("isUnmappedTenantHostProblem", () => {
  it("matches tenant-not-found problem type", () => {
    expect(
      isUnmappedTenantHostProblem({
        type: "urn:problem:tenant-not-found",
        title: "Tenant not found",
        status: 404,
        detail: "No active tenant mapping found for host: kiosk.zelisline.com",
      }),
    ).toBe(true);
  });

  it("matches tenant-not-found title and unmapped host detail", () => {
    expect(
      isUnmappedTenantHostProblem({
        title: "Tenant not found",
        status: 404,
        detail: "No active tenant mapping found for host: kiosk.zelisline.com",
      }),
    ).toBe(true);
  });

  it("ignores unrelated 404 problems", () => {
    expect(
      isUnmappedTenantHostProblem({
        title: "Not Found",
        status: 404,
        detail: "Item not found",
      }),
    ).toBe(false);
  });
});

describe("getPosGuidanceKind", () => {
  it("matches trusted-till registration copy", () => {
    expect(
      getPosGuidanceKind(
        "This till is not registered for this branch. Ask a manager to register it under Business Settings → Trusted tills.",
      ),
    ).toBe("register-till");
  });

  it("matches no open shift responses", () => {
    expect(getPosGuidanceKind("No open shift")).toBe("open-shift");
    expect(getPosGuidanceKind("No open shift for this branch")).toBe(
      "open-shift",
    );
  });

  it("ignores unrelated errors", () => {
    expect(getPosGuidanceKind("Branch not found")).toBe(null);
    expect(getPosGuidanceKind("Insufficient wallet balance")).toBe(null);
  });
});
describe("getBranchGuidanceKind", () => {
  it("matches the top-bar shop-location coaching copy", () => {
    expect(
      getBranchGuidanceKind(
        "Choose a shop location first — pick a branch in the top bar, then try again.",
      ),
    ).toBe("pick");
  });

  it("matches grocery filter copy", () => {
    expect(
      getBranchGuidanceKind(
        "Choose a shop location first — pick a branch in the filter, then try again.",
      ),
    ).toBe("pick");
  });

  it("matches locked-role assignment copy", () => {
    expect(
      getBranchGuidanceKind(
        "Your account needs a shop location. Ask an owner to assign you a branch, then try again.",
      ),
    ).toBe("assign");
  });

  it("ignores unrelated branch errors", () => {
    expect(
      getBranchGuidanceKind("Branch not found or not in this business"),
    ).toBe(null);
    expect(getBranchGuidanceKind("Branch is required to confirm")).toBe(null);
  });
});

describe("auth recovery copy is never toasted", () => {
  it("matches request-failed + session-expired combo", () => {
    expect(
      isAuthRecoveryUserMessage("Request failed.\nSession expired"),
    ).toBe(true);
    expect(
      shouldOmitHttpErrorToast("Request failed.\nSession expired"),
    ).toBe(true);
  });

  it("matches 401 session problems even without recovery copy", () => {
    expect(
      shouldOmitHttpErrorToast("Request failed.", 401, {
        title: "Invalid or expired access token",
        status: 401,
        code: "token_expired",
      }),
    ).toBe(true);
  });

  it("still toasts ordinary request failures", () => {
    expect(isAuthRecoveryUserMessage("Request failed.")).toBe(false);
    expect(
      shouldOmitHttpErrorToast("Could not save product.", 400, {
        title: "Bad Request",
        status: 400,
        detail: "SKU already exists",
      }),
    ).toBe(false);
  });

  it("does not treat a wrong password as recovery copy", () => {
    expect(
      isAuthRecoveryUserMessage("Incorrect email or password."),
    ).toBe(false);
  });
});

describe("bare transport failures are never user-facing", () => {
  it("recognises placeholder copy with and without a status", () => {
    for (const message of [
      "",
      "Request failed",
      "Request failed.",
      "Request failed (502)",
      "Something went wrong. Please try again.",
      "Internal Server Error",
      "Bad Gateway",
      "Gateway Timeout",
      "Service Unavailable",
      "Failed to fetch",
      "Load failed",
    ]) {
      expect(isBareRequestFailureMessage(message)).toBe(true);
    }
  });

  it("keeps anything the server actually explained", () => {
    for (const message of [
      "SKU already exists",
      "Request failed.\nSKU already exists",
      "This item is out of stock at this branch.",
      "Choose a shop location first — pick a branch in the top bar, then try again.",
    ]) {
      expect(isBareRequestFailureMessage(message)).toBe(false);
    }
  });

  it("classifies gateway and timeout statuses as transient", () => {
    for (const status of [0, 408, 429, 502, 503, 504, 522, 524]) {
      expect(isTransientBackendStatus(status)).toBe(true);
    }
  });

  it("leaves real client errors alone", () => {
    for (const status of [400, 401, 403, 404, 409, 422, 500]) {
      expect(isTransientBackendStatus(status)).toBe(false);
    }
  });
});

describe("problem formatting never emits raw 'Request failed'", () => {
  it("falls back to friendly copy for an unusable body", () => {
    expect(formatApiProblemMessage(null)).toBe(
      "Something went wrong. Please try again.",
    );
    expect(formatApiProblemMessage({})).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
