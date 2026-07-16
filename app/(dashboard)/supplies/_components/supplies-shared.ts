import { paymentStatusBadgeClass } from "../../suppliers/_components/supplier-ui-tokens";

export function supplyN(v: number | string | null | undefined): number {
  if (v == null || v === "") return 0;
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Kenyan-market money: always label with business currency (default KES). */
export function formatSupplyMoney(
  v: number,
  currency: string = "KES",
): string {
  const code = currency.trim().toUpperCase() || "KES";
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: code,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${v.toFixed(2)} ${code}`;
  }
}

/** Compact amount + code for dense drawers (e.g. `1,234.00 KES`). */
export function formatSupplyMoneyCompact(
  v: number,
  currency: string = "KES",
): string {
  const code = currency.trim().toUpperCase() || "KES";
  const amount = v.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount} ${code}`;
}

export function supplyPaymentStatusBadge(status: string): {
  label: string;
  className: string;
} {
  const s = status.toUpperCase();
  const label = s === "PAID" ? "Paid" : s === "PARTIAL" ? "Partial" : "Unpaid";
  return { label, className: paymentStatusBadgeClass(status) };
}
