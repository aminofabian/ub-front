import { describe, expect, test } from "bun:test";

import type { DispensingRecord, SchemeClaim } from "./pharmacy-api";
import { claimSheetHtml, dispensingLabelsHtml, escapeHtml } from "./pharmacy-labels";

const record: DispensingRecord = {
  id: "r1",
  saleId: "s1",
  receiptNo: 12,
  branchId: "b1",
  createdAt: "2026-11-20T09:00:00Z",
  dispensedByUserId: "u1",
  dispensedByName: "Achieng",
  dispensedByTitle: null,
  dispensedByRegistrationNo: null,
  soldByName: null,
  approvedByPin: false,
  prescriberName: "Dr Wanjiru",
  prescriberRegNo: null,
  prescriptionRef: null,
  prescriptionDate: null,
  patientName: "A <b>Patient</b>",
  patientPhone: null,
  voidedAt: null,
  lines: [
    { itemId: "i1", itemName: "Amoxicillin 500mg", dispensingClass: "PRESCRIPTION_ONLY", quantity: 21, instructions: "1 three times a day", lotNumbers: "L1" },
    { itemId: "i2", itemName: "Metformin & more", dispensingClass: "PRESCRIPTION_ONLY", quantity: 60, instructions: null, lotNumbers: null },
  ],
};

describe("dispensing labels", () => {
  test("escapes markup", () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });

  test("makes one label per medicine and never lets typed text become markup", () => {
    const html = dispensingLabelsHtml(record, "Nila <Pharmacy>");
    expect(html.match(/<section class="label">/g)?.length).toBe(2);
    expect(html).toContain("Nila &lt;Pharmacy&gt;");
    expect(html).toContain("A &lt;b&gt;Patient&lt;/b&gt;");
    expect(html).not.toContain("<b>Patient</b>");
    expect(html).toContain("Metformin &amp; more");
    expect(html).toContain("1 three times a day");
    expect(html).toContain("Lot L1");
    expect(html).toContain("Keep out of the reach of children");
  });

  test("leaves a blank space to write directions when none were typed", () => {
    expect(dispensingLabelsHtml(record, "Shop")).toContain('class="directions blank"');
  });
});

describe("claim sheet", () => {
  const claim: SchemeClaim = {
    id: "c1",
    schemeId: "s1",
    schemeName: "Scheme <One>",
    recordId: "r1",
    saleId: "sale1",
    receiptNo: 12,
    branchId: "b1",
    patientName: "A Patient",
    prescriberName: "Dr Wanjiru",
    medicines: "Amoxicillin 500mg x 21, Metformin & more x 60",
    memberNo: "M-<1>",
    authorisationCode: null,
    amountClaimed: 1500,
    amountPaid: 0,
    status: "OPEN",
    statusNote: null,
    createdAt: "2026-11-20T09:00:00Z",
    submittedAt: null,
    settledAt: null,
    ageDays: 0,
  };

  test("lists each medicine, the member and the amount, with typed text escaped", () => {
    const html = claimSheetHtml(claim, "Nila Pharmacy");
    expect(html.match(/<li>/g)?.length).toBe(2);
    expect(html).toContain("Scheme &lt;One&gt;");
    expect(html).toContain("M-&lt;1&gt;");
    expect(html).toContain("Metformin &amp; more x 60");
    expect(html).toContain("KES 1,500.00");
    expect(html).toContain("#12");
  });

  test("leaves out rows that have no value", () => {
    expect(claimSheetHtml(claim, "Shop")).not.toContain("Authorisation code");
  });
});
