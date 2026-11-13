import { describe, expect, it } from "bun:test";

import {
  POS_CASHIER_CAPABILITY_FLAGS,
  cashierMayRecordDrawout,
  posClearAllSalesEnabled,
  posClearSaleEnabled,
  posMpesaCodeEnabled,
} from "@/lib/pos-cashier-capabilities";
import { normalizeMpesaTransactionCode, mpesaCodeForPayment, parseMpesaCodeSearchQuery } from "@/lib/mpesa-transaction-code";

describe("posMpesaCodeEnabled", () => {
  it("stays off until the shop turns it on", () => {
    expect(posMpesaCodeEnabled({})).toBe(false);
    expect(posMpesaCodeEnabled(undefined)).toBe(false);
    expect(
      posMpesaCodeEnabled({
        [POS_CASHIER_CAPABILITY_FLAGS.mpesaCode]: true,
      }),
    ).toBe(true);
  });
});

describe("normalizeMpesaTransactionCode", () => {
  it("keeps a pasted Safaricom code as 10 letters and digits", () => {
    expect(normalizeMpesaTransactionCode(" qh7x 2k9lmx ")).toBe("QH7X2K9LMX");
    expect(normalizeMpesaTransactionCode("QH7X2K9LMXEXTRA")).toBe("QH7X2K9LMX");
  });

  it("keeps a verified receipt and drops a half-typed code", () => {
    expect(mpesaCodeForPayment("qk7abc1234", { verified: true })).toBe("qk7abc1234");
    expect(mpesaCodeForPayment("QH7X")).toBeNull();
    expect(mpesaCodeForPayment("qh7x2k9lmx")).toBe("QH7X2K9LMX");
  });

  it("treats a mixed code as a search and leaves receipt numbers alone", () => {
    expect(parseMpesaCodeSearchQuery("qh7x2k9lmx")).toBe("QH7X2K9LMX");
    expect(parseMpesaCodeSearchQuery("1563")).toBeNull();
    expect(parseMpesaCodeSearchQuery("QH7")).toBeNull();
  });
});

describe("posClearSaleEnabled", () => {
  it("defaults on when the flag is absent", () => {
    expect(posClearSaleEnabled({})).toBe(true);
    expect(posClearSaleEnabled(undefined)).toBe(true);
  });

  it("honours an explicit off", () => {
    expect(
      posClearSaleEnabled({
        [POS_CASHIER_CAPABILITY_FLAGS.clearSale]: false,
      }),
    ).toBe(false);
  });
});

describe("posClearAllSalesEnabled", () => {
  it("defaults off so unfinished sales stay accountable", () => {
    expect(posClearAllSalesEnabled({})).toBe(false);
    expect(posClearAllSalesEnabled(undefined)).toBe(false);
  });

  it("requires an explicit opt-in", () => {
    expect(
      posClearAllSalesEnabled({
        [POS_CASHIER_CAPABILITY_FLAGS.clearAllSales]: true,
      }),
    ).toBe(true);
  });

  it("stays off when explicitly false", () => {
    expect(
      posClearAllSalesEnabled({
        [POS_CASHIER_CAPABILITY_FLAGS.clearAllSales]: false,
      }),
    ).toBe(false);
  });
});

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
