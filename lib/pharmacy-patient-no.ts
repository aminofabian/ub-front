/** Patient numbers as people read and type them (ADR 0034). No imports: used at the till and in tests. */

/** "P-0412". Empty when the profile has no number yet. */
export function formatPatientNo(patientNo: number | null | undefined): string {
  if (patientNo == null || !Number.isFinite(patientNo) || patientNo <= 0) return "";
  return `P-${String(Math.trunc(patientNo)).padStart(4, "0")}`;
}

/** What tells two people on one phone apart: "P-0412 · 6 years". Empty when neither is known. */
export function patientMatchDetail(match: { patientNo?: number | null; ageYears?: number | null }): string {
  const parts: string[] = [];
  const no = formatPatientNo(match.patientNo);
  if (no) parts.push(no);
  if (match.ageYears != null && match.ageYears >= 0) {
    parts.push(match.ageYears < 1 ? "under 1 year" : match.ageYears === 1 ? "1 year" : `${match.ageYears} years`);
  }
  return parts.join(" · ");
}

/** True when the text is a patient number such as "P-412" and not a phone number. */
export function looksLikePatientNo(text: string): boolean {
  return /^p\s*[-#]?\s*\d{1,12}$/i.test(text.trim());
}
