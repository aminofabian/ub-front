import { describe, expect, it } from "vitest";

import {
  displaySupplierName,
  isRealSupplierLink,
  isSystemUnassignedSupplier,
  UNLINKED_SUPPLIER_DISPLAY_LABEL,
} from "./supplier-display";

describe("supplier-display", () => {
  it("detects SYS-UNASSIGNED by code", () => {
    expect(
      isSystemUnassignedSupplier({ code: "SYS-UNASSIGNED", name: "Anything" }),
    ).toBe(true);
  });

  it("detects legacy unassigned name", () => {
    expect(
      isSystemUnassignedSupplier({ name: "Unassigned (migrate)" }),
    ).toBe(true);
  });

  it("maps placeholder supplier to merchant label", () => {
    expect(
      displaySupplierName({
        name: "Unassigned (migrate)",
        code: "SYS-UNASSIGNED",
      }),
    ).toBe(UNLINKED_SUPPLIER_DISPLAY_LABEL);
  });

  it("keeps real supplier names", () => {
    expect(displaySupplierName({ name: "Jamro Wholesalers" })).toBe(
      "Jamro Wholesalers",
    );
  });

  it("filters synthetic links from real supplier lists", () => {
    expect(
      isRealSupplierLink({ supplierName: "Unassigned (migrate)" }),
    ).toBe(false);
    expect(isRealSupplierLink({ supplierName: "Jamro" })).toBe(true);
  });
});
