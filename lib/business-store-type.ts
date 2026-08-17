import type { OnboardingAnswersRecord } from "@/lib/api";

export type StoreTypeId =
  | "butchery"
  | "mini-mart"
  | "full-grocery"
  | "fresh-market"
  | "mixed-shop"
  | "cosmetics"
  | "wines-spirits"
  | "other";

/** Shop formats that get the shared starter-product catalogue during onboarding. */
export const CATALOG_ELIGIBLE_STORE_TYPES: readonly StoreTypeId[] = [
  "mini-mart",
  "mixed-shop",
];

const STORE_TYPE_ORDER: readonly StoreTypeId[] = [
  "butchery",
  "mini-mart",
  "full-grocery",
  "fresh-market",
  "mixed-shop",
  "cosmetics",
  "wines-spirits",
  "other",
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
