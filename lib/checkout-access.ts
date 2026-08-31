import type { BusinessRecord } from "@/lib/api";

/**
 * When true, the POS checkout drawer shows an optional "add/select customer"
 * step on cash and M-Pesa sales, so purchases build customer history.
 *
 * Default off — the admin must opt in under Checkout settings
 * (absent / false → disabled, mirroring {@link canSearchCustomersByName}).
 */
export function captureCustomerForCashAndMpesa(
  business: BusinessRecord | null | undefined,
): boolean {
  return Boolean(
    business?.inventory?.checkout?.captureCustomerForCashAndMpesa,
  );
}
