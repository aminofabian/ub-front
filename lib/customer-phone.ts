import { looksLikeKenyanMobilePath } from "@/lib/kenyan-phone";

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
  return customerPhoneValidationMessage(raw) === null;
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
  if (!looksLikeKenyanMobilePath(trimmed)) {
    return "Enter a valid Kenyan mobile (e.g. 0712345678).";
  }
  return null;
}

/**
 * Issue with a phone already saved on a customer (legacy / mistyped).
 * Returns null when empty (missing) or when the number is usable for M-Pesa / reminders.
 */
export function storedCustomerPhoneIssue(
  raw: string | null | undefined,
): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const digits = normalizeCustomerPhone(trimmed);
  if (!digits) return "Invalid phone";
  const required = requiredCustomerPhoneLength(digits);
  if (digits.length !== required) {
    return `Needs ${required} digits (has ${digits.length})`;
  }
  if (!looksLikeKenyanMobilePath(trimmed)) {
    return "Not a valid Kenyan mobile";
  }
  return null;
}

/** True when a non-empty stored phone passes current tab / messaging rules. */
export function isUsableStoredCustomerPhone(
  raw: string | null | undefined,
): boolean {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return false;
  return storedCustomerPhoneIssue(trimmed) === null;
}
