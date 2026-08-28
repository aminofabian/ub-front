import { describe, expect, it } from "bun:test";

import {
  POS_CASHIER_CAPABILITY_FLAGS,
  cashierMayRecordDrawout,
} from "@/lib/pos-cashier-capabilities";

describe("cashierMayRecordDrawout", () => {
  it("lets owners and managers record drawouts without the flag", () => {
    expect(cashierMayRecordDrawout({}, "owner")).toBe(true);
    expect(cashierMayRecordDrawout({}, "admin")).toBe(true);
    expect(cashierMayRecordDrawout({}, "manager")).toBe(true);
  });

  it("hides drawout from cashiers until till settings enable it", () => {
    expect(cashierMayRecordDrawout({}, "cashier")).toBe(false);
    expect(cashierMayRecordDrawout({}, "butcher_cashier")).toBe(false);
    expect(
      cashierMayRecordDrawout(
        { [POS_CASHIER_CAPABILITY_FLAGS.drawout]: false },
        "cashier",
      ),
    ).toBe(false);
  });

  it("allows cashiers when pos.cashier_drawout is on", () => {
    expect(
      cashierMayRecordDrawout(
        { [POS_CASHIER_CAPABILITY_FLAGS.drawout]: true },
        "cashier",
      ),
    ).toBe(true);
    expect(
      cashierMayRecordDrawout(
        { [POS_CASHIER_CAPABILITY_FLAGS.drawout]: true },
        "butcher_cashier",
      ),
    ).toBe(true);
  });

  it("limits selected cashiers to the allow list", () => {
    const flags = { [POS_CASHIER_CAPABILITY_FLAGS.drawout]: true };
    const access = {
      scope: "selected" as const,
      userIds: ["agnes-id"],
    };
    expect(
      cashierMayRecordDrawout(flags, "cashier", {
        userId: "agnes-id",
        access,
      }),
    ).toBe(true);
    expect(
      cashierMayRecordDrawout(flags, "cashier", {
        userId: "other-id",
        access,
      }),
    ).toBe(false);
    expect(
      cashierMayRecordDrawout(flags, "owner", {
        userId: "owner-id",
        access,
      }),
    ).toBe(true);
  });
});
