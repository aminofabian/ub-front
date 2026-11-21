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
  | "beauty-parlour"
  | "restaurant"
  | "cafe"
  | "fast-food"
  | "bar"
  | "lodging"
  | "clinic";

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

/**
 * Shop formats that take orders and prepare food or drink (ADR 0020). As with service formats,
 * a type only picks defaults and wording; branch on {@link isFoodBusiness}, never on one by name.
 */
export const FOOD_STORE_TYPES: readonly StoreTypeId[] = ["restaurant", "cafe", "fast-food", "bar"];

/**
 * Food formats where customers sit and pay after eating: these work from the floor and are asked
 * about tables. A café or a fast-food counter takes payment first and works from the counter.
 */
export const TABLE_SERVICE_STORE_TYPES: readonly StoreTypeId[] = ["restaurant", "bar"];

/**
 * Shop formats that let rooms for the night (ADR 0028): a guest house, or a bar with rooms above it.
 * An add-on capability, not an exclusive format — a tenant is usually a bar <em>and</em> lodging.
 * A store type only picks defaults and wording; branch on {@link isLodgingBusiness}, never by name.
 */
export const LODGING_STORE_TYPES: readonly StoreTypeId[] = ["lodging"];

/**
 * A clinic or consulting room (ADR 0034): consultations, tests and procedures billed as one
 * visit. An add-on like lodging: usually a chemist <em>and</em> a clinic. Deliberately not a
 * service format, so it never inherits the salon's wording (stylist, chair, tips). A store type
 * only picks defaults and wording; branch on {@link isClinicBusiness}, never by name.
 */
export const CLINIC_STORE_TYPES: readonly StoreTypeId[] = ["clinic"];

/**
 * Shop formats that sell physical goods off a shelf: a mini-mart, a butchery, a pharmacy, a
 * wines-and-spirits shop. These are the formats whose day is Products → Stock → the retail till.
 * A restaurant or a service shop is not a goods seller until it also picks one of these, or answers
 * that it sells products (see {@link sellsGoodsBusiness}). Every other shop — a mini-mart, a mixed
 * shop, a guest house, one that has not picked a format — keeps Products in the sidebar.
 * {@code "other"} counts as a goods format.
 */
export const GOODS_STORE_TYPES: readonly StoreTypeId[] = [
  "butchery",
  "mini-mart",
  "full-grocery",
  "fresh-market",
  "mixed-shop",
  "cosmetics",
  "wines-spirits",
  "pharmacy",
  "other",
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
  ...FOOD_STORE_TYPES,
  ...LODGING_STORE_TYPES,
  ...CLINIC_STORE_TYPES,
];

type StoreTypeSource = {
  profile?: {
    storeType?: string | null;
    storeTypes?: string[] | null;
  } | null;
  onboarding?: {
    // Only the chosen formats are read; the questionnaire's full answer shape is not needed.
    answers?: {
      storeType?: string | null;
      storeTypes?: string[] | null;
      /** Restaurant setup: "yes, we also sell packaged goods." */
      sellsProducts?: boolean | null;
    } | null;
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

/** True when any selected format is a food format (restaurant, café, fast food, bar). */
export function isFoodBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  return getBusinessStoreTypes(source).some((type) =>
    (FOOD_STORE_TYPES as readonly string[]).includes(type),
  );
}

/** True when one of the business's formats is a pharmacy / chemist. */
export function isPharmacyBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  return getBusinessStoreTypes(source).includes("pharmacy");
}

/** True when one of the business's formats is a clinic: it has the Clinic section. */
export function isClinicBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  return getBusinessStoreTypes(source).some((type) =>
    (CLINIC_STORE_TYPES as readonly string[]).includes(type),
  );
}

/** True when any selected format lets rooms: the business has a front desk. */
export function isLodgingBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  return getBusinessStoreTypes(source).some((type) =>
    (LODGING_STORE_TYPES as readonly string[]).includes(type),
  );
}

/** True when every selected format is a service format: the shop sells no goods. */
export function isServiceOnlyBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  return isServiceOnlyStoreTypes(getBusinessStoreTypes(source));
}

/** Store-type list form of {@link isServiceOnlyBusiness} — for answers before they are saved. */
export function isServiceOnlyStoreTypes(
  storeTypes: readonly string[] | null | undefined,
): boolean {
  return (
    Array.isArray(storeTypes) &&
    storeTypes.length > 0 &&
    storeTypes.every((type) => (SERVICE_STORE_TYPES as readonly string[]).includes(type))
  );
}

/**
 * True when every selected format is a food format: a restaurant, café, fast-food counter or bar.
 * Its counter is its home, the way a butchery's is the butcher till and a kinyozi's the floor.
 */
export function isFoodOnlyBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  return isFoodOnlyStoreTypes(getBusinessStoreTypes(source));
}

/**
 * True for a food-led shop once lodging is set aside: a bar or restaurant that also lets a few rooms
 * is still food-led, not a retail shop (ADR 0031). Lodging is an add-on, so it never pushes a tenant
 * into the full product-shop chrome. Use this — not {@link isFoodOnlyBusiness} — wherever "is this a
 * food shop, rooms or not" decides nav trimming, the hub's setup nudges, or the icon-rail lead.
 */
export function isFoodLedStoreTypes(
  storeTypes: readonly string[] | null | undefined,
): boolean {
  const withoutLodging = (storeTypes ?? []).filter(
    (type) => !(LODGING_STORE_TYPES as readonly string[]).includes(type),
  );
  return isFoodOnlyStoreTypes(withoutLodging);
}

/** Business form of {@link isFoodLedStoreTypes}. */
export function isFoodLedBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  return isFoodLedStoreTypes(getBusinessStoreTypes(source));
}

/**
 * True for a food-only shop with at least one table-service format (a restaurant, a bar, or a
 * café that is also one of those): its home is the floor, not the counter.
 */
export function isTableServiceStoreTypes(
  storeTypes: readonly string[] | null | undefined,
): boolean {
  return (
    isFoodOnlyStoreTypes(storeTypes) &&
    (storeTypes ?? []).some((type) =>
      (TABLE_SERVICE_STORE_TYPES as readonly string[]).includes(type),
    )
  );
}

/** Business form of {@link isTableServiceStoreTypes}. */
export function isTableServiceBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  return isTableServiceStoreTypes(getBusinessStoreTypes(source));
}

/** Store-type list form of {@link isFoodOnlyBusiness} — for answers before they are saved. */
export function isFoodOnlyStoreTypes(
  storeTypes: readonly string[] | null | undefined,
): boolean {
  return (
    Array.isArray(storeTypes) &&
    storeTypes.length > 0 &&
    storeTypes.every((type) => (FOOD_STORE_TYPES as readonly string[]).includes(type))
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
  if (types.includes("spa") || types.includes("clinic")) {
    // A clinic sees patients in rooms; a chemist with a consulting corner has one.
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

const PRODUCTS_HIDDEN_UNTIL_ENABLED: ReadonlySet<string> = new Set([
  ...FOOD_STORE_TYPES,
  ...SERVICE_STORE_TYPES,
]);

/**
 * True when the sidebar should include Products. A mini-mart, a shop, a guest house, and a
 * business that has not picked a format all keep it. A restaurant or a service shop hides it
 * until it also has a goods format (the "sell products" sideline). Lodging does not hide it;
 * a bar that also lets rooms still hides it, because the bar is a food format.
 */
export function sellsGoodsStoreTypes(
  storeTypes: readonly string[] | null | undefined,
): boolean {
  if (!storeTypes?.length) return true;
  const deciding = storeTypes.filter(
    (type) => !(LODGING_STORE_TYPES as readonly string[]).includes(type),
  );
  if (deciding.length === 0) return true;
  if (deciding.some((type) => (GOODS_STORE_TYPES as readonly string[]).includes(type))) {
    return true;
  }
  return !deciding.every((type) => PRODUCTS_HIDDEN_UNTIL_ENABLED.has(type));
}

/** Business form of {@link sellsGoodsStoreTypes}. A saved "we also sell products" answer counts. */
export function sellsGoodsBusiness(
  source: StoreTypeSource | null | undefined,
): boolean {
  if (sellsGoodsStoreTypes(getBusinessStoreTypes(source))) return true;
  return source?.onboarding?.answers?.sellsProducts === true;
}

/**
 * The goods format a non-retail shop gains when it turns on "sell products": a general
 * {@code "mixed-shop"} line (crisps, cigarettes, sodas beside the bar; toiletries beside the salon).
 * It is the least surprising default — a catch-all shelf, not a specialised one.
 */
export const DEFAULT_GOODS_STORE_TYPE: StoreTypeId = "mixed-shop";

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
