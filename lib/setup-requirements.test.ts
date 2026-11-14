import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";

import {
  POS_GUIDANCE_EVENT,
  POS_GUIDANCE_RESOLVED_EVENT,
  notifyPosGuidanceResolved,
} from "@/lib/pos-guidance";
import {
  SETUP_REQUIRED_CODE,
  __resetSetupRequirementsForTests,
  activeSetupHostId,
  completeSetup,
  currentSetupRequest,
  hasSetupHost,
  isSetupDelegated,
  notifySetupRequired,
  parseSetupRequired,
  pauseForSetup,
  registerSetupDelegate,
  registerSetupHost,
  requestSetup,
  setupBlockedMessage,
  setupGapFromShiftProbe,
  setupRequiredFromError,
  subscribeSetup,
  withSetup,
  type SetupRequirement,
} from "@/lib/setup-requirements";

// The module listens for the POS "resolved" event on `window`; the bun runner has none.
const hadWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
beforeAll(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: new EventTarget(),
  });
});

afterAll(() => {
  if (hadWindow) {
    Object.defineProperty(globalThis, "window", hadWindow);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
});

afterEach(() => {
  __resetSetupRequirementsForTests();
});

/** Resolves to "pending" if the promise has not settled yet. */
async function peek(promise: Promise<boolean>): Promise<boolean | "pending"> {
  return Promise.race([
    promise,
    new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), 0)),
  ]);
}

describe("parseSetupRequired", () => {
  it("reads the tagged problem the API sends", () => {
    expect(
      parseSetupRequired({ code: SETUP_REQUIRED_CODE, requirement: "shift" }),
    ).toEqual({ requirement: "shift" });
    expect(
      parseSetupRequired({ code: SETUP_REQUIRED_CODE, requirement: "till" }),
    ).toEqual({ requirement: "till" });
  });

  it("keeps the branch hint and drops anything unknown", () => {
    for (const hint of ["none", "pick", "assign"]) {
      expect(
        parseSetupRequired({
          code: SETUP_REQUIRED_CODE,
          requirement: "branch",
          hint,
        }),
      ).toEqual({ requirement: "branch", hint });
    }
    expect(
      parseSetupRequired({
        code: SETUP_REQUIRED_CODE,
        requirement: "branch",
        hint: "other",
      }),
    ).toEqual({ requirement: "branch" });
  });

  it("ignores a hint on requirements that do not take one", () => {
    expect(
      parseSetupRequired({
        code: SETUP_REQUIRED_CODE,
        requirement: "shift",
        hint: "pick",
      }),
    ).toEqual({ requirement: "shift" });
  });

  it("returns null for every other error", () => {
    expect(parseSetupRequired(null)).toBeNull();
    expect(parseSetupRequired("No open shift")).toBeNull();
    expect(parseSetupRequired({ title: "No open shift", status: 409 })).toBeNull();
    expect(parseSetupRequired({ code: "other", requirement: "shift" })).toBeNull();
    expect(
      parseSetupRequired({ code: SETUP_REQUIRED_CODE, requirement: "wallet" }),
    ).toBeNull();
    expect(parseSetupRequired({ code: SETUP_REQUIRED_CODE })).toBeNull();
  });
});

describe("without a host", () => {
  it("answers false straight away so the caller can fall back", async () => {
    expect(hasSetupHost()).toBe(false);
    expect(await requestSetup({ requirement: "branch", hint: "none" })).toBe(false);
    expect(notifySetupRequired({ requirement: "shift" })).toBe(false);
    expect(currentSetupRequest()).toBeNull();
  });
});

describe("with a host", () => {
  it("shows the request and resolves true once it is set up", async () => {
    registerSetupHost();
    const answer = requestSetup({ requirement: "shift" });

    expect(currentSetupRequest()).toEqual({ requirement: "shift" });
    expect(await peek(answer)).toBe("pending");

    completeSetup("shift", true);
    expect(await answer).toBe(true);
    expect(currentSetupRequest()).toBeNull();
  });

  it("resolves false when the person dismisses it", async () => {
    registerSetupHost();
    const answer = requestSetup({ requirement: "branch", hint: "none" });
    completeSetup("branch", false);
    expect(await answer).toBe(false);
    expect(currentSetupRequest()).toBeNull();
  });

  it("lets a second ask for the same thing join the dialog already open", async () => {
    registerSetupHost();
    const first = requestSetup({ requirement: "shift" });
    const second = requestSetup({ requirement: "shift" });

    completeSetup("shift", true);
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(currentSetupRequest()).toBeNull();
  });

  it("shows different requirements one after another", async () => {
    registerSetupHost();
    const branch = requestSetup({ requirement: "branch", hint: "none" });
    const till = requestSetup({ requirement: "till" });

    expect(currentSetupRequest()).toEqual({ requirement: "branch", hint: "none" });
    completeSetup("branch", true);
    expect(await branch).toBe(true);

    expect(currentSetupRequest()).toEqual({ requirement: "till" });
    completeSetup("till", false);
    expect(await till).toBe(false);
  });

  it("tells subscribers whenever the request changes", () => {
    registerSetupHost();
    let calls = 0;
    const stop = subscribeSetup(() => {
      calls += 1;
    });
    void requestSetup({ requirement: "till" });
    completeSetup("till", true);
    stop();
    completeSetup("till", true);
    expect(calls).toBe(2);
  });

  it("ignores a completion nobody asked for", () => {
    registerSetupHost();
    expect(() => completeSetup("shift", true)).not.toThrow();
    expect(currentSetupRequest()).toBeNull();
  });

  it("notifySetupRequired reports that a dialog will show", () => {
    registerSetupHost();
    expect(notifySetupRequired({ requirement: "shift" })).toBe(true);
    expect(currentSetupRequest()).toEqual({ requirement: "shift" });
  });
});

describe("hosts", () => {
  it("only the newest host draws, and the previous one takes over when it leaves", () => {
    const outer = registerSetupHost();
    const inner = registerSetupHost();
    expect(activeSetupHostId()).toBe(inner.id);

    inner.unregister();
    expect(activeSetupHostId()).toBe(outer.id);
    outer.unregister();
    expect(activeSetupHostId()).toBeNull();
  });

  it("releases waiters as false when the last host goes away", async () => {
    const host = registerSetupHost();
    const answer = requestSetup({ requirement: "shift" });
    host.unregister();
    expect(await answer).toBe(false);
    expect(currentSetupRequest()).toBeNull();
  });

  it("keeps waiting while another host is still mounted", async () => {
    const outer = registerSetupHost();
    const inner = registerSetupHost();
    const answer = requestSetup({ requirement: "shift" });

    inner.unregister();
    expect(await peek(answer)).toBe("pending");
    expect(currentSetupRequest()).toEqual({ requirement: "shift" });

    completeSetup("shift", true);
    expect(await answer).toBe(true);
    outer.unregister();
  });
});

describe("screen-owned dialogs", () => {
  it("hands the request to a delegate and keeps the shared dialog away", async () => {
    registerSetupHost();
    let opened = 0;
    registerSetupDelegate("shift", () => {
      opened += 1;
      return true;
    });

    const answer = requestSetup({ requirement: "shift" });
    expect(opened).toBe(1);
    expect(isSetupDelegated(currentSetupRequest())).toBe(true);

    completeSetup("shift", true);
    expect(await answer).toBe(true);
  });

  it("falls back to the shared dialog when the delegate declines", () => {
    registerSetupHost();
    registerSetupDelegate("shift", () => false);

    void requestSetup({ requirement: "shift" });
    expect(isSetupDelegated(currentSetupRequest())).toBe(false);
  });

  it("falls back when the delegate throws", () => {
    registerSetupHost();
    registerSetupDelegate("shift", () => {
      throw new Error("modal unmounted");
    });

    void requestSetup({ requirement: "shift" });
    expect(isSetupDelegated(currentSetupRequest())).toBe(false);
  });

  it("only takes the requirement it was registered for", () => {
    registerSetupHost();
    registerSetupDelegate("shift", () => true);

    void requestSetup({ requirement: "till" });
    expect(isSetupDelegated(currentSetupRequest())).toBe(false);
  });

  it("stops taking requests once it unregisters", () => {
    registerSetupHost();
    const stop = registerSetupDelegate("shift", () => true);
    stop();

    void requestSetup({ requirement: "shift" });
    expect(isSetupDelegated(currentSetupRequest())).toBe(false);
  });

  it("offers a queued request to its delegate once it reaches the front", async () => {
    registerSetupHost();
    let opened = 0;
    registerSetupDelegate("shift", () => {
      opened += 1;
      return true;
    });

    const branch = requestSetup({ requirement: "branch", hint: "none" });
    const shift = requestSetup({ requirement: "shift" });
    expect(opened).toBe(0);

    completeSetup("branch", true);
    await branch;
    expect(opened).toBe(1);
    expect(isSetupDelegated(currentSetupRequest())).toBe(true);

    completeSetup("shift", true);
    expect(await shift).toBe(true);
  });
});

describe("screens that fix it themselves", () => {
  it("treats an opened shift as the requirement being met", async () => {
    registerSetupHost();
    const answer = requestSetup({ requirement: "shift" });

    notifyPosGuidanceResolved("open-shift");
    expect(await answer).toBe(true);
    expect(currentSetupRequest()).toBeNull();
  });

  it("treats a registered till as the requirement being met", async () => {
    registerSetupHost();
    const answer = requestSetup({ requirement: "till" });

    notifyPosGuidanceResolved("register-till");
    expect(await answer).toBe(true);
  });

  it("does not mix the two up", async () => {
    registerSetupHost();
    const answer = requestSetup({ requirement: "till" });

    notifyPosGuidanceResolved("open-shift");
    expect(await peek(answer)).toBe("pending");
  });

  it("uses the shared event name", () => {
    expect(POS_GUIDANCE_RESOLVED_EVENT).toBe("ub:pos-guidance-resolved");
  });
});

/** A failed API call, as `ApiRequestError` carries it: a message plus the problem body. */
function apiError(message: string, payload: unknown): Error {
  return Object.assign(new Error(message), { payload });
}

/** Lets promise callbacks that were queued by a settled request run. */
function settled(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("setupRequiredFromError", () => {
  it("reads the problem body a failed API call carries", () => {
    const error = apiError("Forbidden", {
      code: SETUP_REQUIRED_CODE,
      requirement: "till",
    });
    expect(setupRequiredFromError(error)).toEqual({ requirement: "till" });
  });

  it("is null for errors that carry none", () => {
    expect(setupRequiredFromError(new Error("boom"))).toBeNull();
    expect(setupRequiredFromError(apiError("x", { title: "x" }))).toBeNull();
    expect(setupRequiredFromError("No open shift")).toBeNull();
    expect(setupRequiredFromError(null)).toBeNull();
  });
});

describe("setupGapFromShiftProbe", () => {
  it("prefers the tag, whatever the words say", () => {
    const error = apiError("Forbidden", {
      code: SETUP_REQUIRED_CODE,
      requirement: "till",
    });
    expect(setupGapFromShiftProbe(error)).toEqual({ requirement: "till" });
  });

  it("reads the plain message from a server that does not tag it", () => {
    expect(setupGapFromShiftProbe(new Error("No open shift"))).toEqual({
      requirement: "shift",
    });
    expect(setupGapFromShiftProbe(new Error("404 Not Found"))).toEqual({
      requirement: "shift",
    });
  });

  it("leaves any other failure alone", () => {
    expect(
      setupGapFromShiftProbe(new Error("Can't reach the server right now.")),
    ).toBeNull();
    expect(setupGapFromShiftProbe("nope")).toBeNull();
  });
});

describe("setupBlockedMessage", () => {
  it("names the thing to do and what it was blocking", () => {
    expect(setupBlockedMessage("shift", "charging")).toBe(
      "Open a shift on this till before charging.",
    );
    expect(setupBlockedMessage("till", "completing the sale")).toBe(
      "Register this till before completing the sale.",
    );
    expect(setupBlockedMessage("branch", "completing the sale")).toBe(
      "Choose a branch before completing the sale.",
    );
  });
});

describe("pauseForSetup", () => {
  const guidance: string[] = [];
  const onGuidance = (event: Event) => {
    guidance.push((event as CustomEvent<{ kind: string }>).detail.kind);
  };
  beforeAll(() => {
    (globalThis.window as unknown as EventTarget).addEventListener(
      POS_GUIDANCE_EVENT,
      onGuidance,
    );
  });
  afterAll(() => {
    (globalThis.window as unknown as EventTarget).removeEventListener(
      POS_GUIDANCE_EVENT,
      onGuidance,
    );
  });
  afterEach(() => {
    guidance.length = 0;
  });

  function hold(
    gap: Parameters<typeof pauseForSetup>[0],
    tried?: SetupRequirement[],
  ) {
    const resumed: SetupRequirement[][] = [];
    const blocked: string[] = [];
    pauseForSetup(gap, {
      action: "completing the sale",
      tried,
      resume: (next) => resumed.push(next),
      onBlocked: (message) => blocked.push(message),
    });
    return { resumed, blocked };
  }

  it("shows the dialog, then resumes once it is set up", async () => {
    registerSetupHost();
    const { resumed, blocked } = hold({ requirement: "till" });

    expect(currentSetupRequest()).toEqual({ requirement: "till" });
    expect(resumed).toEqual([]);

    completeSetup("till", true);
    await settled();

    expect(resumed).toEqual([["till"]]);
    expect(blocked).toEqual([]);
    expect(guidance).toEqual([]);
  });

  it("hands back everything this sale has been through, so the next ask can tell", async () => {
    registerSetupHost();
    const { resumed } = hold({ requirement: "shift" }, ["till"]);

    completeSetup("shift", true);
    await settled();

    expect(resumed).toEqual([["till", "shift"]]);
  });

  it("raises the banner and says it plainly when the dialog is put away", async () => {
    registerSetupHost();
    const { resumed, blocked } = hold({ requirement: "shift" });

    completeSetup("shift", false);
    await settled();

    expect(resumed).toEqual([]);
    expect(blocked).toEqual(["Open a shift on this till before completing the sale."]);
    expect(guidance).toEqual(["open-shift"]);
  });

  it("points at the till banner for an unregistered till", async () => {
    registerSetupHost();
    const { blocked } = hold({ requirement: "till" });

    completeSetup("till", false);
    await settled();

    expect(blocked).toEqual(["Register this till before completing the sale."]);
    expect(guidance).toEqual(["register-till"]);
  });

  it("falls back straight away when this screen has no dialog host", async () => {
    const { resumed, blocked } = hold({ requirement: "shift" });
    await settled();

    expect(resumed).toEqual([]);
    expect(blocked).toEqual(["Open a shift on this till before completing the sale."]);
    expect(guidance).toEqual(["open-shift"]);
  });

  it("does not ask again for something this sale already went through", async () => {
    registerSetupHost();
    const { resumed, blocked } = hold({ requirement: "shift" }, ["shift"]);
    await settled();

    expect(currentSetupRequest()).toBeNull();
    expect(resumed).toEqual([]);
    expect(blocked).toEqual(["Open a shift on this till before completing the sale."]);
    expect(guidance).toEqual(["open-shift"]);
  });

  it("walks a brand-new till through register, then shift, then the sale", async () => {
    registerSetupHost();
    const steps: SetupRequirement[][] = [];
    const attempt = (tried: SetupRequirement[], needs: SetupRequirement | null) => {
      if (!needs) {
        return;
      }
      pauseForSetup(
        { requirement: needs },
        {
          action: "completing the sale",
          tried,
          resume: (next) => {
            steps.push(next);
            attempt(next, needs === "till" ? "shift" : null);
          },
          onBlocked: () => {
            throw new Error("should not be blocked");
          },
        },
      );
    };

    attempt([], "till");
    expect(currentSetupRequest()).toEqual({ requirement: "till" });
    completeSetup("till", true);
    await settled();

    expect(currentSetupRequest()).toEqual({ requirement: "shift" });
    completeSetup("shift", true);
    await settled();

    expect(steps).toEqual([["till"], ["till", "shift"]]);
  });
});

describe("withSetup", () => {
  const refused = (requirement: SetupRequirement) =>
    Object.assign(new Error(`Set up the ${requirement} first`), {
      payload: { code: SETUP_REQUIRED_CODE, requirement },
    });

  it("opens the dialog for what is missing, then runs the call again", async () => {
    registerSetupHost();
    let calls = 0;
    const result = withSetup(async () => {
      calls += 1;
      if (calls === 1) throw refused("shift");
      return "paid";
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(currentSetupRequest()?.requirement).toBe("shift");
    completeSetup("shift", true);
    expect(await result).toBe("paid");
    expect(calls).toBe(2);
  });

  it("walks through two things in a row: the till, then the shift", async () => {
    registerSetupHost();
    const order: SetupRequirement[] = ["till", "shift"];
    let calls = 0;
    const result = withSetup(async () => {
      const missing = order[calls];
      calls += 1;
      if (missing) throw refused(missing);
      return "paid";
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    completeSetup("till", true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(currentSetupRequest()?.requirement).toBe("shift");
    completeSetup("shift", true);
    expect(await result).toBe("paid");
    expect(calls).toBe(3);
  });

  it("gives the server's error back when the dialog is put away, and raises the till banner", async () => {
    registerSetupHost();
    const raised: string[] = [];
    const onGuidance = (event: Event) => raised.push((event as CustomEvent<{ kind: string }>).detail.kind);
    window.addEventListener(POS_GUIDANCE_EVENT, onGuidance);
    const result = withSetup(async () => {
      throw refused("shift");
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    completeSetup("shift", false);
    await expect(result).rejects.toThrow("Set up the shift first");
    expect(raised).toEqual(["open-shift"]);
    window.removeEventListener(POS_GUIDANCE_EVENT, onGuidance);
  });

  it("does not ask twice for the same thing, and leaves other errors alone", async () => {
    registerSetupHost();
    let calls = 0;
    const stuck = withSetup(async () => {
      calls += 1;
      throw refused("shift");
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    completeSetup("shift", true);
    await expect(stuck).rejects.toThrow("Set up the shift first");
    expect(calls).toBe(2);
    expect(currentSetupRequest()).toBeNull();

    await expect(
      withSetup(async () => {
        throw new Error("That time is not available");
      }),
    ).rejects.toThrow("That time is not available");
    expect(currentSetupRequest()).toBeNull();
  });

  it("with nothing mounted to show a dialog, the error comes straight back", async () => {
    await expect(
      withSetup(async () => {
        throw refused("till");
      }),
    ).rejects.toThrow("Set up the till first");
  });
});
