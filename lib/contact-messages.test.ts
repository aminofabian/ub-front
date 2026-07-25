import { describe, expect, test } from "bun:test";

import { validateContactForm } from "./contact-messages";

describe("validateContactForm", () => {
  test("requires name email message and answer", () => {
    const errors = validateContactForm({
      name: "",
      email: "",
      phone: "",
      message: "",
      challengeAnswer: "",
      challengeExpected: 295,
    });
    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.message).toBeTruthy();
    expect(errors.challengeAnswer).toBeTruthy();
    expect(errors.phone).toBeUndefined();
  });

  test("rejects invalid email", () => {
    const errors = validateContactForm({
      name: "Ada",
      email: "not-an-email",
      phone: "",
      message: "Hello",
      challengeAnswer: "295",
      challengeExpected: 295,
    });
    expect(errors.email).toBeTruthy();
  });

  test("accepts optional blank phone with correct answer", () => {
    const errors = validateContactForm({
      name: "Ada",
      email: "ada@example.com",
      phone: "",
      message: "Hello",
      challengeAnswer: "295",
      challengeExpected: 295,
    });
    expect(errors).toEqual({});
  });

  test("rejects too-short phone digits", () => {
    const errors = validateContactForm({
      name: "Ada",
      email: "ada@example.com",
      phone: "123",
      message: "Hello",
      challengeAnswer: "295",
      challengeExpected: 295,
    });
    expect(errors.phone).toBeTruthy();
  });

  test("rejects wrong till answer", () => {
    const errors = validateContactForm({
      name: "Ada",
      email: "ada@example.com",
      phone: "",
      message: "Hello",
      challengeAnswer: "300",
      challengeExpected: 295,
    });
    expect(errors.challengeAnswer).toBeTruthy();
  });
});
