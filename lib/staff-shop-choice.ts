import type { PublicSignInDestination } from "@/lib/api";
import { staffDestinationHost } from "@/lib/staff-tenant-resolve";

function shopHaystack(row: PublicSignInDestination): string {
  return [row.name, row.slug, staffDestinationHost(row)]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .toLowerCase();
}

/** Match every word against the shop name, slug, or address. */
export function filterStaffShopChoices(
  rows: PublicSignInDestination[],
  rawQuery: string,
): PublicSignInDestination[] {
  const tokens = rawQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return rows;
  return rows.filter((row) => {
    const haystack = shopHaystack(row);
    return tokens.every((token) => haystack.includes(token));
  });
}
