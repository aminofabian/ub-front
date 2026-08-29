import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useSetupProgressRealtime } from "@/hooks/use-setup-progress-realtime";
import {
  fetchSetupProgress,
  type SetupProgressRecord,
} from "@/lib/api";

type UseSetupProgressOptions = {
  enabled?: boolean;
  /** Poll interval while visible (ms). */
  pollMs?: number;
};

export function useSetupProgress({
  enabled = true,
  pollMs = 30_000,
}: UseSetupProgressOptions = {}) {
  const [data, setData] = useState<SetupProgressRecord | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const prevEarnedRef = useRef<number | null>(null);
  const prevStepRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      return null;
    }
    try {
      const row = await fetchSetupProgress();
      setData(row);
      setError(null);

      if (prevEarnedRef.current != null && row.earnedPoints > prevEarnedRef.current) {
        const delta = row.earnedPoints - prevEarnedRef.current;
        toast.success(`+${delta} pts · ${row.percentComplete}%`);
      } else if (
        prevStepRef.current != null &&
        row.currentStepKey != null &&
        prevStepRef.current !== row.currentStepKey
      ) {
        const step = row.steps.find((s) => s.key === prevStepRef.current);
        if (step?.status === "completed") {
          toast.success(`${step.label} · +${step.earnedPoints} pts`);
        }
      }

      if (row.shopReady && prevEarnedRef.current != null && !row.visible) {
        toast.success("Shop ready — you're set to sell!");
      }

      prevEarnedRef.current = row.earnedPoints;
      prevStepRef.current = row.currentStepKey;
      return row;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load setup progress");
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useSetupProgressRealtime({
    enabled: enabled && (data?.visible ?? true),
    onInvalidate: () => {
      void load();
    },
  });

  useEffect(() => {
    if (!enabled || !data?.visible) return;
    const id = window.setInterval(() => {
      void load();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [enabled, data?.visible, load, pollMs]);

  return { data, loading, error, reload: load };
}
