"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import type { CountCycleBatchRecord } from "@/lib/api";

import type { GuardedWrite } from "./use-guarded-write";

type BatchRecordState = {
  batch: CountCycleBatchRecord | null;
  setBatch: Dispatch<SetStateAction<CountCycleBatchRecord | null>>;
  loading: boolean;
};

/** Fetches one batch whenever the session changes. */
export function useBatchRecord(
  sessionId: string,
  load: (sessionId: string) => Promise<CountCycleBatchRecord>,
  write: GuardedWrite["write"],
): BatchRecordState {
  const [batch, setBatch] = useState<CountCycleBatchRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void write(() => load(sessionId), "Could not load this batch").then((loaded) => {
      if (loaded) setBatch(loaded);
      setLoading(false);
    });
  }, [sessionId, load, write]);

  return { batch, setBatch, loading };
}
