import type { OnboardingAnswersRecord } from "@/lib/api";

export type StoreTypeId =
  | "butchery"
  | "mini-mart"
  | "full-grocery"
  | "fresh-market"
  | "mixed-shop"
  | "cosmetics"
  | "wines-spirits"
  | "pharmacy"
  | "other"
  | "barbershop"
  | "salon"
  | "spa"
  | "nail-studio"
  | "beauty-parlour";

/**
 * Shop formats that sell services rather than (or as well as) goods. A store type only picks
 * defaults and wording; branch on {@link isServiceBusiness}, never on one of these by name.
 */
export const SERVICE_STORE_TYPES: readonly StoreTypeId[] = [
  "barbershop",
  "salon",
  "spa",
  "nail-studio",
  "beauty-parlour",
];

/** Shop formats that get a starter-product catalogue during onboarding. */
export const CATALOG_ELIGIBLE_STORE_TYPES: readonly StoreTypeId[] = [
  "mini-mart",
  "mixed-shop",
  "pharmacy",
];

const STORE_TYPE_ORDER: readonly StoreTypeId[] = [
  "butchery",
  "mini-mart",
  "full-grocery",
  "fresh-market",
  "mixed-shop",
  "cosmetics",
  "wines-spirits",
  "pharmacy",
  "other",
  ...SERVICE_STORE_TYPES,
];

type StoreTypeSource = {
  profile?: {
    storeType?: string | null;
    storeTypes?: string[] | null;
  } | null;
  onboarding?: {
    answers?: OnboardingAnswersRecord | null;
  } | null;
};

function normalizeStoreType(value: string | null | undefined): StoreTypeId | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (!trimmed) {
    return null;
  }
  return STORE_TYPE_ORDER.includes(trimmed as StoreTypeId)
    ? (trimmed as StoreTypeId)
    : null;
}

/** Resolves selected shop formats from profile, with onboarding answers as fallback. */
export function getBusinessStoreTypes(
  source: StoreTypeSource | null | undefined,
): StoreTypeId[] {
  if (!source) {
    return [];
  }

  const fromProfile = (source.profile?.storeTypes ?? [])
    .map((value) => normalizeStoreType(value))
    .filter((value): value is StoreTypeId => value != null);
  if (fromProfile.length > 0) {
    return dedupeStoreTypes(fromProfile);
  }

  const legacyProfile = normalizeStoreType(source.profile?.storeType);
  if (legacyProfile) {
    return [legacyProfile];
  }

  const onboardingTypes = (source.onboarding?.answers?.storeTypes ?? [])
    .map((value) => normalizeStoreType(value))
    .filter((value): value is StoreTypeId => value != null);
  if (onboardingTypes.length > 0) {
    return dedupeStoreTypes(onboardingTypes);
  }

  const legacyOnboarding = normalizeStoreType(source.onboarding?.answers?.storeType);
  return legacyOnboarding ? [legacyOnboarding] : [];
}

function dedupeStoreTypes(types: readonly StoreTypeId[]): StoreTypeId[] {
  const seen = new Set<StoreTypeId>();
  const out: StoreTypeId[] = [];
  for (const type of types) {
    if (seen.has(type)) {
      continue;
    }
    seen.add(type);
    out.push(type);
  }
  return out;
}

export function isButcheryOnlyBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  const types = getBusinessStoreTypes(source);
  return types.length === 1 && types[0] === "butchery";
}

const GROCERY_OPERATIONS_TYPES: ReadonlySet<StoreTypeId> = new Set([
  "full-grocery",
  "mini-mart",
  "fresh-market",
]);

/** Grocery counter is the home for clerks/managers at grocery-format shops. */
export function isGroceryOperationsBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  if (isButcheryOnlyBusiness(source)) {
    return false;
  }
  return getBusinessStoreTypes(source).some((type) =>
    GROCERY_OPERATIONS_TYPES.has(type),
  );
}

/** True when any selected format is a service format (kinyozi, salon, spa, …). */
export function isServiceBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  return getBusinessStoreTypes(source).some((type) =>
    (SERVICE_STORE_TYPES as readonly string[]).includes(type),
  );
}

/** True when every selected format is a service format: the shop sells no goods. */
export function isServiceOnlyBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  const types = getBusinessStoreTypes(source);
  return (
    types.length > 0 &&
    types.every((type) => (SERVICE_STORE_TYPES as readonly string[]).includes(type))
  );
}

/** What a seat is called for this business: Chair, Station or Room. */
export function serviceStationLabel(
  source: StoreTypeSource | null | undefined,
): "Chair" | "Station" | "Room" {
  const types = getBusinessStoreTypes(source);
  if (types.includes("barbershop") || types.includes("salon")) {
    return "Chair";
  }
  if (types.includes("spa")) {
    return "Room";
  }
  return types.includes("nail-studio") || types.includes("beauty-parlour")
    ? "Station"
    : "Chair";
}

export function isButcheryBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  return getBusinessStoreTypes(source).includes("butchery");
}

/** True when any selected format can use the shared starter catalogue. */
export function isCatalogEligibleStoreTypes(
  storeTypes: readonly string[] | null | undefined,
): boolean {
  if (!storeTypes?.length) {
    return false;
  }
  return storeTypes.some((value) =>
    (CATALOG_ELIGIBLE_STORE_TYPES as readonly string[]).includes(value),
  );
}

export function isCatalogEligibleBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  return isCatalogEligibleStoreTypes(getBusinessStoreTypes(source));
}
