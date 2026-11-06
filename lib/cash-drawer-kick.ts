/**
 * The cash drawer opens from a pulse sent through the receipt printer, and that
 * pulse used to fail without a trace. This module decides what went wrong and
 * who gets told; lib/desktop-print.ts supplies the real I/O. It imports
 * nothing, so it can be tested without the app's module graph.
 */

export type DrawerKickFailure = {
  /**
   * `no-printer` and `bridge-down` are setup problems; `error` means a pulse
   * was attempted and something refused or dropped it.
   */
  reason: "no-printer" | "bridge-down" | "error";
  /** Plain-language cause, safe to show a cashier. */
  message: string;
  cause?: unknown;
};

export type DrawerKickResult =
  | { ok: true }
  | ({ ok: false } & DrawerKickFailure);

/** Where a browser till prints: what the Till Print Bridge needs to reach the drawer. */
export type DrawerKickPrinter = {
  name: string | null;
  host: string | null;
  port: number;
};

export type DrawerKickIo = {
  isDesktop: boolean;
  /** Desktop till: ask the local device bridge to pulse the drawer. */
  kickDesktop: () => Promise<void>;
  /** Browser till: the printer this till uses, or null when none is set up. */
  findPrinter: () => Promise<DrawerKickPrinter | null>;
  isBridgeUp: () => Promise<boolean>;
  kickViaBridge: (printer: DrawerKickPrinter) => Promise<void>;
};

function drawerErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "ClientTimeoutError") {
      return "The printer did not answer in time.";
    }
    const text = error.message.trim();
    if (text) return text;
  }
  return "The printer refused the drawer pulse.";
}

/**
 * Try one pulse and say exactly why it did not go, if it did not. Never
 * rejects: every failure, including one from a lookup step, comes back as a
 * result the caller can report.
 */
export async function attemptDrawerKick(
  io: DrawerKickIo,
): Promise<DrawerKickResult> {
  // Which half of the job was running when something threw.
  let sending = false;
  try {
    if (io.isDesktop) {
      sending = true;
      await io.kickDesktop();
      return { ok: true };
    }

    const printer = await io.findPrinter();
    if (!printer) {
      return {
        ok: false,
        reason: "no-printer",
        message: "No receipt printer is set up on this till.",
      };
    }
    if (!(await io.isBridgeUp())) {
      return {
        ok: false,
        reason: "bridge-down",
        message: "The Till Print Bridge is not running on this computer.",
      };
    }
    sending = true;
    await io.kickViaBridge(printer);
    return { ok: true };
  } catch (cause) {
    return {
      ok: false,
      reason: "error",
      // fetch() rejects with a TypeError when the request never completes: the
      // bridge dropped it, or the browser blocked it (CORS / local network).
      message:
        sending && !io.isDesktop && cause instanceof TypeError
          ? "The browser could not reach the Till Print Bridge."
          : drawerErrorMessage(cause),
      cause,
    };
  }
}

export type DrawerKickAlerts = {
  /** Console line. `error` is for a pulse that was attempted and failed. */
  log: (level: "warn" | "error", line: string, cause?: unknown) => void;
  /** Toast. A shared `id` makes a new notice replace the last one instead of stacking. */
  toast: (
    kind: "message" | "error",
    text: string,
    options: { id: string; duration: number },
  ) => void;
  /** True for errors the sign-in recovery screen already owns. */
  isAuthRecovery: (cause: unknown) => boolean;
};

const TOAST_ID = "cash-drawer-kick";

/**
 * Build the function that reports a failed pulse. Make one per page load:
 * plenty of tills run without a printer, so "no printer" is announced once
 * rather than on every cash sale.
 */
export function createDrawerKickReporter(alerts: DrawerKickAlerts) {
  let noPrinterNoticeShown = false;

  return function reportDrawerKickFailure(
    failure: DrawerKickFailure,
    quiet = false,
  ): void {
    alerts.log(
      failure.reason === "error" ? "error" : "warn",
      `[cash-drawer] pulse not sent (${failure.reason}): ${failure.message}`,
      failure.cause,
    );
    // A signed-out session has its own recovery UI; a toast on top only confuses.
    if (quiet || alerts.isAuthRecovery(failure.cause)) return;

    if (failure.reason === "no-printer") {
      if (noPrinterNoticeShown) return;
      noPrinterNoticeShown = true;
      alerts.toast(
        "message",
        `${failure.message} The cash drawer will not open on its own.`,
        { id: TOAST_ID, duration: 8_000 },
      );
      return;
    }
    alerts.toast("error", `Cash drawer did not open. ${failure.message}`, {
      id: TOAST_ID,
      duration: 10_000,
    });
  };
}
