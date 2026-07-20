import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  __resetTillLockBroadcastForTests,
  broadcastTillLock,
  broadcastTillUnlock,
  subscribeToTillLockBroadcasts,
  type TillLockBroadcastMessage,
} from "@/lib/till-lock-broadcast";

describe("till-lock-broadcast", () => {
  const previousBC = globalThis.BroadcastChannel;

  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    __resetTillLockBroadcastForTests();
  });

  afterEach(() => {
    __resetTillLockBroadcastForTests();
    Object.defineProperty(globalThis, "BroadcastChannel", {
      configurable: true,
      value: previousBC,
    });
  });

  it("broadcast helpers are safe when BroadcastChannel is unavailable", () => {
    Object.defineProperty(globalThis, "BroadcastChannel", {
      configurable: true,
      value: undefined,
    });
    __resetTillLockBroadcastForTests();

    expect(() => broadcastTillLock("idle")).not.toThrow();
    expect(() => broadcastTillUnlock()).not.toThrow();
    const unsub = subscribeToTillLockBroadcasts(() => undefined);
    expect(() => unsub()).not.toThrow();
  });

  it("notifies subscribers when a sibling channel posts", () => {
    const instances: Array<{
      name: string;
      listeners: Set<(event: MessageEvent) => void>;
    }> = [];

    class FakeBroadcastChannel {
      name: string;
      listeners = new Set<(event: MessageEvent) => void>();

      constructor(name: string) {
        this.name = name;
        instances.push(this);
      }

      addEventListener(
        type: string,
        listener: (event: MessageEvent) => void,
      ) {
        if (type === "message") this.listeners.add(listener);
      }

      postMessage(data: TillLockBroadcastMessage) {
        for (const instance of instances) {
          if (instance === this || instance.name !== this.name) continue;
          for (const listener of instance.listeners) {
            listener({ data } as MessageEvent);
          }
        }
      }

      close() {
        this.listeners.clear();
      }
    }

    Object.defineProperty(globalThis, "BroadcastChannel", {
      configurable: true,
      value: FakeBroadcastChannel,
    });
    __resetTillLockBroadcastForTests();

    const received: TillLockBroadcastMessage[] = [];
    const unsub = subscribeToTillLockBroadcasts((msg) => {
      received.push(msg);
    });

    expect(instances.length).toBe(1);
    const sibling = new FakeBroadcastChannel("ub-till-lock");
    sibling.postMessage({ type: "lock", reason: "idle" });
    sibling.postMessage({ type: "unlock" });

    expect(received).toEqual([
      { type: "lock", reason: "idle" },
      { type: "unlock" },
    ]);

    unsub();
  });
});
