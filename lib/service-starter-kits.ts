import type { StoreTypeId } from "@/lib/business-store-type";

/**
 * Starter services offered during onboarding for a service business.
 *
 * Names and typical durations only. Prices are deliberately absent: the shop types its own, and
 * nothing here may be shown or saved as a price.
 */
export type StarterService = {
  name: string;
  durationMinutes: number;
};

export const SERVICE_STARTER_KITS: Partial<
  Record<StoreTypeId, readonly StarterService[]>
> = {
  barbershop: [
    { name: "Haircut", durationMinutes: 30 },
    { name: "Beard trim", durationMinutes: 15 },
    { name: "Haircut and beard", durationMinutes: 45 },
    { name: "Kids haircut", durationMinutes: 30 },
    { name: "Shave", durationMinutes: 20 },
    { name: "Hair colouring", durationMinutes: 90 },
    { name: "Dreadlocks retouch", durationMinutes: 120 },
  ],
};

/** Starter services for the selected formats, de-duplicated by name (case-insensitive). */
export function starterServicesForStoreTypes(
  storeTypes: readonly string[] | null | undefined,
): StarterService[] {
  const seen = new Set<string>();
  const out: StarterService[] = [];
  for (const type of storeTypes ?? []) {
    for (const service of SERVICE_STARTER_KITS[type as StoreTypeId] ?? []) {
      const key = service.name.trim().toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(service);
    }
  }
  return out;
}
