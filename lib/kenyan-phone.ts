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

/** Canonical MSISDN without `+` (`2547XXXXXXXX`) for KopoKopo / STK. */
export function toKenyanMsisdn254(raw: string): string | null {
  const local = toKenyanLocal07(raw);
  if (!local) return null;
  return `254${local.slice(1)}`;
}

/**
 * Pull the first Kenyan mobile from free-form remittance text
 * (e.g. "send money: 0710514157").
 */
export function extractFirstKenyanMobile(text: string | null | undefined): string | null {
  if (!text) return null;
  const matches = text.match(/(?:\+?254|0)?7\d{8}/g);
  if (!matches) return null;
  for (const m of matches) {
    const msisdn = toKenyanMsisdn254(m);
    if (msisdn) return msisdn;
  }
  return null;
}
