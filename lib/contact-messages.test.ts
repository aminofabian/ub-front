import { describe, expect, test } from "bun:test";

import { validateContactForm } from "./contact-messages";

describe("validateContactForm", () => {
  test("requires name email and message", () => {
    const errors = validateContactForm({
      name: "",
      email: "",
      phone: "",
      message: "",
    });
    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.message).toBeTruthy();
    expect(errors.phone).toBeUndefined();
  });

  test("rejects invalid email", () => {
    const errors = validateContactForm({
      name: "Ada",
      email: "not-an-email",
      phone: "",
      message: "Hello",
    });
    expect(errors.email).toBeTruthy();
  });

  test("accepts optional blank phone", () => {
    const errors = validateContactForm({
      name: "Ada",
      email: "ada@example.com",
      phone: "",
      message: "Hello",
    });
    expect(errors).toEqual({});
  });

  test("rejects too-short phone digits", () => {
    const errors = validateContactForm({
      name: "Ada",
      email: "ada@example.com",
      phone: "123",
      message: "Hello",
    });
    expect(errors.phone).toBeTruthy();
  });
});
