import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmScopeChange,
  registerScopeGuard,
} from "@/lib/scope-change-guard";

describe("scope-change-guard", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: { confirm: vi.fn(() => true) },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows scope change when no guards are active", () => {
    expect(confirmScopeChange("branch", [])).toBe(true);
  });

  it("prompts when an active guard is registered", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const activeGuards = [
      {
        id: "test",
        message: "Cart has items",
        isActive: () => true,
      },
    ];

    expect(confirmScopeChange("branch", activeGuards)).toBe(true);
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining("Cart has items"),
    );
    expect(confirm.mock.calls[0]?.[0]).toContain("Change branch anyway?");
  });

  it("blocks scope change when the user declines", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const activeGuards = [
      {
        id: "test",
        message: "Draft open",
        isActive: () => true,
      },
    ];

    expect(confirmScopeChange("department", activeGuards)).toBe(false);
  });

  it("unregisters guards on cleanup", () => {
    const cleanup = registerScopeGuard({
      id: "transfer-draft",
      message: "Transfer draft open",
      isActive: () => true,
    });
    cleanup();
    expect(confirmScopeChange("branch", [])).toBe(true);
  });
});
