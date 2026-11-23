import { describe, expect, it } from "bun:test";

import {
  armDrawerKick,
  cancelDrawerKick,
  commitDrawerKick,
  DRAWER_KICK_GRACE_MS,
  enqueueDrawerJob,
  initialDrawerWatchState,
  pinHighFromStatus,
  stepDrawerWatch,
  type DrawerOpenBody,
  type DrawerWatchState,
} from "@/lib/cash-drawer-watch";

function idFactory(): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `id-${n}`;
  };
}

function watch(overrides: Partial<DrawerWatchState> = {}): DrawerWatchState {
  return { ...initialDrawerWatchState(), ...overrides };
}

const OPENING: DrawerOpenBody = {
  clientEventId: "open-1",
  openedAt: "2026-11-21T18:00:00.000Z",
  source: "TRIGGERED",
  reason: "CASH_SALE",
  branchId: "branch-1",
  shiftId: "shift-1",
  saleId: null,
  sensorConfirmed: false,
};

describe("pinHighFromStatus", () => {
  it("reads drawer-kick pin 3 from bit 0", () => {
    expect(pinHighFromStatus(0x00)).toBe(false);
    expect(pinHighFromStatus(0x01)).toBe(true);
    expect(pinHighFromStatus(0x11)).toBe(true);
  });
});

describe("stepDrawerWatch", () => {
  it("does not treat the first sample, or a change before any pulse, as a key", () => {
    const nextId = idFactory();
    const first = stepDrawerWatch(watch(), { pinHigh: false, now: 1_000 }, nextId);
    expect(first.effects).toEqual([]);

    const changed = stepDrawerWatch(first.state, { pinHigh: true, now: 2_000 }, nextId);
    expect(changed.effects).toEqual([]);
    expect(changed.state.openLevel).toBeNull();
  });

  it("learns the open level from a change during a pulse and confirms that kick", () => {
    const nextId = idFactory();
    let state = armDrawerKick(watch({ lastPinHigh: false }), 5_000);
    const during = stepDrawerWatch(state, { pinHigh: true, now: 5_400 }, nextId);
    expect(during.effects).toEqual([]);
    expect(during.state.openLevel).toBe("high");
    expect(during.state.pulseOpen).toBe(true);

    const committed = commitDrawerKick(during.state, { at: 5_000, clientEventId: "kick-1" });
    expect(committed.sensorConfirmed).toBe(true);
    expect(committed.state.sensorOpenId).toBe("kick-1");

    const closed = stepDrawerWatch(
      committed.state,
      { pinHigh: false, now: 9_000 },
      nextId,
    );
    expect(closed.effects).toEqual([
      { type: "close", clientEventId: "kick-1", closedAt: 9_000 },
    ]);
  });

  it("records a key once the drawer has sat shut, with no sale and no pulse", () => {
    const nextId = idFactory();
    let state = watch();
    state = stepDrawerWatch(state, { pinHigh: false, now: 1_000 }, nextId).state;
    state = stepDrawerWatch(state, { pinHigh: false, now: 2_000 }, nextId).state;
    state = stepDrawerWatch(state, { pinHigh: false, now: 3_000 }, nextId).state;
    expect(state.openLevel).toBe("high");

    const opened = stepDrawerWatch(state, { pinHigh: true, now: 4_000 }, nextId);
    expect(opened.effects[0]).toMatchObject({ type: "open", source: "KEY", openedAt: 4_000 });
  });

  it("records a key when the switch opens with no recent pulse", () => {
    const state = watch({
      openLevel: "high",
      lastPinHigh: false,
      lastKickAt: 1_000,
    });
    const step = stepDrawerWatch(
      state,
      { pinHigh: true, now: 1_000 + DRAWER_KICK_GRACE_MS + 1 },
      idFactory(),
    );
    expect(step.effects[0]).toMatchObject({
      type: "open",
      source: "KEY",
      openedAt: 1_000 + DRAWER_KICK_GRACE_MS + 1,
    });
  });

  it("records a later key when the previous opening never reported a close", () => {
    const state = watch({
      openLevel: "high",
      lastPinHigh: false,
      sensorOpenId: "still-open",
      restingSamples: 1,
    });
    const step = stepDrawerWatch(state, { pinHigh: true, now: 9_000 }, idFactory());
    expect(step.effects.map((effect) => effect.type)).toEqual(["close", "open"]);
    expect(step.effects[1]).toMatchObject({ type: "open", source: "KEY" });
  });

  it("keeps a switch movement when the pulse is refused", () => {
    const nextId = idFactory();
    let state = armDrawerKick(watch({ lastPinHigh: false }), 8_000);
    state = stepDrawerWatch(state, { pinHigh: true, now: 8_200 }, nextId).state;
    const cancelled = cancelDrawerKick(state, nextId);
    expect(cancelled.effects[0]).toMatchObject({ type: "open", source: "KEY" });
    expect(cancelled.state.sensorOpenId).toBe(
      cancelled.effects[0] && "clientEventId" in cancelled.effects[0]
        ? cancelled.effects[0].clientEventId
        : null,
    );
  });
});

describe("enqueueDrawerJob", () => {
  it("folds a close and a confirm into an opening that has not been sent", () => {
    const queued = enqueueDrawerJob([], { kind: "open", body: OPENING });
    const confirmed = enqueueDrawerJob(queued, { kind: "confirm", clientEventId: "open-1" });
    const closed = enqueueDrawerJob(confirmed, {
      kind: "close",
      clientEventId: "open-1",
      closedAt: "2026-11-21T18:00:08.000Z",
    });
    expect(closed).toEqual([
      {
        kind: "open",
        body: { ...OPENING, sensorConfirmed: true },
        closedAt: "2026-11-21T18:00:08.000Z",
      },
    ]);
  });

  it("does not queue the same opening twice", () => {
    const once = enqueueDrawerJob([], { kind: "open", body: OPENING });
    expect(enqueueDrawerJob(once, { kind: "open", body: OPENING })).toBe(once);
  });
});
