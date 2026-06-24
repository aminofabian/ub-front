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
