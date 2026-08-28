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
});
