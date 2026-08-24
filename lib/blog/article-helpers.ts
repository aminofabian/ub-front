import type { BlogBlock } from "./types";

export function criteriaTable(rows: [string, string][]): BlogBlock {
  return {
    type: "table",
    headers: ["Criterion", "Verdict"],
    rows,
  };
}
