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

export type KenyanNetwork =
  | "SAFARICOM"
  | "AIRTEL"
  | "TELKOM"
  | "EQUITEL"
  | "JTL";

/** Prefix map for Kenyan mobile networks (display only — the telco is not required to send). */
export function detectKenyanNetwork(raw: string): KenyanNetwork | null {
  const msisdn = toKenyanMsisdn254(raw);
  if (!msisdn || msisdn.length < 6) return null;
  const prefix = Number.parseInt(msisdn.slice(3, 6), 10);
  if (!Number.isFinite(prefix)) return null;
  if (prefix === 747) return "JTL";
  if (prefix >= 763 && prefix <= 765) return "EQUITEL";
  if (prefix >= 770 && prefix <= 779) return "TELKOM";
  if (
    (prefix >= 100 && prefix <= 102) ||
    (prefix >= 730 && prefix <= 739) ||
    (prefix >= 750 && prefix <= 756) ||
    prefix === 762 ||
    (prefix >= 780 && prefix <= 789)
  ) {
    return "AIRTEL";
  }
  if (
    (prefix >= 110 && prefix <= 115) ||
    (prefix >= 700 && prefix <= 729) ||
    (prefix >= 740 && prefix <= 746) ||
    prefix === 748 ||
    (prefix >= 757 && prefix <= 759) ||
    (prefix >= 768 && prefix <= 769) ||
    (prefix >= 790 && prefix <= 799)
  ) {
    return "SAFARICOM";
  }
  return null;
}

export const KENYAN_NETWORKS: { id: KenyanNetwork; label: string }[] = [
  { id: "SAFARICOM", label: "Safaricom" },
  { id: "AIRTEL", label: "Airtel" },
  { id: "TELKOM", label: "Telkom" },
  { id: "EQUITEL", label: "Equitel" },
  { id: "JTL", label: "JTL" },
];

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
