/** Kenyan mobile path segments for the public tab portal (`/0714282874`). */

export function kenyanMobileDigits(raw: string): string {
  return decodeURIComponent(raw ?? "")
    .trim()
    .replace(/\D/g, "");
}

/** True when a URL segment should open the customer tab portal, not a product SKU. */
export function looksLikeKenyanMobilePath(segment: string): boolean {
  const digits = kenyanMobileDigits(segment);
  if (/^2547\d{8}$/.test(digits)) return true;
  if (/^07\d{8}$/.test(digits)) return true;
  if (/^7\d{8}$/.test(digits)) return true;
  return false;
}

/** Canonical local display form `07XXXXXXXX`. */
export function toKenyanLocal07(raw: string): string | null {
  const digits = kenyanMobileDigits(raw);
  if (/^2547\d{8}$/.test(digits)) {
    return `0${digits.slice(3)}`;
  }
  if (/^07\d{8}$/.test(digits)) {
    return digits;
  }
  if (/^7\d{8}$/.test(digits)) {
    return `0${digits}`;
  }
  return null;
}
