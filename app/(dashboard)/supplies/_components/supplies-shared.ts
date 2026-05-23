import { paymentStatusBadgeClass } from "../../suppliers/_components/supplier-ui-tokens";

export function supplyN(v: number | string | null | undefined): number {
  if (v == null || v === "") return 0;
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function formatSupplyMoney(v: number): string {
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function supplyPaymentStatusBadge(status: string): {
  label: string;
  className: string;
} {
  const s = status.toUpperCase();
  const label = s === "PAID" ? "Paid" : s === "PARTIAL" ? "Partial" : "Unpaid";
  return { label, className: paymentStatusBadgeClass(status) };
}
