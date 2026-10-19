import { describe, expect, test } from "bun:test";

import {
  estimateKenyaStatutory,
  formatPayrollDate,
  payrollPaymentScheduleRows,
  payrollPaymentMethodLabel,
} from "@/lib/payroll-utils";

describe("estimateKenyaStatutory", () => {
  test("matches the backend NSSF/SHIF/Levy/PAYE stack at 30k", () => {
    expect(estimateKenyaStatutory(30_000)).toEqual({
      nssf: 1_800,
      shif: 825,
      housingLevy: 450,
      paye: 731.25,
      total: 3_806.25,
    });
  });

  test("low pay is covered by the personal relief", () => {
    // 20k: taxable 17,950 → 10% tax 1,795 is below the 2,400 relief.
    expect(estimateKenyaStatutory(20_000)).toEqual({
      nssf: 1_200,
      shif: 550,
      housingLevy: 300,
      paye: 0,
      total: 2_050,
    });
  });

  test("NSSF tops out at the 36k tier", () => {
    const breakdown = estimateKenyaStatutory(100_000);
    expect(breakdown.nssf).toBe(2_160);
    expect(breakdown.total).toBeGreaterThan(breakdown.paye);
  });

  test("zero and negative gross produce no deductions", () => {
    expect(estimateKenyaStatutory(0).total).toBe(0);
    expect(estimateKenyaStatutory(-5_000).total).toBe(0);
  });
});

describe("payrollPaymentScheduleRows", () => {
  const base = {
    branchName: "Main",
    employmentStatus: "active",
    baseSalary: 30_000,
    suggestedNet: 26_000,
    alreadyPaid: false,
  };

  test("keeps only payable staff and sorts by name", () => {
    const rows = payrollPaymentScheduleRows([
      { ...base, displayName: "Zawadi" },
      { ...base, displayName: "Amina" },
      { ...base, displayName: "Paid", alreadyPaid: true },
      { ...base, displayName: "Leave", employmentStatus: "on_leave" },
      { ...base, displayName: "No salary", baseSalary: 0 },
    ]);

    expect(rows.map((row) => row.displayName)).toEqual(["Amina", "Zawadi"]);
  });
});

describe("payrollPaymentMethodLabel", () => {
  test("labels the three supported methods", () => {
    expect(payrollPaymentMethodLabel("mpesa_manual")).toBe("M-Pesa");
    expect(payrollPaymentMethodLabel("bank")).toBe("Bank transfer");
    expect(payrollPaymentMethodLabel("cash")).toBe("Cash");
    expect(payrollPaymentMethodLabel(null)).toBe("M-Pesa");
  });
});

describe("formatPayrollDate", () => {
  test("keeps a date-only pay day on the same calendar day", () => {
    expect(formatPayrollDate("2026-10-25")).toContain("25");
    expect(formatPayrollDate("2026-10-25")).toContain("Oct");
    expect(formatPayrollDate(null)).toBe("—");
  });
});
