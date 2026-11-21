/**
 * Which staff roles a shop is offered when adding someone. Some roles only make sense in one
 * kind of shop (a chemist has no kitchen), so they are offered only where that format is on.
 * This narrows a list for people; the server still decides what a role may do.
 */

import {
  getBusinessStoreTypes,
  isButcheryBusiness,
  isFoodBusiness,
  isGroceryOperationsBusiness,
  isClinicBusiness,
  isPharmacyBusiness,
  isServiceBusiness,
} from "@/lib/business-store-type";

type Business = Parameters<typeof getBusinessStoreTypes>[0];

/** Role key to the question "does this shop have the format the role belongs to?". */
const FORMAT_ROLES: Record<string, (business: Business) => boolean> = {
  butcher_cashier: isButcheryBusiness,
  grocery_clerk: isGroceryOperationsBusiness,
  grocery_manager: isGroceryOperationsBusiness,
  kitchen_staff: isFoodBusiness,
  waiter: isFoodBusiness,
  service_staff: isServiceBusiness,
  pharmacist: isPharmacyBusiness,
  clinician: isClinicBusiness,
  nurse: isClinicBusiness,
  clinic_receptionist: isClinicBusiness,
};

/**
 * The roles to offer this shop. A role tied to a format the shop does not run is left out,
 * unless someone already holds it (`inUseRoleIds`), so an existing person's role still shows
 * and can be changed. A shop whose formats are unknown is offered every role.
 */
export function rolesForBusiness<T extends { id: string; key: string }>(
  roles: readonly T[],
  business: Business,
  inUseRoleIds: Iterable<string> = [],
): T[] {
  if (getBusinessStoreTypes(business).length === 0) {
    return [...roles];
  }
  const inUse = new Set(inUseRoleIds);
  return roles.filter((role) => {
    const belongs = FORMAT_ROLES[role.key?.trim().toLowerCase() ?? ""];
    return !belongs || belongs(business) || inUse.has(role.id);
  });
}
