import { formatMoney, formatMoneyCompact } from "@/lib/money";

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

export function tagPriceLabel(
  amount: number | null,
  currency: string | null | undefined,
): string {
  if (amount == null) return "No price";
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  return whole ? formatMoneyCompact(amount, currency) : formatMoney(amount, currency);
}
