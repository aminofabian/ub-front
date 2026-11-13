"use client";

/**
 * "Set this up first" prompts.
 *
 * A new shop hits three walls before its first sale: no branch to record against, no shift
 * open on the till, and (for branches that only trust registered devices) a till nobody has
 * registered. The API now tags each of those failures — `code: "setup_required"` plus a
 * `requirement` of `branch`, `shift` or `till` — so the app can open a dialog that explains
 * the thing, says why it matters, and fixes it on the spot instead of throwing a bare error.
 *
 * This module is the small bus between the two halves:
 *
 *  - `lib/api.ts` calls {@link notifySetupRequired} when a response carries the tag.
 *  - Code that sees the gap *before* calling the API (the product form with no branch yet)
 *    calls {@link requestSetup} and awaits the answer, then carries on with what it was doing.
 *  - `SetupRequirementHost` (mounted once per shell) renders the dialog and reports back with
 *    {@link completeSetup}.
 *  - A screen that already owns a richer dialog for one requirement (the till's open-shift
 *    count) can take it over with {@link registerSetupDelegate}.
 */

import {
  POS_GUIDANCE_RESOLVED_EVENT,
  notifyPosGuidance,
} from "@/lib/pos-guidance";

export type SetupRequirement = "branch" | "shift" | "till";

/**
 * Only for `branch`:
 *  - `none`   the business has no branch at all — create one
 *  - `pick`   branches exist but none is chosen
 *  - `assign` this account has no branch; an owner has to assign one
 */
export type BranchSetupHint = "none" | "pick" | "assign";

export type SetupRequiredDetail = {
  requirement: SetupRequirement;
  hint?: BranchSetupHint;
};

/** Stable wire value of `code` on the API's problem document. */
export const SETUP_REQUIRED_CODE = "setup_required";

const REQUIREMENTS: readonly SetupRequirement[] = ["branch", "shift", "till"];
const BRANCH_HINTS: readonly BranchSetupHint[] = ["none", "pick", "assign"];

/**
 * Reads the tagged problem the API sends when something has to be set up first. Returns null
 * for every other error, including the same message from an older server that doesn't tag it.
 */
export function parseSetupRequired(payload: unknown): SetupRequiredDetail | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (record.code !== SETUP_REQUIRED_CODE) {
    return null;
  }
  const requirement = REQUIREMENTS.find((r) => r === record.requirement);
  if (!requirement) {
    return null;
  }
  if (requirement !== "branch") {
    return { requirement };
  }
  const hint = BRANCH_HINTS.find((h) => h === record.hint);
  return hint ? { requirement, hint } : { requirement };
}

/**
 * Same as {@link parseSetupRequired}, for a caught error that carries the problem body (an
 * `ApiRequestError`). Duck-typed on purpose: `lib/api.ts` imports this module, so this module
 * can't import it back.
 */
export function setupRequiredFromError(error: unknown): SetupRequiredDetail | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  return parseSetupRequired((error as { payload?: unknown }).payload);
}

/**
 * What a failed "is a shift open?" probe is asking for, or null when it failed for some other
 * reason. A tagged problem wins; a server that doesn't tag it still says so in words.
 */
export function setupGapFromShiftProbe(error: unknown): SetupRequiredDetail | null {
  const tagged = setupRequiredFromError(error);
  if (tagged) {
    return tagged;
  }
  const message = error instanceof Error ? error.message : "";
  return /not\s*found|404|no open shift/i.test(message)
    ? { requirement: "shift" }
    : null;
}

/**
 * The plain sentence for a screen's own error line, for when the dialog couldn't be shown or
 * was put away. `action` finishes it: "completing the sale", "charging".
 */
export function setupBlockedMessage(
  requirement: SetupRequirement,
  action: string,
): string {
  switch (requirement) {
    case "branch":
      return `Choose a branch before ${action}.`;
    case "till":
      return `Register this till before ${action}.`;
    default:
      return `Open a shift on this till before ${action}.`;
  }
}

type Waiter = (done: boolean) => void;
type Entry = { detail: SetupRequiredDetail; waiters: Waiter[] };

const queue: Entry[] = [];
const listeners = new Set<() => void>();
const hostIds: number[] = [];
const delegates = new Map<SetupRequirement, () => boolean>();
/** Requests a screen-owned dialog took over; the shared host must not draw a second one. */
const delegatedHeads = new WeakSet<SetupRequiredDetail>();
let nextHostId = 1;
let resolvedListenerAttached = false;

function emit(): void {
  for (const listener of [...listeners]) {
    listener();
  }
}

/** For `useSyncExternalStore`. */
export function subscribeSetup(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The request the dialog should show right now; a stable reference until it changes. */
export function currentSetupRequest(): SetupRequiredDetail | null {
  return queue[0]?.detail ?? null;
}

/** The host that should render: the most recently mounted one. */
export function activeSetupHostId(): number | null {
  return hostIds.length > 0 ? hostIds[hostIds.length - 1]! : null;
}

/**
 * A shell calls this while mounted. Several shells can be on screen at once (the dashboard
 * shell around a page that also mounts its own); only the newest one renders, so a prompt is
 * never shown twice.
 */
export function registerSetupHost(): { id: number; unregister: () => void } {
  const id = nextHostId++;
  hostIds.push(id);
  attachResolvedListener();
  emit();
  return {
    id,
    unregister: () => {
      const at = hostIds.indexOf(id);
      if (at >= 0) {
        hostIds.splice(at, 1);
      }
      if (hostIds.length === 0) {
        // Nobody left to answer: release anyone still waiting rather than leaving them hanging.
        for (const entry of queue.splice(0)) {
          settle(entry, false);
        }
      }
      emit();
    },
  };
}

export function hasSetupHost(): boolean {
  return hostIds.length > 0;
}

/**
 * A screen that already has its own dialog for a requirement (the cashier's open-shift count)
 * registers it here. `open` returns true when it took the request, false to let the shared
 * dialog handle it instead.
 */
export function registerSetupDelegate(
  requirement: SetupRequirement,
  open: () => boolean,
): () => void {
  delegates.set(requirement, open);
  return () => {
    if (delegates.get(requirement) === open) {
      delegates.delete(requirement);
    }
  };
}

/** True while a screen-owned dialog is handling the head request, so the host stays out. */
export function isSetupDelegated(detail: SetupRequiredDetail | null): boolean {
  return detail != null && delegatedHeads.has(detail);
}

function settle(entry: Entry, done: boolean): void {
  for (const waiter of entry.waiters) {
    waiter(done);
  }
  entry.waiters = [];
}

function offerToDelegate(entry: Entry): void {
  const open = delegates.get(entry.detail.requirement);
  if (!open) {
    return;
  }
  let taken = false;
  try {
    taken = open();
  } catch {
    taken = false;
  }
  if (taken) {
    delegatedHeads.add(entry.detail);
  }
}

/**
 * Asks the shell to show the dialog for `detail` and resolves when the person finishes:
 * `true` once the thing is set up, `false` if they dismissed it, or if no shell is mounted
 * to show it. Asking again for something already on screen joins the same dialog.
 */
export function requestSetup(detail: SetupRequiredDetail): Promise<boolean> {
  if (!hasSetupHost()) {
    return Promise.resolve(false);
  }
  return new Promise<boolean>((resolve) => {
    const existing = queue.find((e) => e.detail.requirement === detail.requirement);
    if (existing) {
      existing.waiters.push(resolve);
      return;
    }
    const entry: Entry = { detail, waiters: [resolve] };
    queue.push(entry);
    if (queue[0] === entry) {
      offerToDelegate(entry);
    }
    emit();
  });
}

/**
 * Fire-and-forget version for the API layer. Returns false when nothing is mounted that can
 * show the dialog, so the caller falls back to an ordinary error instead of staying silent.
 */
export function notifySetupRequired(detail: SetupRequiredDetail): boolean {
  if (!hasSetupHost()) {
    return false;
  }
  void requestSetup(detail);
  return true;
}

/**
 * Holds something (a sale) while the setup dialog is up. `resume` runs once the person has set
 * the thing up. If they put the dialog away, or this screen has no host to show it, the older
 * POS banner is raised and `onBlocked` gets a plain sentence for the screen's own error line.
 *
 * A new shop can need more than one thing in a row (register the till, then open a shift), so
 * `resume` receives the requirements this attempt has been through. Pass them back as `tried`
 * on the next call: asking again for one that is still unmet would only loop, so that case goes
 * straight to the banner and the sentence.
 */
export function pauseForSetup(
  gap: SetupRequiredDetail,
  options: {
    /** Finishes "… before <action>." — "completing the sale", "charging". */
    action: string;
    tried?: readonly SetupRequirement[];
    resume: (tried: SetupRequirement[]) => void;
    onBlocked: (message: string) => void;
  },
): void {
  const tried = options.tried ?? [];
  const fallBack = () => {
    if (gap.requirement === "shift") {
      notifyPosGuidance("open-shift");
    } else if (gap.requirement === "till") {
      notifyPosGuidance("register-till");
    }
    options.onBlocked(setupBlockedMessage(gap.requirement, options.action));
  };
  if (tried.includes(gap.requirement)) {
    fallBack();
    return;
  }
  void requestSetup(gap).then((done) => {
    if (done) {
      options.resume([...tried, gap.requirement]);
      return;
    }
    fallBack();
  });
}

/**
 * The dialog (or a delegate) reports the outcome. `done` is true when the requirement is now
 * met. Safe to call when nothing is pending.
 */
export function completeSetup(requirement: SetupRequirement, done: boolean): void {
  const at = queue.findIndex((e) => e.detail.requirement === requirement);
  if (at < 0) {
    return;
  }
  const [entry] = queue.splice(at, 1);
  if (entry) {
    settle(entry, done);
  }
  const head = queue[0];
  if (head && !delegatedHeads.has(head.detail)) {
    offerToDelegate(head);
  }
  emit();
}

/**
 * Screens that open a shift or register a till themselves announce it with the POS guidance
 * event; treat that as the requirement being met, so a waiting caller carries on.
 */
function attachResolvedListener(): void {
  if (resolvedListenerAttached || typeof window === "undefined") {
    return;
  }
  resolvedListenerAttached = true;
  window.addEventListener(POS_GUIDANCE_RESOLVED_EVENT, (event) => {
    const kind = (event as CustomEvent<{ kind?: string }>).detail?.kind;
    if (kind === "open-shift") {
      completeSetup("shift", true);
    } else if (kind === "register-till") {
      completeSetup("till", true);
    }
  });
}

/** Test helper: forget every host, delegate, listener and pending request. */
export function __resetSetupRequirementsForTests(): void {
  for (const entry of queue.splice(0)) {
    settle(entry, false);
  }
  hostIds.length = 0;
  delegates.clear();
  listeners.clear();
}
