import { describe, expect, it } from "bun:test";

import {
  closeShiftDraftHasProgress,
  openShiftDraftHasProgress,
  persistedQuantitiesToRecord,
  quantitiesRecordToPersisted,
} from "@/lib/shift-draft-storage";

describe("shift-draft-storage", () => {
  it("detects open-shift progress", () => {
    expect(
      openShiftDraftHasProgress({
        branchId: "",
        notes: "",
        quantities: {},
        cashTotalStr: "",
      }),
    ).toBe(false);

    expect(
      openShiftDraftHasProgress({
        branchId: "b1",
        notes: "",
        quantities: {},
        cashTotalStr: "",
      }),
    ).toBe(false);

    expect(
      openShiftDraftHasProgress({
        branchId: "",
        notes: "",
        quantities: { "1000": 2 },
        cashTotalStr: "",
      }),
    ).toBe(true);

    expect(
      openShiftDraftHasProgress({
        branchId: "",
        notes: "float check",
        quantities: {},
        cashTotalStr: "",
      }),
    ).toBe(true);
  });

  it("detects close-shift progress", () => {
    expect(
      closeShiftDraftHasProgress({
        notes: "",
        varianceReason: "",
        quantities: {},
        cashTotalStr: "",
      }),
    ).toBe(false);

    expect(
      closeShiftDraftHasProgress({
        notes: "short",
        varianceReason: "",
        quantities: {},
        cashTotalStr: "",
      }),
    ).toBe(true);

    expect(
      closeShiftDraftHasProgress({
        notes: "",
        varianceReason: "missing 500",
        quantities: {},
        cashTotalStr: "",
      }),
    ).toBe(true);
  });

  it("round-trips denomination quantities", () => {
    const persisted = quantitiesRecordToPersisted({
      1000: 2,
      500: 0,
      100: 3,
    });
    expect(persisted).toEqual({ "1000": 2, "100": 3 });
    expect(persistedQuantitiesToRecord(persisted)).toEqual({
      1000: 2,
      100: 3,
    });
  });
});
