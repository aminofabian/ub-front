import type { CountCycleBatchLine } from "@/lib/api";

export type ReviewLine = CountCycleBatchLine & {
  variance: number | null;
};

function toNumber(value: number | string | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Counted lines only, biggest shelf-vs-system gap first; exact matches last. */
export function rankReviewLines(lines: CountCycleBatchLine[]): ReviewLine[] {
  return lines
    .map((line) => {
      const counted = toNumber(line.countedQty);
      const system = toNumber(line.systemQty);
      const variance =
        counted == null || system == null ? null : counted - system;
      return { ...line, variance };
    })
    .filter((line) => toNumber(line.countedQty) != null)
    .sort((a, b) => Math.abs(b.variance ?? 0) - Math.abs(a.variance ?? 0));
}
