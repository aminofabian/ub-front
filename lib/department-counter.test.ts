import { describe, expect, it } from "vitest";

import {
  buildDepartmentInvoiceNotes,
  isDepartmentHeadRole,
  parseDepartmentInvoiceNotes,
} from "@/lib/department-counter";

describe("department-counter notes", () => {
  it("builds department and customer notes", () => {
    expect(
      buildDepartmentInvoiceNotes({
        departmentLabel: "Butchery",
        customerName: "Jane",
      }),
    ).toBe("Butchery · Customer: Jane");
    expect(
      buildDepartmentInvoiceNotes({ departmentLabel: "Bakery" }),
    ).toBe("Bakery");
    expect(
      buildDepartmentInvoiceNotes({ customerName: "Kelc" }),
    ).toBe("Customer: Kelc");
    expect(buildDepartmentInvoiceNotes({})).toBeUndefined();
  });

  it("parses notes back for cashier prefill", () => {
    expect(parseDepartmentInvoiceNotes("Butchery · Customer: Jane")).toEqual({
      departmentLabel: "Butchery",
      customerName: "Jane",
    });
    expect(parseDepartmentInvoiceNotes("Fresh Produce")).toEqual({
      departmentLabel: "Fresh Produce",
      customerName: null,
    });
    expect(parseDepartmentInvoiceNotes("Customer: Kelc")).toEqual({
      departmentLabel: null,
      customerName: "Kelc",
    });
  });

  it("recognizes department head role key", () => {
    expect(isDepartmentHeadRole("grocery_clerk")).toBe(true);
    expect(isDepartmentHeadRole("Grocery_Clerk")).toBe(true);
    expect(isDepartmentHeadRole("cashier")).toBe(false);
  });
});
