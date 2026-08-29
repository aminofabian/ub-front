/** Kenyan mobile path segments for the public tab portal (`/0714282874`). */

export function kenyanMobileDigits(raw: string): string {
  return decodeURIComponent(raw ?? "")
    .trim()
    .replace(/\D/g, "");
}

function local10FromDigits(digits: string): string | null {
  if (/^254[17]\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^0[17]\d{8}$/.test(digits)) return digits;
  if (/^[17]\d{8}$/.test(digits)) return `0${digits}`;
  return null;
}

/**
 * 3-digit NDC after the leading 0 (`0714…` → 714, `0110…` → 110).
 * Order matters: Faiba 747 sits inside the 74x block.
 */
function networkFromNdc(ndc: number): KenyanNetwork | null {
  if (!Number.isFinite(ndc)) return null;
  if (ndc === 747) return "JTL";
  if (ndc >= 700 && ndc <= 729) return "SAFARICOM";
  if (ndc >= 740 && ndc <= 743) return "SAFARICOM";
  if (ndc >= 790 && ndc <= 799) return "SAFARICOM";
  if (ndc >= 110 && ndc <= 119) return "SAFARICOM";
  if (ndc >= 140 && ndc <= 143) return "SAFARICOM";
  if (ndc >= 180 && ndc <= 182) return "SAFARICOM";
  if (ndc >= 730 && ndc <= 739) return "AIRTEL";
  if (ndc >= 750 && ndc <= 756) return "AIRTEL";
  if (ndc >= 785 && ndc <= 789) return "AIRTEL";
  if (ndc >= 100 && ndc <= 102) return "AIRTEL";
  if (ndc >= 770 && ndc <= 779) return "TELKOM";
  if (ndc >= 763 && ndc <= 766) return "EQUITEL";
  return null;
}

/** True when a URL segment should open the customer tab portal, not a product SKU. */
export function looksLikeKenyanMobilePath(segment: string): boolean {
  const local = local10FromDigits(kenyanMobileDigits(segment));
  if (!local) return false;
  if (local.startsWith("07")) return true;
  return networkFromNdc(Number.parseInt(local.slice(1, 4), 10)) != null;
}

/** Canonical local display form `07XXXXXXXX` or `01XXXXXXXX`. */
export function toKenyanLocal07(raw: string): string | null {
  const local = local10FromDigits(kenyanMobileDigits(raw));
  if (!local) return null;
  if (local.startsWith("07")) return local;
  return networkFromNdc(Number.parseInt(local.slice(1, 4), 10)) ? local : null;
}

/** True when two phone strings refer to the same Kenyan mobile. */
export function phonesMatchKenyan(a: string, b: string): boolean {
  const left = toKenyanLocal07(a);
  const right = toKenyanLocal07(b);
  if (left && right) return left === right;
  const da = kenyanMobileDigits(a);
  const db = kenyanMobileDigits(b);
  return da.length > 0 && da === db;
}

/** Grouped local form `0714 282 874` for account and till displays. */
export function formatKenyanPhoneDisplay(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";
  const local = toKenyanLocal07(trimmed);
  if (!local) return trimmed;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/** Canonical MSISDN without `+` (`2547XXXXXXXX` / `2541XXXXXXXX`) for KopoKopo / STK. */
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

/**
 * Prefix map for Kenyan mobile networks (display only — the telco is not required to send).
 *
 * Safaricom: 070x, 071x, 072x, 0740–0743, 079x, 0110–0119, 0140–0143, 0180–0182
 * Airtel: 073x, 0750–0756, 0785–0789, 0100–0102
 * Telkom: 0770–0779
 * Equitel: 0763–0766
 * Faiba (JTL): 0747
 */
export function detectKenyanNetwork(raw: string): KenyanNetwork | null {
  const local = toKenyanLocal07(raw);
  if (!local) return null;
  return networkFromNdc(Number.parseInt(local.slice(1, 4), 10));
}

export const KENYAN_NETWORKS: { id: KenyanNetwork; label: string }[] = [
  { id: "SAFARICOM", label: "Safaricom" },
  { id: "AIRTEL", label: "Airtel" },
  { id: "TELKOM", label: "Telkom" },
  { id: "EQUITEL", label: "Equitel" },
  { id: "JTL", label: "Faiba" },
];

/**
 * Pull the first Kenyan mobile from free-form remittance text
 * (e.g. "send money: 0710514157").
 */
export function extractFirstKenyanMobile(text: string | null | undefined): string | null {
  if (!text) return null;
  const matches = text.match(/(?:\+?254|0)?[17]\d{8}/g);
  if (!matches) return null;
  for (const m of matches) {
    const msisdn = toKenyanMsisdn254(m);
    if (msisdn) return msisdn;
  }
  return null;
}

/**
 * Airtime entry lengths: `0…` → 10 digits, `254` / `+254` → 12, anything else → 9.
 */
export function expectedKenyanAirtimeDigits(raw: string): 9 | 10 | 12 {
  const trimmed = (raw ?? "").trim();
  const digits = kenyanMobileDigits(trimmed);
  if (trimmed.startsWith("+254") || digits.startsWith("254")) return 12;
  if (trimmed.startsWith("0") || digits.startsWith("0")) return 10;
  return 9;
}

export function limitKenyanAirtimePhoneInput(raw: string): string {
  const expected = expectedKenyanAirtimeDigits(raw);
  const digits = kenyanMobileDigits(raw);
  if (digits.length <= expected) return raw;
  const sliced = digits.slice(0, expected);
  if (raw.trim().startsWith("+")) return `+${sliced}`;
  return sliced;
}

export function kenyanAirtimePhoneMessage(raw: string): string | null {
  const digits = kenyanMobileDigits(raw);
  if (!digits) return null;
  const expected = expectedKenyanAirtimeDigits(raw);
  if (digits.length !== expected) {
    if (expected === 12) return "Numbers starting with 254 or +254 must be 12 digits.";
    if (expected === 10) return "Numbers starting with 0 must be 10 digits.";
    return "Numbers that don’t start with 0 or 254 must be 9 digits.";
  }
  if (!looksLikeKenyanMobilePath(raw) && !looksLikeKenyanMobilePath(digits)) {
    return "Enter a Kenyan mobile number.";
  }
  return null;
}

export function kenyanAirtimePhoneOk(raw: string): boolean {
  return kenyanMobileDigits(raw).length > 0 && kenyanAirtimePhoneMessage(raw) == null;
}
