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
  /** The shop format the suggestion came from, for grouping on screen. */
  storeType?: StoreTypeId;
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
  salon: [
    { name: "Wash and blow-dry", durationMinutes: 45 },
    { name: "Wash and set", durationMinutes: 60 },
    { name: "Retouch (relaxer)", durationMinutes: 90 },
    { name: "Treatment", durationMinutes: 45 },
    { name: "Cornrows", durationMinutes: 90 },
    { name: "Box braids", durationMinutes: 240 },
    { name: "Twists", durationMinutes: 180 },
    { name: "Weave installation", durationMinutes: 150 },
    { name: "Wig installation", durationMinutes: 90 },
    { name: "Take down braids", durationMinutes: 60 },
    { name: "Hair colouring", durationMinutes: 90 },
    { name: "Dreadlocks retouch", durationMinutes: 120 },
  ],
  spa: [
    { name: "Full body massage", durationMinutes: 60 },
    { name: "Back, neck and shoulder massage", durationMinutes: 30 },
    { name: "Deep tissue massage", durationMinutes: 60 },
    { name: "Hot stone massage", durationMinutes: 75 },
    { name: "Foot massage", durationMinutes: 30 },
    { name: "Body scrub", durationMinutes: 45 },
    { name: "Facial", durationMinutes: 60 },
    { name: "Sauna or steam", durationMinutes: 30 },
  ],
  "nail-studio": [
    { name: "Manicure", durationMinutes: 40 },
    { name: "Pedicure", durationMinutes: 50 },
    { name: "Manicure and pedicure", durationMinutes: 90 },
    { name: "Gel polish", durationMinutes: 45 },
    { name: "Acrylic nails", durationMinutes: 90 },
    { name: "Stick-on nails", durationMinutes: 40 },
    { name: "Refill", durationMinutes: 60 },
    { name: "Nail art", durationMinutes: 30 },
    { name: "Polish removal", durationMinutes: 20 },
  ],
  "beauty-parlour": [
    { name: "Makeup", durationMinutes: 60 },
    { name: "Bridal makeup", durationMinutes: 120 },
    { name: "Eyebrow shaping", durationMinutes: 15 },
    { name: "Eyebrow tinting", durationMinutes: 20 },
    { name: "Eyelash extensions", durationMinutes: 90 },
    { name: "Waxing", durationMinutes: 30 },
    { name: "Facial", durationMinutes: 60 },
    { name: "Henna", durationMinutes: 60 },
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
      out.push({ ...service, storeType: type as StoreTypeId });
    }
  }
  return out;
}
