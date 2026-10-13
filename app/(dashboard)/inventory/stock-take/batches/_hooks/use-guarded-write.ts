"use client";

import { useCallback, useState } from "react";

export type GuardedWrite = {
  busy: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  write: <T>(run: () => Promise<T>, fallback: string) => Promise<T | null>;
};

/** Runs one server write at a time, turning failures into a readable message. */
export function useGuardedWrite(): GuardedWrite {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const write = useCallback(
    async <T,>(run: () => Promise<T>, fallback: string): Promise<T | null> => {
      setBusy(true);
      setError(null);
      try {
        return await run();
      } catch (e) {
        setError(e instanceof Error ? e.message : fallback);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { busy, error, setError, write };
}
