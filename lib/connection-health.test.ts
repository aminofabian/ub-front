import { afterEach, describe, expect, it } from "bun:test";

import {
  __resetConnectionHealthForTests,
  getConnectionHealth,
  markApiSuccess,
  markApiTrouble,
  subscribeConnectionHealth,
  type ConnectionHealth,
} from "@/lib/connection-health";

afterEach(() => {
  __resetConnectionHealthForTests();
});

describe("connection health", () => {
  it("stays quiet for a single blip", () => {
    markApiTrouble();
    expect(getConnectionHealth()).toBe("ok");
  });

  it("goes unstable once failures look like a pattern", () => {
    markApiTrouble();
    markApiTrouble();
    expect(getConnectionHealth()).toBe("unstable");
  });

  it("clears silently on the next success", () => {
    markApiTrouble();
    markApiTrouble();
    markApiSuccess();
    expect(getConnectionHealth()).toBe("ok");
  });

  it("requires a fresh pattern after recovering", () => {
    markApiTrouble();
    markApiTrouble();
    markApiSuccess();
    markApiTrouble();
    expect(getConnectionHealth()).toBe("ok");
  });

  it("notifies subscribers on each transition, not each failure", () => {
    const seen: ConnectionHealth[] = [];
    subscribeConnectionHealth((state) => seen.push(state));

    markApiTrouble();
    markApiTrouble();
    markApiTrouble();
    markApiSuccess();
    markApiSuccess();

    expect(seen).toEqual(["unstable", "ok"]);
  });

  it("stops notifying after unsubscribe", () => {
    const seen: ConnectionHealth[] = [];
    const unsubscribe = subscribeConnectionHealth((state) => seen.push(state));
    unsubscribe();

    markApiTrouble();
    markApiTrouble();

    expect(seen).toEqual([]);
  });
});
