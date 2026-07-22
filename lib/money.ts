/**
 * Currency display helpers — locale and fraction digits driven by ISO currency,
 * not hardcoded en-KE / 2dp (breaks UGX, RWF, etc.).
 */

export const FALLBACK_CURRENCY = "KES";

const CURRENCY_LOCALE: Record<string, string> = {
  KES: "en-KE",
  UGX: "en-UG",
  TZS: "en-TZ",
  RWF: "en-RW",
  NGN: "en-NG",
  ZAR: "en-ZA",
  USD: "en-US",
  EUR: "en-IE",
};

export function resolveCurrencyCode(
  currency?: string | null,
): string {
  const code = currency?.trim().toUpperCase() ?? "";
  return /^[A-Z]{3}$/.test(code) ? code : FALLBACK_CURRENCY;
}

export function localeForCurrency(currency?: string | null): string {
  const code = resolveCurrencyCode(currency);
  return CURRENCY_LOCALE[code] ?? "en";
}

/**
 * Formats a money amount for display.
 *
 * @param currency ISO 4217 code. Prefer always passing business.currency.
 *   Omitting falls back to {@link FALLBACK_CURRENCY} so legacy one-arg call
 *   sites keep compiling — migrate to an explicit currency or {@link useFormatMoney}.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency?: string | null,
): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  const code = resolveCurrencyCode(currency);
  const locale = localeForCurrency(code);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString(locale)}`;
  }
}

/** Compact whole-unit style (credits / dashboards). Still currency-aware. */
export function formatMoneyCompact(
  amount: number | string | null | undefined,
  currency?: string | null,
): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  const code = resolveCurrencyCode(currency);
  const locale = localeForCurrency(code);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${code} ${Math.round(value).toLocaleString(locale)}`;
  }
}
