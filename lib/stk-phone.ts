/** Build E.164-style digits for STK (Kenya 254…). */
export function buildStkPhoneNumber(areaCode: string, local: string): string {
  const areaDigits = areaCode.replace(/\D/g, "");
  let localDigits = local.replace(/\D/g, "");

  // Local field already contains a full MSISDN — don't double-prefix the area code.
  if (localDigits.startsWith("254") && localDigits.length >= 12) {
    return localDigits;
  }

  // 07… / 01… → drop the trunk 0 when combining with +254.
  if (localDigits.startsWith("0")) {
    localDigits = localDigits.slice(1);
  }

  const combined = `${areaDigits}${localDigits}`;
  if (combined.startsWith("254")) return combined;
  if (combined.startsWith("0")) return `254${combined.slice(1)}`;
  return `254${combined}`;
}

/**
 * Kenya M-Pesa MSISDN after normalize: {@code 254} + 9 national digits.
 * Local field accepts 9 digits ({@code 712…}) or 10 with leading 0 ({@code 0712…}).
 */
export function isStkPhoneValid(areaCode: string, local: string): boolean {
  const localDigits = local.replace(/\D/g, "");
  if (!localDigits) return false;
  const digits = buildStkPhoneNumber(areaCode, local);
  return /^254\d{9}$/.test(digits);
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
