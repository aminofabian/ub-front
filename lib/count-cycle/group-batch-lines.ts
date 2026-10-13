import type { CountCycleBatchLine } from "@/lib/api";

const UNCATEGORISED = "Other products";

export type BatchShelf = {
  category: string;
  lines: CountCycleBatchLine[];
};

/** Consecutive lines that share a category become one shelf, keeping batch order. */
export function groupBatchLines(lines: CountCycleBatchLine[]): BatchShelf[] {
  const shelves: BatchShelf[] = [];
  for (const line of lines) {
    const category = line.categoryName?.trim() || UNCATEGORISED;
    const current = shelves.at(-1);
    if (current?.category === category) {
      current.lines.push(line);
      continue;
    }
    shelves.push({ category, lines: [line] });
  }
  return shelves;
}
