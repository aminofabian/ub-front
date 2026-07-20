/** Build E.164-style digits for STK (Kenya 254…). */
export function buildStkPhoneNumber(areaCode: string, local: string): string {
  const digits = `${areaCode}${local}`.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return `254${digits}`;
}

export function isStkPhoneValid(areaCode: string, local: string): boolean {
  const digits = buildStkPhoneNumber(areaCode, local);
  return digits.length >= 12 && digits.length <= 13;
}

/**
 * Directory lookup variants for a Kenya MSISDN.
 * Customer phones may be stored as 254… or 07…; exact match is used server-side.
 */
export function stkPhoneLookupVariants(phone254: string): string[] {
  const digits = phone254.replace(/\D/g, "");
  if (!digits) return [];
  const variants = new Set<string>([digits]);
  if (digits.startsWith("254") && digits.length > 3) {
    variants.add(`0${digits.slice(3)}`);
  } else if (digits.startsWith("0") && digits.length > 1) {
    variants.add(`254${digits.slice(1)}`);
  }
  return [...variants];
}

/** True when a stored customer phone matches an STK MSISDN (0… ↔ 254…). */
export function customerPhoneMatchesStk(
  storedPhone: string | null | undefined,
  stkPhone254: string,
): boolean {
  const stored = (storedPhone ?? "").replace(/\D/g, "");
  if (!stored) return false;
  const target = stkPhone254.replace(/\D/g, "");
  if (!target) return false;
  if (stored === target) return true;
  const variants = stkPhoneLookupVariants(target);
  return variants.includes(stored);
}

/** Split stored/normalized phone into area code + local for form fields. */
export function parseStkPhoneParts(raw: string): { areaCode: string; local: string } {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return { areaCode: "+254", local: "" };
  }
  if (digits.startsWith("254") && digits.length > 3) {
    return { areaCode: "+254", local: digits.slice(3) };
  }
  if (digits.startsWith("0") && digits.length > 1) {
    return { areaCode: "+254", local: digits.slice(1) };
  }
  return { areaCode: "+254", local: digits };
}
