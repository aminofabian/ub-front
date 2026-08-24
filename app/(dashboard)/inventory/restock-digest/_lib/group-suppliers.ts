import type { RestockSuggestionRecord } from "@/lib/api";

import type { DepartmentGroup } from "./group-departments";

export type SupplierRailItem = {
  key: string;
  kind: "po" | "pad" | "handled";
  supplierId: string | null;
  name: string;
  lines: RestockSuggestionRecord[];
  deptNames: string[];
};

export function buildSupplierRail(
  departments: DepartmentGroup[],
): SupplierRailItem[] {
  const po = new Map<
    string,
    { name: string; lines: RestockSuggestionRecord[]; depts: Set<string> }
  >();
  const pad: RestockSuggestionRecord[] = [];
  const padDepts = new Set<string>();
  const handled: RestockSuggestionRecord[] = [];
  const handledDepts = new Set<string>();

  for (const dept of departments) {
    for (const group of dept.supplierGroups) {
      const existing = po.get(group.supplierId);
      if (existing) {
        existing.lines.push(...group.lines);
        existing.depts.add(dept.name);
      } else {
        po.set(group.supplierId, {
          name: group.supplierName,
          lines: [...group.lines],
          depts: new Set([dept.name]),
        });
      }
    }
    if (dept.padLines.length > 0) {
      pad.push(...dept.padLines);
      padDepts.add(dept.name);
    }
    if (dept.handled.length > 0) {
      handled.push(...dept.handled);
      handledDepts.add(dept.name);
    }
  }

  const items: SupplierRailItem[] = [...po.entries()]
    .map(([supplierId, row]) => ({
      key: `po:${supplierId}`,
      kind: "po" as const,
      supplierId,
      name: row.name,
      lines: row.lines,
      deptNames: [...row.depts],
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

  if (pad.length > 0) {
    items.push({
      key: "pad",
      kind: "pad",
      supplierId: null,
      name: "Needs a supplier",
      lines: pad,
      deptNames: [...padDepts],
    });
  }
  if (handled.length > 0) {
    items.push({
      key: "handled",
      kind: "handled",
      supplierId: null,
      name: "Handled",
      lines: handled,
      deptNames: [...handledDepts],
    });
  }
  return items;
}

export function firstPendingRailKey(rail: SupplierRailItem[]): string | null {
  const pending = rail.find(
    (item) => item.kind !== "handled" && item.lines.some((l) => l.status === "pending"),
  );
  return (pending ?? rail[0])?.key ?? null;
}

