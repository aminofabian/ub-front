import { describe, expect, test } from "bun:test";

import {
  cleanDispensingPayload,
  dispensingIsFixableAtTill,
  parseDispensingRequired,
  refillDueDate,
  saleFingerprint,
  withoutPatientDetails,
} from "./pharmacy-dispensing";

describe("parseDispensingRequired", () => {
  test("reads the tagged dispensing problem and its hint", () => {
    expect(
      parseDispensingRequired({
        code: "setup_required",
        requirement: "dispensing",
        hint: "approve",
        detail: "A pharmacist must approve the sale of Amoxil.",
      }),
    ).toEqual({ hint: "approve", message: "A pharmacist must approve the sale of Amoxil." });
  });

  test("falls back to the record hint and the title", () => {
    expect(
      parseDispensingRequired({ code: "setup_required", requirement: "dispensing", title: "Needs a record" }),
    ).toEqual({ hint: "record", message: "Needs a record" });
  });

  test("ignores other setup problems and plain errors", () => {
    expect(parseDispensingRequired({ code: "setup_required", requirement: "shift" })).toBeNull();
    expect(parseDispensingRequired({ title: "Insufficient stock" })).toBeNull();
    expect(parseDispensingRequired(null)).toBeNull();
    expect(parseDispensingRequired("dispensing")).toBeNull();
  });
});

describe("dispensingIsFixableAtTill", () => {
  test("only a record or an approval can be supplied at the till", () => {
    expect(dispensingIsFixableAtTill("record")).toBe(true);
    expect(dispensingIsFixableAtTill("approve")).toBe(true);
    expect(dispensingIsFixableAtTill("classify")).toBe(false);
    expect(dispensingIsFixableAtTill("controlled")).toBe(false);
  });
});

describe("cleanDispensingPayload", () => {
  test("trims, drops blanks and keeps only lines with instructions", () => {
    expect(
      cleanDispensingPayload({
        prescriberName: "  Dr Wanjiru ",
        prescriberRegNo: " ",
        prescriptionRef: " RX-9 ",
        prescriptionDate: "",
        patientName: "",
        patientPhone: "",
        approvalId: " a1 ",
        lines: [
          { itemId: "i1", instructions: " 1 tablet twice a day " },
          { itemId: "i2", instructions: "  " },
        ],
      }),
    ).toEqual({
      prescriberName: "Dr Wanjiru",
      prescriptionRef: "RX-9",
      approvalId: "a1",
      lines: [{ itemId: "i1", instructions: "1 tablet twice a day" }],
    });
  });

  test("omits lines entirely when none carry instructions", () => {
    expect(cleanDispensingPayload({ prescriberName: "Dr A", lines: [{ itemId: "i1", instructions: "" }] })).toEqual({
      prescriberName: "Dr A",
    });
  });
});

describe("withoutPatientDetails", () => {
  test("removes the patient's name and phone and keeps everything else", () => {
    const sale = {
      lines: [{ itemId: "i1", quantity: 1 }],
      dispensing: {
        prescriberName: "Dr Wanjiru",
        prescriptionRef: "RX-9",
        patientName: "A Patient",
        patientPhone: "0700000000",
        lines: [{ itemId: "i1", instructions: "1 tablet twice a day" }],
      },
    };
    expect(withoutPatientDetails(sale)).toEqual({
      lines: [{ itemId: "i1", quantity: 1 }],
      dispensing: {
        prescriberName: "Dr Wanjiru",
        prescriptionRef: "RX-9",
        lines: [{ itemId: "i1", instructions: "1 tablet twice a day" }],
      },
    });
    expect(sale.dispensing.patientName).toBe("A Patient");
  });

  test("leaves a sale with no dispensing details alone", () => {
    const sale = { lines: [] };
    expect(withoutPatientDetails(sale)).toBe(sale);
  });
});

describe("Phase 2 dispensing details", () => {
  test("keeps the patient profile and a line's prescribed quantity, refill date and settled balance", () => {
    expect(
      cleanDispensingPayload({
        prescriberName: "Dr A",
        patientId: " p1 ",
        lines: [
          { itemId: "i1", instructions: "", quantityPrescribed: 30, refillDueOn: "2026-12-20" },
          { itemId: "i2", settlesLineId: " line-9 " },
          { itemId: "i3", instructions: " ", quantityPrescribed: 0 },
        ],
      }),
    ).toEqual({
      prescriberName: "Dr A",
      patientId: "p1",
      lines: [
        { itemId: "i1", quantityPrescribed: 30, refillDueOn: "2026-12-20" },
        { itemId: "i2", settlesLineId: "line-9" },
      ],
    });
  });

  test("works out when a supply runs out, and gives nothing for a bad number", () => {
    const today = new Date(2026, 10, 20);
    expect(refillDueDate(30, today)).toBe("2026-12-20");
    expect(refillDueDate(7, today)).toBe("2026-11-27");
    expect(refillDueDate(0, today)).toBeUndefined();
    expect(refillDueDate(Number.NaN, today)).toBeUndefined();
    expect(refillDueDate(1000, today)).toBeUndefined();
  });
});

describe("saleFingerprint", () => {
  test("the same medicines in another order, or split over two lines, are the same sale", () => {
    expect(
      saleFingerprint([
        { itemId: "amox", quantity: 2 },
        { itemId: "para", quantity: 1 },
      ]),
    ).toBe(
      saleFingerprint([
        { itemId: "para", quantity: 1 },
        { itemId: "amox", quantity: 1 },
        { itemId: "amox", quantity: 1 },
      ]),
    );
  });

  test("a different quantity, a new medicine or a removed one is a different sale", () => {
    const base = saleFingerprint([{ itemId: "amox", quantity: 2 }]);
    expect(saleFingerprint([{ itemId: "amox", quantity: 3 }])).not.toBe(base);
    expect(saleFingerprint([{ itemId: "amox", quantity: 2 }, { itemId: "para", quantity: 1 }])).not.toBe(base);
    expect(saleFingerprint([])).not.toBe(base);
  });

  test("lines with no product (airtime) or no positive quantity are left out", () => {
    expect(saleFingerprint([{ itemId: null, quantity: 1 }, { itemId: "amox", quantity: 0 }])).toBe("");
  });
});
