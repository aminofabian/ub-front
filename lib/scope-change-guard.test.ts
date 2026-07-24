import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

type ConfirmOpts = {
  id: string;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

const toastCalls: ConfirmOpts[] = [];

mock.module("@/components/super-admin/themed-confirm-toast", () => ({
  showThemedConfirmToast: (opts: ConfirmOpts) => {
    toastCalls.push(opts);
  },
}));

const { confirmScopeChange, registerScopeGuard } = await import(
  "@/lib/scope-change-guard"
);

describe("scope-change-guard", () => {
  beforeEach(() => {
    toastCalls.length = 0;
  });

  afterEach(() => {
    mock.restore();
  });

  it("runs onConfirm immediately when no guards are active", () => {
    let ran = false;
    confirmScopeChange("branch", () => {
      ran = true;
    }, []);
    expect(ran).toBe(true);
    expect(toastCalls).toHaveLength(0);
  });

  it("shows a themed toast when an active guard is registered", () => {
    let ran = false;
    confirmScopeChange(
      "branch",
      () => {
        ran = true;
      },
      [
        {
          id: "test",
          message: "Cart has items",
          isActive: () => true,
        },
      ],
    );
    expect(ran).toBe(false);
    expect(toastCalls).toHaveLength(1);
    expect(toastCalls[0]?.title).toBe("Change branch?");
    expect(toastCalls[0]?.confirmLabel).toBe("Change anyway");
    expect(toastCalls[0]?.description).toContain("Cart has items");
  });

  it("does not run onConfirm until the toast confirms", () => {
    let ran = false;
    confirmScopeChange(
      "department",
      () => {
        ran = true;
      },
      [
        {
          id: "test",
          message: "Draft open",
          isActive: () => true,
        },
      ],
    );
    expect(ran).toBe(false);
    toastCalls[0]?.onConfirm();
    expect(ran).toBe(true);
  });

  it("unregisters guards on cleanup", () => {
    let ran = 0;
    const cleanup = registerScopeGuard({
      id: "transfer-draft",
      message: "Transfer draft open",
      isActive: () => true,
    });
    confirmScopeChange("branch", () => {
      ran += 1;
    });
    expect(toastCalls).toHaveLength(1);
    expect(ran).toBe(0);
    cleanup();
    confirmScopeChange("branch", () => {
      ran += 1;
    });
    expect(ran).toBe(1);
    expect(toastCalls).toHaveLength(1);
  });
});
