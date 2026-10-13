"use client";

import { useCallback, useMemo, useState } from "react";

import type { CountCycleBatchLine } from "@/lib/api";
import { filterBatchLines, type BatchLineFilter } from "@/lib/count-cycle/filter-batch-lines";
import { groupBatchLines, type BatchShelf } from "@/lib/count-cycle/group-batch-lines";

export type BatchLineView = {
  filter: BatchLineFilter;
  setFilter: (filter: BatchLineFilter) => void;
  query: string;
  setQuery: (query: string) => void;
  shelves: BatchShelf[];
  orderedLineIds: string[];
  keepVisible: (lineId: string) => void;
};

/** Search + chip over the batch, grouped by shelf; rows counted under the chip stay until it changes. */
export function useBatchLineView(lines: CountCycleBatchLine[]): BatchLineView {
  const [filter, setRawFilter] = useState<BatchLineFilter>("todo");
  const [query, setRawQuery] = useState("");
  const [keptIds, setKeptIds] = useState<ReadonlySet<string>>(new Set());

  const visible = useMemo(
    () => filterBatchLines(lines, filter, query, keptIds),
    [lines, filter, query, keptIds],
  );
  const shelves = useMemo(() => groupBatchLines(visible), [visible]);
  const orderedLineIds = useMemo(() => visible.map((line) => line.lineId), [visible]);

  const setFilter = useCallback((next: BatchLineFilter) => {
    setKeptIds(new Set());
    setRawFilter(next);
  }, []);
  const setQuery = useCallback((next: string) => {
    setKeptIds(new Set());
    setRawQuery(next);
  }, []);
  const keepVisible = useCallback((lineId: string) => {
    setKeptIds((prev) => (prev.has(lineId) ? prev : new Set(prev).add(lineId)));
  }, []);

  return { filter, setFilter, query, setQuery, shelves, orderedLineIds, keepVisible };
}
