"use client";

import type { PriceStatusCounts, PriceStatusFilter } from "@/lib/api";
import { cn } from "@/lib/utils";
import styles from "./price-cleanup.module.css";

const BUCKETS: {
  id: PriceStatusFilter;
  label: string;
  countKey: keyof PriceStatusCounts | null;
  work: boolean;
}[] = [
  { id: "ALL", label: "All items", countKey: null, work: false },
  { id: "MISSING_BUYING", label: "Missing buying", countKey: "missingBuying", work: true },
  { id: "MISSING_SELLING", label: "Missing selling", countKey: "missingSelling", work: true },
  { id: "BOTH_MISSING", label: "Both missing", countKey: "bothMissing", work: true },
  { id: "BOTH_SET", label: "Both set", countKey: "bothSet", work: false },
];

type Props = {
  status: PriceStatusFilter;
  counts: PriceStatusCounts;
  listTotal: number;
  listLoading: boolean;
  matchAll: boolean;
  onStatus: (status: PriceStatusFilter) => void;
  onSelectAll: () => void;
};

export function PriceCleanupBar({
  status,
  counts,
  listTotal,
  listLoading,
  matchAll,
  onStatus,
  onSelectAll,
}: Props) {
  const activeCount =
    status === "ALL" ? listTotal : listLoading ? bucketCount(status, counts) : listTotal;
  const showSelectAll = status !== "ALL" && !listLoading && activeCount > 0 && !matchAll;

  return (
    <div className={styles.bar}>
      <span className={styles.title}>Price cleanup</span>
      <div className={styles.sheet} role="tablist" aria-label="Price status">
        {BUCKETS.map((bucket) => {
          const active = status === bucket.id;
          const count =
            bucket.id === status && bucket.id !== "ALL" && !listLoading
              ? listTotal
              : bucket.countKey
                ? counts[bucket.countKey]
                : null;
          const quiet = count === 0;
          return (
            <button
              key={bucket.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onStatus(bucket.id)}
              className={cn(styles.cell, active && styles.cellActive)}
            >
              <span>{bucket.label}</span>
              {count != null ? (
                <span
                  className={cn(
                    styles.count,
                    quiet && styles.countQuiet,
                    !quiet && bucket.work && styles.countWork,
                  )}
                >
                  {count.toLocaleString()}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {showSelectAll ? (
        <button type="button" className={styles.selectAll} onClick={onSelectAll}>
          Select all {activeCount.toLocaleString()}
        </button>
      ) : null}
    </div>
  );
}

function bucketCount(status: PriceStatusFilter, counts: PriceStatusCounts): number {
  switch (status) {
    case "MISSING_BUYING":
      return counts.missingBuying;
    case "MISSING_SELLING":
      return counts.missingSelling;
    case "BOTH_MISSING":
      return counts.bothMissing;
    case "BOTH_SET":
      return counts.bothSet;
    default:
      return 0;
  }
}
