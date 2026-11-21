/**
 * Decides whether a change in the printer's drawer switch is a key turn or
 * the pulse the till just sent. The bit itself is not trusted as "open"
 * until a pulse shows which level means open — drawers disagree on polarity.
 */

export const DRAWER_KICK_GRACE_MS = 3_000;

export const CASH_DRAWER_KICK_ARM_EVENT = "kiosk:cash-drawer-kick-arm";
export const CASH_DRAWER_KICKED_EVENT = "kiosk:cash-drawer-kicked";
export const CASH_DRAWER_KICK_CANCEL_EVENT = "kiosk:cash-drawer-kick-cancel";

export type CashDrawerKickArmDetail = { at: number };

export type CashDrawerKickedDetail = {
  clientEventId: string;
  openedAt: string;
  reason: DrawerKickReason;
  saleId: string | null;
};

/** ESC/POS GS r 2 — ask the printer for drawer-kick connector pin 3. */
export const DRAWER_STATUS_COMMAND = [0x1d, 0x72, 0x02] as const;

export type DrawerOpenLevel = "high" | "low";

export type DrawerKickReason = "CASH_SALE" | "REPRINT" | "UNKNOWN";

export type DrawerWatchState = {
  openLevel: DrawerOpenLevel | null;
  lastPinHigh: boolean | null;
  sensorOpenId: string | null;
  lastKickAt: number | null;
  lastKickId: string | null;
  /** The switch went open while a pulse was still in flight. */
  pulseOpen: boolean;
  pulseClosedAt: number | null;
};

export type DrawerWatchEffect =
  | { type: "confirm"; clientEventId: string }
  | { type: "open"; source: "KEY"; clientEventId: string; openedAt: number }
  | { type: "close"; clientEventId: string; closedAt: number };

export type DrawerWatchStep = {
  state: DrawerWatchState;
  effects: DrawerWatchEffect[];
};

export type DrawerOpenBody = {
  clientEventId: string;
  openedAt: string;
  source: "KEY" | "TRIGGERED";
  reason: "KEY" | DrawerKickReason;
  branchId: string;
  shiftId: string | null;
  saleId: string | null;
  sensorConfirmed: boolean;
};

export type DrawerOpenJob =
  | { kind: "open"; body: DrawerOpenBody; closedAt?: string }
  | { kind: "close"; clientEventId: string; closedAt: string }
  | { kind: "confirm"; clientEventId: string };

export function initialDrawerWatchState(
  openLevel: DrawerOpenLevel | null = null,
): DrawerWatchState {
  return {
    openLevel,
    lastPinHigh: null,
    sensorOpenId: null,
    lastKickAt: null,
    lastKickId: null,
    pulseOpen: false,
    pulseClosedAt: null,
  };
}

/** Bit 0 of the GS r 2 reply is drawer-kick pin 3. */
export function pinHighFromStatus(raw: number): boolean {
  return (raw & 0x01) === 0x01;
}

export function newDrawerEventId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function armDrawerKick(state: DrawerWatchState, at: number): DrawerWatchState {
  return {
    ...state,
    lastKickAt: at,
    lastKickId: null,
    pulseOpen: false,
    pulseClosedAt: null,
  };
}

/** Fold a switch movement that happened during the pulse into the kick we are about to save. */
export function commitDrawerKick(
  state: DrawerWatchState,
  kick: { at: number; clientEventId: string },
): { state: DrawerWatchState; sensorConfirmed: boolean; closedAt: number | null } {
  const sensorConfirmed = state.pulseOpen || state.pulseClosedAt != null;
  const closedAt = state.pulseClosedAt;
  const stillOpen = sensorConfirmed && closedAt == null;
  return {
    sensorConfirmed,
    closedAt,
    state: {
      ...state,
      lastKickAt: kick.at,
      lastKickId: kick.clientEventId,
      pulseOpen: false,
      pulseClosedAt: null,
      sensorOpenId: stillOpen ? kick.clientEventId : state.sensorOpenId,
    },
  };
}

/** The pulse was refused. A switch movement during it is a key, not a kick. */
export function cancelDrawerKick(
  state: DrawerWatchState,
  newId: () => string,
): DrawerWatchStep {
  const sawSwitch = state.pulseOpen || state.pulseClosedAt != null;
  const next: DrawerWatchState = {
    ...state,
    lastKickAt: null,
    lastKickId: null,
    pulseOpen: false,
    pulseClosedAt: null,
  };
  if (!sawSwitch || state.openLevel == null) {
    return { state: next, effects: [] };
  }
  const clientEventId = newId();
  const effects: DrawerWatchEffect[] = [
    {
      type: "open",
      source: "KEY",
      clientEventId,
      openedAt: state.lastKickAt ?? Date.now(),
    },
  ];
  if (state.pulseClosedAt != null) {
    effects.push({
      type: "close",
      clientEventId,
      closedAt: state.pulseClosedAt,
    });
    return { state: next, effects };
  }
  next.sensorOpenId = clientEventId;
  return { state: next, effects };
}

export function stepDrawerWatch(
  state: DrawerWatchState,
  sample: { pinHigh: boolean; now: number },
  newId: () => string,
): DrawerWatchStep {
  if (state.lastPinHigh === null) {
    return { state: { ...state, lastPinHigh: sample.pinHigh }, effects: [] };
  }
  if (state.lastPinHigh === sample.pinHigh) {
    return { state, effects: [] };
  }
  return pinChanged(state, sample, newId);
}

export function enqueueDrawerJob(
  jobs: DrawerOpenJob[],
  job: DrawerOpenJob,
): DrawerOpenJob[] {
  if (job.kind === "open") {
    return enqueueOpen(jobs, job);
  }
  if (job.kind === "confirm") {
    return enqueueConfirm(jobs, job);
  }
  return enqueueClose(jobs, job);
}

function pinChanged(
  state: DrawerWatchState,
  sample: { pinHigh: boolean; now: number },
  newId: () => string,
): DrawerWatchStep {
  const level: DrawerOpenLevel = sample.pinHigh ? "high" : "low";
  const next: DrawerWatchState = { ...state, lastPinHigh: sample.pinHigh };
  const kickRecent = isRecentKick(state, sample.now);
  if (next.openLevel == null) {
    if (!kickRecent) return { state: next, effects: [] };
    next.openLevel = level;
  }
  if (level === next.openLevel) {
    return markOpened(next, kickRecent, sample.now, newId);
  }
  return markClosed(next, sample.now);
}

function markOpened(
  state: DrawerWatchState,
  kickRecent: boolean,
  now: number,
  newId: () => string,
): DrawerWatchStep {
  if (kickRecent && state.lastKickId) {
    if (state.sensorOpenId === state.lastKickId) return { state, effects: [] };
    return {
      state: { ...state, sensorOpenId: state.lastKickId, pulseOpen: false },
      effects: [{ type: "confirm", clientEventId: state.lastKickId }],
    };
  }
  if (kickRecent) {
    return { state: { ...state, pulseOpen: true }, effects: [] };
  }
  if (state.sensorOpenId) return { state, effects: [] };
  const clientEventId = newId();
  return {
    state: { ...state, sensorOpenId: clientEventId },
    effects: [{ type: "open", source: "KEY", clientEventId, openedAt: now }],
  };
}

function markClosed(state: DrawerWatchState, now: number): DrawerWatchStep {
  if (state.pulseOpen && !state.sensorOpenId) {
    return { state: { ...state, pulseClosedAt: now }, effects: [] };
  }
  if (!state.sensorOpenId) return { state, effects: [] };
  return {
    state: { ...state, sensorOpenId: null },
    effects: [{ type: "close", clientEventId: state.sensorOpenId, closedAt: now }],
  };
}

function isRecentKick(state: DrawerWatchState, now: number): boolean {
  if (state.lastKickAt == null) return false;
  const age = now - state.lastKickAt;
  return age >= 0 && age <= DRAWER_KICK_GRACE_MS;
}

function enqueueOpen(
  jobs: DrawerOpenJob[],
  job: Extract<DrawerOpenJob, { kind: "open" }>,
): DrawerOpenJob[] {
  const duplicate = jobs.some(
    (item) => item.kind === "open" && item.body.clientEventId === job.body.clientEventId,
  );
  if (duplicate) return jobs;
  return [...jobs, job];
}

function enqueueConfirm(
  jobs: DrawerOpenJob[],
  job: Extract<DrawerOpenJob, { kind: "confirm" }>,
): DrawerOpenJob[] {
  let found = false;
  const next = jobs.map((item) => {
    if (item.kind !== "open" || item.body.clientEventId !== job.clientEventId) {
      return item;
    }
    found = true;
    return { ...item, body: { ...item.body, sensorConfirmed: true } };
  });
  if (found) return next;
  const queued = jobs.some(
    (item) => item.kind === "confirm" && item.clientEventId === job.clientEventId,
  );
  if (queued) return jobs;
  return [...jobs, job];
}

function enqueueClose(
  jobs: DrawerOpenJob[],
  job: Extract<DrawerOpenJob, { kind: "close" }>,
): DrawerOpenJob[] {
  let found = false;
  const next = jobs.map((item) => {
    if (item.kind === "open" && item.body.clientEventId === job.clientEventId) {
      found = true;
      return { ...item, closedAt: job.closedAt };
    }
    if (item.kind === "close" && item.clientEventId === job.clientEventId) {
      found = true;
      return job;
    }
    return item;
  });
  if (found) return next;
  return [...jobs, job];
}
