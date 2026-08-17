import { beforeEach, describe, expect, it } from "bun:test";

import {
  clearOpsClientLog,
  isOpsInfraError,
  isOpsInfraMessage,
  readOpsClientLog,
  recordOpsClientError,
  ApiUnreachableError,
} from "@/lib/ops-client-log";
import { STORAGE_KEYS } from "@/lib/config";

describe("ops client log", () => {
  beforeEach(() => {
    clearOpsClientLog();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.opsClientLog);
    }
    clearOpsClientLog();
  });

  it("detects BACKEND_ORIGIN / proxy config messages", () => {
    expect(
      isOpsInfraMessage(
        "Cannot reach API at this app’s origin (configure BACKEND_ORIGIN for the Next.js proxy). Start the backend, set BACKEND_ORIGIN on Next.js, or set NEXT_PUBLIC_API_BROWSER_DIRECT=true with NEXT_PUBLIC_API_BASE_URL for direct (CORS) API calls.",
      ),
    ).toBe(true);
    expect(isOpsInfraMessage("Missing BACKEND_ORIGIN\nSet BACKEND_ORIGIN=https://api.example.com")).toBe(
      true,
    );
    expect(isOpsInfraMessage("This item is out of stock at this branch.")).toBe(
      false,
    );
  });

  it("treats ApiUnreachableError as infra even when the user message is generic", () => {
    const err = new ApiUnreachableError("Cannot reach API at https://api.example.com");
    expect(err.message).not.toContain("BACKEND_ORIGIN");
    expect(isOpsInfraError(err)).toBe(true);
  });

  it("records and dedupes the same message", () => {
    recordOpsClientError({
      message: "Cannot reach API at this app’s origin (configure BACKEND_ORIGIN)",
      path: "/api/v1/grocery/invoices",
    });
    recordOpsClientError({
      message: "Cannot reach API at this app’s origin (configure BACKEND_ORIGIN)",
      path: "/api/v1/grocery/invoices",
    });
    const rows = readOpsClientLog();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.count).toBe(2);
    expect(rows[0]?.message).toContain("BACKEND_ORIGIN");
  });
});
