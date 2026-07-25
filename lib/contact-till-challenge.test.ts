import { describe, expect, test } from "bun:test";

import {
  contactChallengePayload,
  createContactTillChallenge,
} from "./contact-till-challenge";

describe("createContactTillChallenge", () => {
  test("produces solvable challenges with matching payload answers", () => {
    for (let i = 0; i < 80; i += 1) {
      const challenge = createContactTillChallenge();
      expect(challenge.expectedAnswer).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(challenge.expectedAnswer)).toBe(true);

      const payload = contactChallengePayload(challenge);
      expect(payload.challengeKind).toBe(challenge.kind);
      expect(payload.challengeAnswer).toBe(challenge.expectedAnswer);

      if (challenge.kind === "CHANGE") {
        const total = challenge.lines.reduce(
          (sum, line) => sum + line.qty * line.unitPrice,
          0,
        );
        expect(challenge.tendered!).toBeGreaterThan(total);
        expect(challenge.expectedAnswer).toBe(challenge.tendered! - total);
      }

      if (challenge.kind === "TOTAL" || challenge.kind === "MULTIPLY") {
        const total = challenge.lines.reduce(
          (sum, line) => sum + line.qty * line.unitPrice,
          0,
        );
        expect(challenge.expectedAnswer).toBe(total);
      }

      if (challenge.kind === "DISCOUNT") {
        expect(challenge.expectedAnswer).toBe(
          challenge.baseAmount! -
            (challenge.baseAmount! * challenge.percent!) / 100,
        );
      }

      if (challenge.kind === "VAT") {
        expect(challenge.expectedAnswer).toBe(
          challenge.baseAmount! +
            (challenge.baseAmount! * challenge.percent!) / 100,
        );
      }

      if (challenge.kind === "MISSING") {
        const known = challenge.lines.reduce(
          (sum, line) => sum + line.qty * line.unitPrice,
          0,
        );
        expect(challenge.expectedAnswer).toBe(challenge.baseAmount! - known);
      }

      if (challenge.kind === "INVENTORY") {
        expect(challenge.expectedAnswer).toBe(
          challenge.baseAmount! - challenge.secondaryAmount!,
        );
      }
    }
  });
});
