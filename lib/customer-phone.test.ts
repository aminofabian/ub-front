import { describe, expect, it } from "vitest";

import {
  customerPhoneValidationMessage,
  isValidCustomerPhone,
  normalizeCustomerPhone,
  requiredCustomerPhoneLength,
} from "./customer-phone";

describe("customer phone tab validation", () => {
  it("requires 10 digits when starting with 0", () => {
    expect(requiredCustomerPhoneLength("0712345678")).toBe(10);
    expect(isValidCustomerPhone("0712345678")).toBe(true);
    expect(isValidCustomerPhone("071234567")).toBe(false);
    expect(isValidCustomerPhone("07123456789")).toBe(false);
  });

  it("requires 9 digits when not starting with 0", () => {
    expect(requiredCustomerPhoneLength("712345678")).toBe(9);
    expect(isValidCustomerPhone("712345678")).toBe(true);
    expect(isValidCustomerPhone("71234567")).toBe(false);
    expect(isValidCustomerPhone("7123456789")).toBe(false);
  });

  it("strips non-digits before validating", () => {
    expect(normalizeCustomerPhone("0712 345 678")).toBe("0712345678");
    expect(isValidCustomerPhone("0712 345 678")).toBe(true);
    expect(isValidCustomerPhone("712-345-678")).toBe(true);
  });

  it("returns clear validation messages", () => {
    expect(customerPhoneValidationMessage("")).toMatch(/Enter/);
    expect(customerPhoneValidationMessage("0712")).toMatch(/10 digits/);
    expect(customerPhoneValidationMessage("712")).toMatch(/9 digits/);
    expect(customerPhoneValidationMessage("0712345678")).toBeNull();
    expect(customerPhoneValidationMessage("712345678")).toBeNull();
  });
});
