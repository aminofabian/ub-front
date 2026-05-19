/** Align with backend CustomerPhoneNormalizer. */
export const MAX_CUSTOMER_PHONE_DIGITS = 24;

/** Minimum digit count for a searchable / billable customer phone. */
export const MIN_CUSTOMER_PHONE_DIGITS = 9;

export function normalizeCustomerPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length > MAX_CUSTOMER_PHONE_DIGITS
    ? digits.slice(0, MAX_CUSTOMER_PHONE_DIGITS)
    : digits;
}

export function isValidCustomerPhone(raw: string): boolean {
  const n = normalizeCustomerPhone(raw);
  return n.length >= MIN_CUSTOMER_PHONE_DIGITS;
}

export function customerPhoneValidationMessage(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "Enter the customer's phone number.";
  }
  const digits = normalizeCustomerPhone(trimmed);
  if (!digits) {
    return "Phone must contain digits.";
  }
  if (digits.length < MIN_CUSTOMER_PHONE_DIGITS) {
    return `Phone number is too short (need at least ${MIN_CUSTOMER_PHONE_DIGITS} digits).`;
  }
  return null;
}
