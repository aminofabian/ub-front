import { describe, expect, it } from "vitest";

import { resolveSyncBranchFilter } from "@/lib/sync-branch-filter";

describe("resolveSyncBranchFilter", () => {
  it("pins locked roles to their assigned branch", () => {
    const result = resolveSyncBranchFilter({
      headerBranchId: "branch-b",
      localValue: "",
      prevHeaderId: undefined,
      branchLocked: true,
      assignedBranchId: "branch-a",
    });
    expect(result.nextLocalValue).toBe("branch-a");
  });

  it("seeds local filter from header on first mount", () => {
    const result = resolveSyncBranchFilter({
      headerBranchId: "branch-a",
      localValue: "",
      prevHeaderId: undefined,
      branchLocked: false,
      assignedBranchId: "",
      availableIds: ["branch-a", "branch-b"],
    });
    expect(result.nextLocalValue).toBe("branch-a");
    expect(result.nextPrevHeaderId).toBe("branch-a");
  });

  it("updates local filter when header branch changes", () => {
    const result = resolveSyncBranchFilter({
      headerBranchId: "branch-b",
      localValue: "branch-a",
      prevHeaderId: "branch-a",
      branchLocked: false,
      assignedBranchId: "",
      availableIds: ["branch-a", "branch-b"],
    });
    expect(result.nextLocalValue).toBe("branch-b");
  });

  it("does not override a user edit until the header changes again", () => {
    const result = resolveSyncBranchFilter({
      headerBranchId: "branch-a",
      localValue: "branch-b",
      prevHeaderId: "branch-a",
      branchLocked: false,
      assignedBranchId: "",
      availableIds: ["branch-a", "branch-b"],
    });
    expect(result.nextLocalValue).toBeUndefined();
  });

  it("ignores header branches that are not in availableIds", () => {
    const result = resolveSyncBranchFilter({
      headerBranchId: "branch-c",
      localValue: "",
      prevHeaderId: undefined,
      branchLocked: false,
      assignedBranchId: "",
      availableIds: ["branch-a", "branch-b"],
      allowAll: true,
    });
    expect(result.nextLocalValue).toBeUndefined();
    expect(result.nextPrevHeaderId).toBe("branch-c");
  });

  it("clears local filter to all-branches when allowAll and header is empty", () => {
    const result = resolveSyncBranchFilter({
      headerBranchId: "",
      localValue: "branch-a",
      prevHeaderId: "branch-a",
      branchLocked: false,
      assignedBranchId: "",
      availableIds: ["branch-a", "branch-b"],
      allowAll: true,
    });
    expect(result.nextLocalValue).toBe("");
  });
});
