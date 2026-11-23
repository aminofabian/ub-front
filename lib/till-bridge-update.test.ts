import { describe, expect, test } from "bun:test";

import {
  tillBridgeNeedsDrawerUpdate,
  type TillBridgeHealth,
} from "./till-print-bridge";

const running: TillBridgeHealth = { ok: true, platform: "win32", printEngine: "v5-bypass-epson" };

describe("tillBridgeNeedsDrawerUpdate", () => {
  test("an older helper that is running needs the drawer update", () => {
    expect(tillBridgeNeedsDrawerUpdate(running)).toBe(true);
  });

  test("a helper that can read the switch through a queue does not", () => {
    expect(tillBridgeNeedsDrawerUpdate({ ...running, drawerSwitch: "queue" })).toBe(false);
  });

  test("a helper that is not running is an install, not an update", () => {
    expect(tillBridgeNeedsDrawerUpdate(null)).toBe(false);
    expect(tillBridgeNeedsDrawerUpdate({ ok: false })).toBe(false);
  });
});
