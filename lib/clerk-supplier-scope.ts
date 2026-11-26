import type { MeResponse } from "@/lib/api";

/**
 * Department IDs to pass to GET /suppliers for a clerk-scoped surface.
 *
 * - `undefined` — no filter (owners/admins with no assignments).
 * - `[]` — explicit empty scope (grocery clerk with no departments → no suppliers).
 * - non-empty — only suppliers linked to items in those departments.
 */
export type ClerkSupplierScope = string[] | undefined;

function roleKey(me: MeResponse | null | undefined): string {
  return me?.role?.key?.trim().toLowerCase() ?? "";
}

function assignedIds(me: MeResponse | null | undefined): string[] {
  const raw = me?.itemTypeIds ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const id = typeof entry === "string" ? entry.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Scope suppliers (and their item-links) to the signed-in person's assigned
 * departments. Mirrors dashboard department rail: assignments restrict;
 * grocery clerks with none see nothing; other roles with none see everything.
 */
export function clerkSupplierItemTypeIds(
  me: MeResponse | null | undefined,
): ClerkSupplierScope {
  const ids = assignedIds(me);
  if (ids.length > 0) return ids;
  if (roleKey(me) === "grocery_clerk") return [];
  return undefined;
}

/** Keep only links whose catalog item is in the clerk's departments. */
export function filterLinksByItemTypes<T extends { itemTypeId?: string | null }>(
  links: T[],
  scope: ClerkSupplierScope,
): T[] {
  if (scope === undefined) return links;
  if (scope.length === 0) return [];
  const allowed = new Set(scope);
  return links.filter((link) => {
    const id = link.itemTypeId?.trim();
    return !!id && allowed.has(id);
  });
}
