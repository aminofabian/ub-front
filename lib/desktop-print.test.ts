import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
  type Mock,
} from "bun:test";

/**
 * kickCashDrawer used to swallow every failure, so a dead cash drawer gave the
 * cashier and the developer nothing to go on. These tests pin the contract:
 * it never rejects, always logs, and tells the cashier unless asked not to.
 */

type ToastFn = (
  message: string,
  options?: { id?: string; duration?: number },
) => string;
const newToastFn = (): Mock<ToastFn> => mock<ToastFn>(() => "id");

const kickDesktop = mock<() => Promise<void>>(async () => {});
const kickViaBridge = mock<(target: unknown) => Promise<void>>(async () => {});
const bridgeUp = mock<() => Promise<boolean>>(async () => true);

const toastError = newToastFn();
const toastMessage = newToastFn();
const toastStub = Object.assign(newToastFn(), {
  error: toastError,
  message: toastMessage,
  success: newToastFn(),
  warning: newToastFn(),
  info: newToastFn(),
  loading: newToastFn(),
  custom: newToastFn(),
  promise: newToastFn(),
  dismiss: newToastFn(),
});

const spyConsole = (method: "error" | "warn") =>
  spyOn(console, method).mockImplementation(() => {});

let kickCashDrawer: typeof import("@/lib/desktop-print").kickCashDrawer;
let ApiRequestError: typeof import("@/lib/api").ApiRequestError;
let realRuntime: typeof import("@/lib/runtime");

function runtime(isDesktop: boolean) {
  mock.module("@/lib/runtime", () => ({ ...realRuntime, IS_DESKTOP: isDesktop }));
}

beforeAll(async () => {
  realRuntime = await import("@/lib/runtime");
  const realDesktopApi = await import("@/lib/desktop-api");
  const realBridge = await import("@/lib/till-print-bridge");

  mock.module("sonner", () => ({ toast: toastStub, Toaster: () => null }));
  mock.module("@/lib/desktop-api", () => ({
    ...realDesktopApi,
    kickDesktopCashDrawer: () => kickDesktop(),
  }));
  mock.module("@/lib/till-print-bridge", () => ({
    ...realBridge,
    isTillPrintBridgeUp: () => bridgeUp(),
    kickCashDrawerViaTillBridge: (target: unknown) => kickViaBridge(target),
    getLocalTillCupsName: () => null,
    getLocalTillNetworkTarget: () => null,
  }));
  runtime(false);

  ({ ApiRequestError } = await import("@/lib/api"));
  ({ kickCashDrawer } = await import("@/lib/desktop-print"));
});

let consoleError: ReturnType<typeof spyConsole>;
let consoleWarn: ReturnType<typeof spyConsole>;

beforeEach(() => {
  for (const m of [kickDesktop, kickViaBridge, bridgeUp, toastError, toastMessage]) {
    m.mockClear();
  }
  kickDesktop.mockImplementation(async () => {});
  kickViaBridge.mockImplementation(async () => {});
  bridgeUp.mockImplementation(async () => true);
  consoleError = spyConsole("error");
  consoleWarn = spyConsole("warn");
});

afterEach(() => {
  consoleError.mockRestore();
  consoleWarn.mockRestore();
});

describe("kickCashDrawer on the desktop till", () => {
  beforeEach(() => runtime(true));

  it("returns true and stays silent when the bridge accepts the pulse", async () => {
    expect(await kickCashDrawer()).toBe(true);
    expect(toastError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("logs and toasts the bridge's own error text when the pulse is refused", async () => {
    kickDesktop.mockImplementation(async () => {
      throw new ApiRequestError(
        "Device bridge drawer kick failed: HTTP 500 — CUPS lp not found",
        502,
        {},
      );
    });

    expect(await kickCashDrawer()).toBe(false);

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(String(consoleError.mock.calls[0]?.[0])).toContain("[cash-drawer]");
    expect(toastError).toHaveBeenCalledTimes(1);
    const [text, options] = toastError.mock.calls[0] ?? [];
    expect(text).toContain("Cash drawer did not open.");
    expect(text).toContain("CUPS lp not found");
    expect(options?.id).toBe("cash-drawer-kick");
  });

  it("only logs when asked to be quiet", async () => {
    kickDesktop.mockImplementation(async () => {
      throw new Error("boom");
    });
    expect(await kickCashDrawer(null, { quiet: true })).toBe(false);
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("leaves a signed-out session to the sign-in recovery UI", async () => {
    kickDesktop.mockImplementation(async () => {
      throw new ApiRequestError("Session expired", 401, {}, { authRecovery: true });
    });
    expect(await kickCashDrawer()).toBe(false);
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("explains a timeout in plain words", async () => {
    kickDesktop.mockImplementation(async () => {
      const e = new Error("signal timed out");
      e.name = "ClientTimeoutError";
      throw e;
    });
    await kickCashDrawer();
    expect(toastError.mock.calls[0]?.[0]).toContain("did not answer in time");
  });
});

describe("kickCashDrawer in the browser with the Till Print Bridge", () => {
  beforeEach(() => runtime(false));

  it("sends the pulse to the configured printer and stays silent", async () => {
    expect(await kickCashDrawer({ cupsName: "XP-80" })).toBe(true);
    expect(kickViaBridge).toHaveBeenCalledWith({ name: "XP-80", host: null, port: 9100 });
    expect(toastError).not.toHaveBeenCalled();
  });

  it("tells the cashier when the bridge is not running", async () => {
    bridgeUp.mockImplementation(async () => false);
    expect(await kickCashDrawer({ cupsName: "XP-80" })).toBe(false);
    expect(kickViaBridge).not.toHaveBeenCalled();
    expect(toastError.mock.calls[0]?.[0]).toContain("Till Print Bridge is not running");
    expect(consoleWarn).toHaveBeenCalledTimes(1);
  });

  it("reports a browser-level failure (CORS / dropped connection) as such", async () => {
    kickViaBridge.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await kickCashDrawer({ cupsName: "XP-80" })).toBe(false);
    expect(toastError.mock.calls[0]?.[0]).toContain("browser could not reach");
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("surfaces the bridge's error message", async () => {
    kickViaBridge.mockImplementation(async () => {
      throw new Error("Missing or invalid X-Printer-Cups-Name");
    });
    await kickCashDrawer({ cupsName: "XP-80" });
    expect(toastError.mock.calls[0]?.[0]).toContain("X-Printer-Cups-Name");
  });

  // Keep this last: the "no printer" notice is deliberately once per page load.
  it("announces a till with no printer once, not on every cash sale", async () => {
    expect(await kickCashDrawer(null)).toBe(false);
    expect(await kickCashDrawer(null)).toBe(false);
    expect(toastMessage).toHaveBeenCalledTimes(1);
    expect(toastMessage.mock.calls[0]?.[0]).toContain("No receipt printer");
    expect(toastError).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledTimes(2);
    expect(kickViaBridge).not.toHaveBeenCalled();
  });
});
