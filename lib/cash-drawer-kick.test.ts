import { describe, expect, it, mock } from "bun:test";

import {
  attemptDrawerKick,
  createDrawerKickReporter,
  type DrawerKickAlerts,
  type DrawerKickIo,
  type DrawerKickPrinter,
} from "@/lib/cash-drawer-kick";

const PRINTER: DrawerKickPrinter = { name: "XP-80", host: null, port: 9100 };

function namedError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

/** A browser till whose printer is set up and whose bridge works. */
function browserIo(overrides: Partial<DrawerKickIo> = {}): DrawerKickIo {
  return {
    isDesktop: false,
    kickDesktop: mock(async () => {}),
    findPrinter: mock(async () => PRINTER),
    isBridgeUp: mock(async () => true),
    kickViaBridge: mock(async () => {}),
    ...overrides,
  };
}

function desktopIo(overrides: Partial<DrawerKickIo> = {}): DrawerKickIo {
  return browserIo({ isDesktop: true, ...overrides });
}

describe("attemptDrawerKick — desktop till", () => {
  it("succeeds without looking up a printer or using the Till Print Bridge", async () => {
    const io = desktopIo();

    expect(await attemptDrawerKick(io)).toEqual({ ok: true });
    expect(io.kickDesktop).toHaveBeenCalledTimes(1);
    expect(io.findPrinter).not.toHaveBeenCalled();
    expect(io.isBridgeUp).not.toHaveBeenCalled();
    expect(io.kickViaBridge).not.toHaveBeenCalled();
  });

  it("returns the device bridge's own error text", async () => {
    const cause = new Error("Printer 'XP-80' is not installed");
    const io = desktopIo({ kickDesktop: mock(async () => Promise.reject(cause)) });

    expect(await attemptDrawerKick(io)).toMatchObject({
      ok: false,
      reason: "error",
      message: "Printer 'XP-80' is not installed",
      cause,
    });
  });

  it("trims the error text", async () => {
    const io = desktopIo({
      kickDesktop: mock(async () => Promise.reject(new Error("  bridge offline \n"))),
    });

    expect(await attemptDrawerKick(io)).toMatchObject({ message: "bridge offline" });
  });

  it.each(["AbortError", "ClientTimeoutError"])(
    "turns a %s into a plain timeout message",
    async (name) => {
      const io = desktopIo({
        kickDesktop: mock(async () => Promise.reject(namedError(name, "signal timed out"))),
      });

      expect(await attemptDrawerKick(io)).toMatchObject({
        ok: false,
        reason: "error",
        message: "The printer did not answer in time.",
      });
    },
  );

  it("falls back to a generic message when the failure has no text", async () => {
    const blank = desktopIo({
      kickDesktop: mock(async () => Promise.reject(new Error(""))),
    });
    const notAnError = desktopIo({
      kickDesktop: mock(async () => Promise.reject("nope")),
    });

    expect(await attemptDrawerKick(blank)).toMatchObject({
      message: "The printer refused the drawer pulse.",
    });
    expect(await attemptDrawerKick(notAnError)).toMatchObject({
      message: "The printer refused the drawer pulse.",
      cause: "nope",
    });
  });

  it("does not blame the Till Print Bridge for a network TypeError", async () => {
    // The desktop app talks to its own server, not the Till Print Bridge.
    const io = desktopIo({
      kickDesktop: mock(async () => Promise.reject(new TypeError("Failed to fetch"))),
    });

    expect(await attemptDrawerKick(io)).toMatchObject({ message: "Failed to fetch" });
  });
});

describe("attemptDrawerKick — browser till", () => {
  it("sends the pulse to the printer the till uses", async () => {
    const lan: DrawerKickPrinter = { name: null, host: "192.168.1.50", port: 9101 };
    const io = browserIo({ findPrinter: mock(async () => lan) });

    expect(await attemptDrawerKick(io)).toEqual({ ok: true });
    expect(io.kickViaBridge).toHaveBeenCalledTimes(1);
    expect(io.kickViaBridge).toHaveBeenCalledWith(lan);
    expect(io.kickDesktop).not.toHaveBeenCalled();
  });

  it("says so when no printer is set up, without probing the bridge", async () => {
    const io = browserIo({ findPrinter: mock(async () => null) });

    expect(await attemptDrawerKick(io)).toEqual({
      ok: false,
      reason: "no-printer",
      message: "No receipt printer is set up on this till.",
    });
    expect(io.isBridgeUp).not.toHaveBeenCalled();
    expect(io.kickViaBridge).not.toHaveBeenCalled();
  });

  it("says so when the Till Print Bridge is not running, without sending", async () => {
    const io = browserIo({ isBridgeUp: mock(async () => false) });

    expect(await attemptDrawerKick(io)).toEqual({
      ok: false,
      reason: "bridge-down",
      message: "The Till Print Bridge is not running on this computer.",
    });
    expect(io.kickViaBridge).not.toHaveBeenCalled();
  });

  it("explains a request that never reached the bridge", async () => {
    const cause = new TypeError("Failed to fetch");
    const io = browserIo({ kickViaBridge: mock(async () => Promise.reject(cause)) });

    expect(await attemptDrawerKick(io)).toMatchObject({
      ok: false,
      reason: "error",
      message: "The browser could not reach the Till Print Bridge.",
      cause,
    });
  });

  it("returns the bridge's own error text", async () => {
    const io = browserIo({
      kickViaBridge: mock(async () =>
        Promise.reject(new Error("lp: The printer or class does not exist.")),
      ),
    });

    expect(await attemptDrawerKick(io)).toMatchObject({
      ok: false,
      reason: "error",
      message: "lp: The printer or class does not exist.",
    });
  });

  it("reports a failing lookup instead of throwing, keeping its own message", async () => {
    // A TypeError here is not "the bridge was unreachable": nothing was sent yet.
    const cause = new TypeError("Failed to fetch");
    const io = browserIo({ findPrinter: mock(async () => Promise.reject(cause)) });

    expect(await attemptDrawerKick(io)).toMatchObject({
      ok: false,
      reason: "error",
      message: "Failed to fetch",
      cause,
    });
    expect(io.kickViaBridge).not.toHaveBeenCalled();
  });

  it("reports a failing bridge probe instead of throwing", async () => {
    const io = browserIo({
      isBridgeUp: mock(async () => Promise.reject(new Error("probe exploded"))),
    });

    expect(await attemptDrawerKick(io)).toMatchObject({
      ok: false,
      reason: "error",
      message: "probe exploded",
    });
    expect(io.kickViaBridge).not.toHaveBeenCalled();
  });
});

function makeAlerts(isAuthRecovery: DrawerKickAlerts["isAuthRecovery"] = () => false) {
  const log = mock<DrawerKickAlerts["log"]>(() => undefined);
  const toast = mock<DrawerKickAlerts["toast"]>(() => undefined);
  const alerts: DrawerKickAlerts = { log, toast, isAuthRecovery };
  return { alerts, log, toast };
}

describe("createDrawerKickReporter", () => {
  it("logs a failed pulse as a console error and toasts it", () => {
    const { alerts, log, toast } = makeAlerts();
    const cause = new Error("HTTP 502");

    createDrawerKickReporter(alerts)({ reason: "error", message: "HTTP 502", cause });

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      "error",
      "[cash-drawer] pulse not sent (error): HTTP 502",
      cause,
    );
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith("error", "Cash drawer did not open. HTTP 502", {
      id: "cash-drawer-kick",
      duration: 10_000,
    });
  });

  it("toasts an error when the bridge is down, but logs it as a warning", () => {
    const { alerts, log, toast } = makeAlerts();

    createDrawerKickReporter(alerts)({
      reason: "bridge-down",
      message: "The Till Print Bridge is not running on this computer.",
    });

    expect(log).toHaveBeenCalledWith(
      "warn",
      "[cash-drawer] pulse not sent (bridge-down): The Till Print Bridge is not running on this computer.",
      undefined,
    );
    expect(toast).toHaveBeenCalledWith(
      "error",
      "Cash drawer did not open. The Till Print Bridge is not running on this computer.",
      { id: "cash-drawer-kick", duration: 10_000 },
    );
  });

  it("announces a missing printer once, and still logs every time", () => {
    const { alerts, log, toast } = makeAlerts();
    const report = createDrawerKickReporter(alerts);
    const failure = {
      reason: "no-printer",
      message: "No receipt printer is set up on this till.",
    } as const;

    report(failure);
    report(failure);
    report(failure);

    expect(log).toHaveBeenCalledTimes(3);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      "message",
      "No receipt printer is set up on this till. The cash drawer will not open on its own.",
      { id: "cash-drawer-kick", duration: 8_000 },
    );
  });

  it("gives every notice the same toast id so they replace each other", () => {
    const { alerts, toast } = makeAlerts();
    const report = createDrawerKickReporter(alerts);

    report({ reason: "no-printer", message: "a" });
    report({ reason: "bridge-down", message: "b" });
    report({ reason: "error", message: "c" });

    const ids = toast.mock.calls.map(([, , options]) => options.id);
    expect(ids).toEqual(["cash-drawer-kick", "cash-drawer-kick", "cash-drawer-kick"]);
  });

  it("logs but stays silent when quiet, without using up the one-time notice", () => {
    const { alerts, log, toast } = makeAlerts();
    const report = createDrawerKickReporter(alerts);
    const noPrinter = { reason: "no-printer", message: "none" } as const;

    report(noPrinter, true);
    report({ reason: "error", message: "boom" }, true);
    expect(log).toHaveBeenCalledTimes(2);
    expect(toast).not.toHaveBeenCalled();

    report(noPrinter);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("logs but does not toast an error the sign-in recovery screen owns", () => {
    const authError = new Error("session expired");
    const { alerts, log, toast } = makeAlerts((cause) => cause === authError);
    const report = createDrawerKickReporter(alerts);

    report({ reason: "error", message: "session expired", cause: authError });

    expect(log).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();

    report({ reason: "error", message: "other", cause: new Error("other") });
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("keeps the once-only notice separate for each reporter", () => {
    const first = makeAlerts();
    const second = makeAlerts();
    const failure = { reason: "no-printer", message: "none" } as const;

    createDrawerKickReporter(first.alerts)(failure);
    createDrawerKickReporter(second.alerts)(failure);

    expect(first.toast).toHaveBeenCalledTimes(1);
    expect(second.toast).toHaveBeenCalledTimes(1);
  });
});
