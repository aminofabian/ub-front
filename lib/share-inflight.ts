/**
 * Coalesce concurrent identical async work into one in-flight promise.
 * Useful against React Strict Mode double-effects and overlapping callers
 * (e.g. till-devices/me from banner + template hook).
 */
const inflight = new Map<string, Promise<unknown>>();

export function shareInflight<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = run().finally(() => {
    if (inflight.get(key) === promise) {
      inflight.delete(key);
    }
  });
  inflight.set(key, promise);
  return promise;
}
