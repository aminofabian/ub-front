/**
 * Which staff roles a shop is offered when adding someone. A role that belongs to one format
 * (a chemist has no kitchen, a café has no waiter) is offered only where that format is on.
 * This narrows a list for people; the server still decides what a role may do.
 */

import {
  TABLE_SERVICE_STORE_TYPES,
  getBusinessStoreTypes,
  isButcheryBusiness,
  isClerkCounterBusiness,
  isClinicBusiness,
  isFoodBusiness,
  isPharmacyBusiness,
  isServiceBusiness,
  isServiceOnlyBusiness,
  isSupplierBusiness,
  isWholesaleOnlyBusiness,
} from "@/lib/business-store-type";

type Business = Parameters<typeof isButcheryBusiness>[0];

/** Role key to the question "does this shop have the format the role belongs to?". */
const FORMAT_ROLES: Record<string, (business: Business) => boolean> = {
  butcher_cashier: isButcheryBusiness,
  grocery_clerk: isClerkCounterBusiness,
  grocery_manager: isClerkCounterBusiness,
  supplier_trade_desk: isSupplierBusiness,
  supplier_catalogue: isSupplierBusiness,
  supplier_accounts: isSupplierBusiness,
  kitchen_staff: isFoodBusiness,
  waiter: servesTables,
  service_staff: isServiceBusiness,
  pharmacist: isPharmacyBusiness,
  clinician: isClinicBusiness,
  nurse: isClinicBusiness,
  clinic_receptionist: isClinicBusiness,
  /** A wholesale desk has no till. A shop that also sells at the counter keeps the cashier. */
  cashier: takesPaymentAtTill,
  /** A chair-only salon does not count stock. A kitchen, a warehouse and a shelf do. */
  stock_manager: keepsStock,
};

/** Restaurant and bar take orders at tables. A café or a takeaway pays at the counter. */
function servesTables(business: Business): boolean {
  const tables = TABLE_SERVICE_STORE_TYPES as readonly string[];
  return getBusinessStoreTypes(business).some((type) => tables.includes(type));
}

function takesPaymentAtTill(business: Business): boolean {
  return !isWholesaleOnlyBusiness(business);
}

function keepsStock(business: Business): boolean {
  if (isFoodBusiness(business) || isSupplierBusiness(business)) return true;
  return !isServiceOnlyBusiness(business);
}

/**
 * Display names for the format roles, so a row still follows its shop even when the
 * role key did not come through. Keys win when they are one of {@link FORMAT_ROLES}.
 */
const FORMAT_ROLE_NAMES: Record<string, keyof typeof FORMAT_ROLES> = {
  "butcher cashier": "butcher_cashier",
  butcher: "butcher_cashier",
  "department head": "grocery_clerk",
  "grocery clerk": "grocery_clerk",
  "grocery manager": "grocery_manager",
  "trade desk": "supplier_trade_desk",
  catalogue: "supplier_catalogue",
  accounts: "supplier_accounts",
  "kitchen staff": "kitchen_staff",
  waiter: "waiter",
  "service staff": "service_staff",
  pharmacist: "pharmacist",
  clinician: "clinician",
  nurse: "nurse",
  receptionist: "clinic_receptionist",
  cashier: "cashier",
  "stock manager": "stock_manager",
};

/**
 * The roles to offer this shop. A role tied to a format the shop does not run is left out.
 * Someone who already holds that role (`inUseRoleIds`) still sees it, so their job can be
 * changed. A shop whose format is not known yet is not offered those jobs either: a mini
 * mart must not be asked to pick a nurse or a butcher while its format is missing.
 */
export function rolesForBusiness<T extends { id: string; key: string; name?: string | null }>(
  roles: readonly T[],
  business: Business,
  inUseRoleIds: Iterable<string> = [],
): T[] {
  const inUse = new Set(inUseRoleIds);
  return roles.filter((role) => {
    const belongs = formatRole(role);
    return !belongs || belongs(business) || inUse.has(role.id);
  });
}

function formatRole(
  role: { key?: string | null; name?: string | null },
): ((business: Business) => boolean) | undefined {
  const key = role.key?.trim().toLowerCase() ?? "";
  if (FORMAT_ROLES[key]) return FORMAT_ROLES[key];
  const named = FORMAT_ROLE_NAMES[role.name?.trim().toLowerCase() ?? ""];
  return named ? FORMAT_ROLES[named] : undefined;
}
