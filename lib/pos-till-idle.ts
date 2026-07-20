/**
 * Per-tab idle countdown for till lock. Caller pauses via {@link clear} when
 * the document is hidden or the till is already locked.
 */
export type PosTillIdleController = {
  /** Restart the idle countdown from now. */
  reset: () => void;
  /** Cancel any pending idle lock. */
  clear: () => void;
};

export type PosTillIdleTimers = {
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
};

export function createPosTillIdleController(
  idleMs: number,
  onIdle: () => void,
  timers: PosTillIdleTimers = {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  },
): PosTillIdleController {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer != null) {
      timers.clearTimeout(timer);
      timer = null;
    }
  };

  const reset = () => {
    clear();
    timer = timers.setTimeout(() => {
      timer = null;
      onIdle();
    }, idleMs);
  };

  return { reset, clear };
}
