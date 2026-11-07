import { formatMoney, formatMoneyCompact, localeForCurrency, resolveCurrencyCode } from "@/lib/money";

export function toAmount(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

/** Catalog bundle price counts as a previous price only when the shelf price is lower. */
export function wasPriceFromCatalog(
  sellingPrice: number | null,
  bundlePrice: number | null,
): number | null {
  if (sellingPrice == null || bundlePrice == null) return null;
  if (bundlePrice > sellingPrice + 0.009) return bundlePrice;
  return null;
}

export function discountPercent(selling: number | null, previous: number | null): number | null {
  if (selling == null || previous == null || previous <= selling || previous <= 0) return null;
  return Math.round(((previous - selling) / previous) * 100);
}

export function tagPriceParts(
  amount: number | null,
  currency?: string | null,
): { mark: string; amount: string } {
  if (amount == null) return { mark: "", amount: "No price" };
  const code = resolveCurrencyCode(currency);
  const locale = localeForCurrency(code);
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).formatToParts(whole ? Math.round(amount) : amount);
    const mark = parts
      .filter((part) => part.type === "currency")
      .map((part) => part.value)
      .join("")
      .trim();
    const figures = parts
      .filter((part) => part.type === "integer" || part.type === "group" || part.type === "decimal" || part.type === "fraction")
      .map((part) => part.value)
      .join("");
    if (figures) return { mark, amount: figures };
  } catch {
    // Fall through to the single-string label.
  }
  return { mark: "", amount: tagPriceLabel(amount, currency) };
}

export function tagPriceLabel(
  amount: number | null,
  currency: string | null | undefined,
): string {
  if (amount == null) return "No price";
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  return whole ? formatMoneyCompact(amount, currency) : formatMoney(amount, currency);
}
