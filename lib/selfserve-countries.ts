export type SelfServeCountry = {
  countryCode: string;
  label: string;
  currency: string;
  timezone: string;
  dialCode: string;
  localityPlaceholders: string[];
  /** True when mobile money is not enabled for this country yet. */
  cashCreditOnly: boolean;
  /** Short payment-story hint for signup / onboarding UI. */
  paymentHint: string | null;
};

/** Fallback when the public endpoint is unavailable (KE is always enabled). */
export const FALLBACK_SELFSERVE_COUNTRIES: readonly SelfServeCountry[] = [
  {
    countryCode: "KE",
    label: "Kenya",
    currency: "KES",
    timezone: "Africa/Nairobi",
    dialCode: "+254",
    localityPlaceholders: [
      "Mirema",
      "Kasarani",
      "Ongata Rongai",
      "Westlands",
      "Karen",
    ],
    cashCreditOnly: false,
    paymentHint: "M-Pesa STK available for Kenya shops.",
  },
] as const;

export const DEFAULT_SELFSERVE_COUNTRY_CODE = "KE";

export function findSelfServeCountry(
  countries: readonly SelfServeCountry[],
  countryCode: string,
): SelfServeCountry | undefined {
  const code = countryCode.trim().toUpperCase();
  return countries.find((c) => c.countryCode === code);
}
