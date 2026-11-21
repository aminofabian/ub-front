import { describe, expect, test } from "bun:test";

import { formatPatientNo, looksLikePatientNo, patientMatchDetail } from "./pharmacy-patient-no";

describe("patient numbers", () => {
  test("are shown padded to four digits", () => {
    expect(formatPatientNo(412)).toBe("P-0412");
    expect(formatPatientNo(7)).toBe("P-0007");
    expect(formatPatientNo(123456)).toBe("P-123456");
  });

  test("a profile with no number shows nothing", () => {
    expect(formatPatientNo(null)).toBe("");
    expect(formatPatientNo(undefined)).toBe("");
    expect(formatPatientNo(0)).toBe("");
  });

  test("typed numbers are told apart from phone numbers", () => {
    expect(looksLikePatientNo("P-412")).toBe(true);
    expect(looksLikePatientNo(" p 0412 ")).toBe(true);
    expect(looksLikePatientNo("P#7")).toBe(true);
    expect(looksLikePatientNo("0722000000")).toBe(false);
    expect(looksLikePatientNo("412")).toBe(false);
    expect(looksLikePatientNo("Peter")).toBe(false);
  });

  test("the detail tells people on one phone apart", () => {
    expect(patientMatchDetail({ patientNo: 412, ageYears: 34 })).toBe("P-0412 \u00b7 34 years");
    expect(patientMatchDetail({ patientNo: 413, ageYears: 1 })).toBe("P-0413 \u00b7 1 year");
    expect(patientMatchDetail({ patientNo: 414, ageYears: 0 })).toBe("P-0414 \u00b7 under 1 year");
    expect(patientMatchDetail({ patientNo: null, ageYears: 6 })).toBe("6 years");
    expect(patientMatchDetail({})).toBe("");
  });
});
