import { apiRequest, ApiRequestError } from "@/lib/api";
import {
  armDrawerKick,
  cancelDrawerKick,
  CASH_DRAWER_KICK_ARM_EVENT,
  CASH_DRAWER_KICK_CANCEL_EVENT,
  CASH_DRAWER_KICKED_EVENT,
  commitDrawerKick,
  enqueueDrawerJob,
  initialDrawerWatchState,
  newDrawerEventId,
  stepDrawerWatch,
  type CashDrawerKickArmDetail,
  type CashDrawerKickedDetail,
  type DrawerOpenBody,
  type DrawerOpenJob,
  type DrawerOpenLevel,
  type DrawerWatchEffect,
} from "@/lib/cash-drawer-watch";
import {
  getLocalTillCupsName,
  getLocalTillNetworkTarget,
  readDrawerSwitch,
} from "@/lib/till-print-bridge";

const QUEUE_KEY = "kiosk.drawer-open-jobs.v1";
const LEVEL_KEY = "kiosk.drawer-open-level.v1";
const SENSOR_POLL_MS = 1_000;
const SENSOR_RETRY_MS = 5_000;
const SENSOR_QUIET_MS = 30_000;
const BRIDGE_DOWN_MS = 15_000;

type SendResult = "ok" | "retry" | "drop";

/**
 * While the till is open, save every drawer pulse and, when the printer
 * answers the drawer switch, every key turn and the time it closed.
 */
export function startCashDrawerOpenLog(input: {
  branchId: string;
  shiftId: string | null;
  printerName?: string | null;
}): { stop: () => void } {
  const branchId = input.branchId.trim();
  const shiftId = input.shiftId?.trim() || null;
  const printerName = input.printerName?.trim() || null;
  if (!branchId || typeof window === "undefined") return { stop() {} };

  let stopped = false;
  let state = initialDrawerWatchState(readLevel());
  let jobs = readJobs();
  let timer = 0;
  let chain = Promise.resolve();

  const run = (work: () => Promise<void>) => {
    chain = chain.then(work, work);
  };

  const onArm = (event: Event) => {
    const at = armAt(event);
    if (at == null) return;
    state = armDrawerKick(state, at);
  };

  const onKick = (event: Event) => {
    const detail = kickedDetail(event);
    if (!detail) return;
    const committed = commitDrawerKick(state, {
      at: Date.parse(detail.openedAt),
      clientEventId: detail.clientEventId,
    });
    state = committed.state;
    rememberLevel(state.openLevel);
    const closedAt = committed.closedAt == null ? null : new Date(committed.closedAt).toISOString();
    run(() => saveOpening(openingFromKick(detail, branchId, shiftId, committed.sensorConfirmed), closedAt));
  };

  const onCancel = () => {
    const cancelled = cancelDrawerKick(state, newDrawerEventId);
    state = cancelled.state;
    rememberLevel(state.openLevel);
    run(() => applyEffects(cancelled.effects));
  };

  window.addEventListener(CASH_DRAWER_KICK_ARM_EVENT, onArm);
  window.addEventListener(CASH_DRAWER_KICKED_EVENT, onKick);
  window.addEventListener(CASH_DRAWER_KICK_CANCEL_EVENT, onCancel);

  const tick = () => {
    if (stopped) return;
    run(async () => {
      jobs = await flushJobs(jobs);
      persist(jobs);
      const delay = await sampleSwitch();
      if (!stopped) timer = window.setTimeout(tick, delay);
    });
  };
  timer = window.setTimeout(tick, SENSOR_POLL_MS);

  async function sampleSwitch(): Promise<number> {
    const reading = await readDrawerSwitch(
      getLocalTillNetworkTarget(),
      getLocalTillCupsName() || printerName,
    );
    if (!reading.readable) return waitFor(reading.reason);
    const step = stepDrawerWatch(
      state,
      { pinHigh: reading.pinHigh, now: Date.now() },
      newDrawerEventId,
    );
    state = step.state;
    rememberLevel(state.openLevel);
    await applyEffects(step.effects);
    return SENSOR_POLL_MS;
  }

  async function applyEffects(effects: DrawerWatchEffect[]): Promise<void> {
    for (const effect of effects) {
      if (effect.type === "open") {
        await saveOpening(openingFromKey(effect, branchId, shiftId), null);
      } else if (effect.type === "close") {
        await saveClose(effect.clientEventId, new Date(effect.closedAt).toISOString());
      } else {
        await saveConfirm(effect.clientEventId);
      }
    }
  }

  async function saveOpening(body: DrawerOpenBody, closedAt: string | null): Promise<void> {
    const outcome = await sendOpen(body);
    if (outcome === "drop") return;
    if (outcome === "retry") {
      hold({ kind: "open", body, ...(closedAt ? { closedAt } : {}) });
      return;
    }
    if (closedAt) await saveClose(body.clientEventId, closedAt);
  }

  async function saveClose(clientEventId: string, closedAt: string): Promise<void> {
    const waiting = jobs.some(
      (job) => job.kind === "open" && job.body.clientEventId === clientEventId,
    );
    if (waiting) {
      hold({ kind: "close", clientEventId, closedAt });
      return;
    }
    const outcome = await sendClose(clientEventId, closedAt);
    if (outcome === "retry") hold({ kind: "close", clientEventId, closedAt });
  }

  async function saveConfirm(clientEventId: string): Promise<void> {
    const waiting = jobs.some(
      (job) => job.kind === "open" && job.body.clientEventId === clientEventId,
    );
    if (waiting) {
      hold({ kind: "confirm", clientEventId });
      return;
    }
    const outcome = await sendConfirm(clientEventId);
    if (outcome === "retry") hold({ kind: "confirm", clientEventId });
  }

  function hold(job: DrawerOpenJob) {
    jobs = enqueueDrawerJob(jobs, job);
    persist(jobs);
  }

  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
      window.removeEventListener(CASH_DRAWER_KICK_ARM_EVENT, onArm);
      window.removeEventListener(CASH_DRAWER_KICKED_EVENT, onKick);
      window.removeEventListener(CASH_DRAWER_KICK_CANCEL_EVENT, onCancel);
    },
  };
}

function waitFor(reason: "queue" | "timeout" | "no-printer" | "bridge-down"): number {
  if (reason === "timeout") return SENSOR_RETRY_MS;
  if (reason === "bridge-down") return BRIDGE_DOWN_MS;
  return SENSOR_QUIET_MS;
}

function openingFromKick(
  detail: CashDrawerKickedDetail,
  branchId: string,
  shiftId: string | null,
  sensorConfirmed: boolean,
): DrawerOpenBody {
  return {
    clientEventId: detail.clientEventId,
    openedAt: detail.openedAt,
    source: "TRIGGERED",
    reason: detail.reason,
    branchId,
    shiftId,
    saleId: detail.saleId,
    sensorConfirmed,
  };
}

function openingFromKey(
  effect: Extract<DrawerWatchEffect, { type: "open" }>,
  branchId: string,
  shiftId: string | null,
): DrawerOpenBody {
  return {
    clientEventId: effect.clientEventId,
    openedAt: new Date(effect.openedAt).toISOString(),
    source: "KEY",
    reason: "KEY",
    branchId,
    shiftId,
    saleId: null,
    sensorConfirmed: true,
  };
}

async function flushJobs(jobs: DrawerOpenJob[]): Promise<DrawerOpenJob[]> {
  const left = [...jobs];
  while (left.length > 0) {
    const job = left[0];
    if (!job) break;
    const outcome = await sendJob(job);
    if (outcome === "retry") return left;
    left.shift();
    if (outcome === "ok" && job.kind === "open" && job.closedAt) {
      left.unshift({ kind: "close", clientEventId: job.body.clientEventId, closedAt: job.closedAt });
    }
  }
  return left;
}

async function sendJob(job: DrawerOpenJob): Promise<SendResult> {
  if (job.kind === "open") return sendOpen(job.body);
  if (job.kind === "close") return sendClose(job.clientEventId, job.closedAt);
  return sendConfirm(job.clientEventId);
}

function sendOpen(body: DrawerOpenBody): Promise<SendResult> {
  return send("/api/v1/cash-drawer/opens", "POST", body, body.clientEventId);
}

function sendClose(clientEventId: string, closedAt: string): Promise<SendResult> {
  return send(`/api/v1/cash-drawer/opens/${clientEventId}`, "PATCH", { closedAt }, clientEventId);
}

function sendConfirm(clientEventId: string): Promise<SendResult> {
  return send(
    `/api/v1/cash-drawer/opens/${clientEventId}`,
    "PATCH",
    { sensorConfirmed: true },
    `${clientEventId}:confirm`,
  );
}

async function send(
  path: string,
  method: "POST" | "PATCH",
  body: unknown,
  idempotencyKey: string,
): Promise<SendResult> {
  try {
    await apiRequest(path, { method, body, toast: false, softAuth: true, idempotencyKey });
    return "ok";
  } catch (error) {
    if (!(error instanceof ApiRequestError)) return "retry";
    if (error.status === 409) return "ok";
    if (error.status === 401) return "retry";
    if (error.status >= 400 && error.status < 500) return "drop";
    return "retry";
  }
}

function armAt(event: Event): number | null {
  if (!(event instanceof CustomEvent)) return null;
  const at = (event.detail as CashDrawerKickArmDetail | null)?.at;
  return typeof at === "number" && Number.isFinite(at) ? at : null;
}

function kickedDetail(event: Event): CashDrawerKickedDetail | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail = event.detail as Partial<CashDrawerKickedDetail> | null;
  if (!detail?.clientEventId || !detail.openedAt || !detail.reason) return null;
  return {
    clientEventId: detail.clientEventId,
    openedAt: detail.openedAt,
    reason: detail.reason,
    saleId: detail.saleId ?? null,
  };
}

function rememberLevel(level: DrawerOpenLevel | null) {
  if (level) writeLevel(level);
}

function readLevel(): DrawerOpenLevel | null {
  try {
    const raw = localStorage.getItem(LEVEL_KEY);
    return raw === "high" || raw === "low" ? raw : null;
  } catch {
    return null;
  }
}

function writeLevel(level: DrawerOpenLevel) {
  try {
    localStorage.setItem(LEVEL_KEY, level);
  } catch {
    // Private mode. The till relearns the switch on the next pulse.
  }
}

function readJobs(): DrawerOpenJob[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isDrawerJob) : [];
  } catch {
    return [];
  }
}

function persist(jobs: DrawerOpenJob[]) {
  try {
    if (jobs.length === 0) localStorage.removeItem(QUEUE_KEY);
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(jobs));
  } catch {
    // The in-memory queue still retries until the page closes.
  }
}

function isDrawerJob(value: unknown): value is DrawerOpenJob {
  if (!value || typeof value !== "object") return false;
  const job = value as { kind?: unknown };
  return job.kind === "open" || job.kind === "close" || job.kind === "confirm";
}
