import type { RestockSuggestionRecord } from "@/lib/api";
import { displaySupplierName } from "@/lib/supplier-display";

import { deptKey, deptName, UNCATEGORISED_KEY } from "./digest-format";

export type SupplierGroup = {
  supplierId: string;
  supplierName: string;
  lines: RestockSuggestionRecord[];
};

export type DepartmentGroup = {
  id: string;
  name: string;
  lines: RestockSuggestionRecord[];
  supplierGroups: SupplierGroup[];
  padLines: RestockSuggestionRecord[];
  handled: RestockSuggestionRecord[];
};

export function buildDepartments(
  suggestions: RestockSuggestionRecord[],
): DepartmentGroup[] {
  const map = new Map<string, RestockSuggestionRecord[]>();
  const names = new Map<string, string>();
  for (const s of suggestions) {
    const key = deptKey(s);
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
    if (!names.has(key)) names.set(key, deptName(s));
  }
  return [...map.entries()]
    .map(([id, lines]) => {
      const pending = lines.filter((s) => s.status === "pending");
      const poLines = pending.filter((s) => s.target === "po");
      const padLines = pending.filter((s) => s.target === "pad");
      const supplierMap = new Map<string, RestockSuggestionRecord[]>();
      for (const s of poLines) {
        const key = s.supplierId ?? "unassigned";
        const list = supplierMap.get(key) ?? [];
        list.push(s);
        supplierMap.set(key, list);
      }
      return {
        id,
        name: names.get(id) ?? "Uncategorised",
        lines,
        supplierGroups: [...supplierMap.entries()].map(([supplierId, groupLines]) => ({
          supplierId,
          supplierName: displaySupplierName({
            name: groupLines[0]?.supplierName,
          }),
          lines: groupLines,
        })),
        padLines,
        handled: lines.filter((s) => s.status !== "pending"),
      };
    })
    .sort((a, b) => {
      if (a.id === UNCATEGORISED_KEY) return 1;
      if (b.id === UNCATEGORISED_KEY) return -1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
}
