/** Align with backend CustomerPhoneNormalizer (digit strip). */
export const MAX_CUSTOMER_PHONE_DIGITS = 24;

/** Local Kenya tab numbers: 07… → 10 digits, otherwise 9 digits (e.g. 712…). */
export const CUSTOMER_PHONE_LEN_LEADING_ZERO = 10;
export const CUSTOMER_PHONE_LEN_LOCAL = 9;

export function normalizeCustomerPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length > MAX_CUSTOMER_PHONE_DIGITS
    ? digits.slice(0, MAX_CUSTOMER_PHONE_DIGITS)
    : digits;
}

/** Required digit length for a customer-tab phone after normalization. */
export function requiredCustomerPhoneLength(digits: string): number {
  return digits.startsWith("0")
    ? CUSTOMER_PHONE_LEN_LEADING_ZERO
    : CUSTOMER_PHONE_LEN_LOCAL;
}

export function isValidCustomerPhone(raw: string): boolean {
  const n = normalizeCustomerPhone(raw);
  if (!n) return false;
  return n.length === requiredCustomerPhoneLength(n);
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
  const required = requiredCustomerPhoneLength(digits);
  if (digits.length !== required) {
    if (digits.startsWith("0")) {
      return `Phone must be ${CUSTOMER_PHONE_LEN_LEADING_ZERO} digits when it starts with 0 (e.g. 0712345678).`;
    }
    return `Phone must be ${CUSTOMER_PHONE_LEN_LOCAL} digits (e.g. 712345678).`;
  }
  return null;
}
