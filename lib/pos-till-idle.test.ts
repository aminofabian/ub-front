import { describe, expect, it } from "bun:test";

import { createPosTillIdleController } from "@/lib/pos-till-idle";

describe("createPosTillIdleController", () => {
  it("fires onIdle after idleMs and resets on activity", () => {
    let scheduled: { cb: () => void; ms: number } | null = null;
    let calls = 0;
    const idle = createPosTillIdleController(
      5_000,
      () => {
        calls += 1;
      },
      {
        setTimeout: ((cb: () => void, ms?: number) => {
          scheduled = { cb, ms: ms ?? 0 };
          return 1 as unknown as ReturnType<typeof setTimeout>;
        }) as typeof setTimeout,
        clearTimeout: (() => {
          scheduled = null;
        }) as typeof clearTimeout,
      },
    );

    idle.reset();
    expect(scheduled?.ms).toBe(5_000);

    // Activity before fire — reschedule.
    idle.reset();
    expect(calls).toBe(0);
    expect(scheduled?.ms).toBe(5_000);

    scheduled?.cb();
    expect(calls).toBe(1);
  });

  it("clear cancels a pending idle lock", () => {
    let scheduled: { cb: () => void } | null = null;
    let calls = 0;
    const idle = createPosTillIdleController(
      1_000,
      () => {
        calls += 1;
      },
      {
        setTimeout: ((cb: () => void) => {
          scheduled = { cb };
          return 1 as unknown as ReturnType<typeof setTimeout>;
        }) as typeof setTimeout,
        clearTimeout: (() => {
          scheduled = null;
        }) as typeof clearTimeout,
      },
    );

    idle.reset();
    idle.clear();
    expect(scheduled).toBeNull();
    expect(calls).toBe(0);
  });
});
