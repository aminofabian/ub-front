import { describe, expect, test } from "bun:test";

import {
  DEFAULT_RESEND_COOLDOWN_SECONDS,
} from "@/lib/resend-cooldown";

describe("resend cooldown defaults", () => {
  test("default window is 45 seconds", () => {
    expect(DEFAULT_RESEND_COOLDOWN_SECONDS).toBe(45);
  });
});
