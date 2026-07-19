import { afterEach, describe, expect, it } from "bun:test";

import {
  __resetAuthRefreshLockForTests,
  withAuthRefreshLock,
  withCrossTabLock,
} from "@/lib/cross-tab-lock";

function installQueuingLocks(): void {
  let chain: Promise<unknown> = Promise.resolve();
  (globalThis.navigator as Navigator & { locks: LockManager }).locks = {
    request: (_name: string, callback: (lock: Lock | null) => Promise<unknown>) => {
      const run = chain.then(() => callback({ name: _name } as Lock));
      // Keep the queue alive even if a callback rejects.
      chain = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  } as LockManager;
}

describe("cross-tab-lock", () => {
  afterEach(() => {
    __resetAuthRefreshLockForTests();
    const nav = globalThis.navigator as Navigator & { locks?: unknown };
    delete (nav as { locks?: unknown }).locks;
  });

  it("runs callback when Web Locks API is unavailable", async () => {
    const result = await withCrossTabLock("test-lock", async () => "ok");
    expect(result).toBe("ok");
  });

  it("serializes callbacks via navigator.locks.request", async () => {
    installQueuingLocks();
    const order: string[] = [];

    await Promise.all([
      withCrossTabLock("ub.test", async () => {
        order.push("1-start");
        await new Promise((r) => setTimeout(r, 30));
        order.push("1-end");
      }),
      withCrossTabLock("ub.test", async () => {
        order.push("2-start");
        order.push("2-end");
      }),
    ]);

    expect(order).toEqual(["1-start", "1-end", "2-start", "2-end"]);
  });

  it("withAuthRefreshLock is reentrant (nested call does not wait on itself)", async () => {
    installQueuingLocks();
    let nested = false;
    await withAuthRefreshLock(async () => {
      await withAuthRefreshLock(async () => {
        nested = true;
      });
    });
    expect(nested).toBe(true);
  });
});
