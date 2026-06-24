/** UI filter buckets for sale / transaction payment tender. */
export type PaymentFilter =
  | "all"
  | "cash"
  | "mpesa"
  | "split"
  | "credit"
  | "wallet"
  | "loyalty"
  | "other";

/** Toggle chips shown in the feed filter bar (no “All” — deselect to show any tender). */
export const PAYMENT_METHOD_CHIPS: {
  id: Exclude<PaymentFilter, "all" | "other">;
  label: string;
  short: string;
}[] = [
  { id: "cash", label: "Cash", short: "Cash" },
  { id: "mpesa", label: "M-Pesa", short: "M-Pesa" },
  { id: "split", label: "Split payment", short: "Split" },
  { id: "credit", label: "Customer credit", short: "Credit" },
  { id: "wallet", label: "Customer wallet", short: "Wallet" },
  { id: "loyalty", label: "Loyalty redeem", short: "Loyalty" },
];

/** @deprecated Use PAYMENT_METHOD_CHIPS + toggle-off for “all”. */
export const PAYMENT_FILTER_OPTIONS = [
  { id: "all" as const, label: "All" },
  ...PAYMENT_METHOD_CHIPS.map((c) => ({ id: c.id, label: c.label })),
  { id: "other" as const, label: "Other" },
];

export function parsePaymentMethods(
  paymentMethod: string,
  paymentMethods?: string | null,
): string[] {
  if (paymentMethods?.trim()) {
    return paymentMethods
      .split(",")
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean);
  }
  const single = paymentMethod.trim().toLowerCase();
  if (!single || single === "unknown") return [];
  if (single === "split") return ["split"];
  return [single];
}

/** Categories a sale belongs to (split can coexist with cash + mpesa). */
export function salePaymentCategories(
  paymentMethod: string,
  paymentMethods?: string | null,
): Set<PaymentFilter> {
  const methods = parsePaymentMethods(paymentMethod, paymentMethods);
  const categories = new Set<PaymentFilter>();

  if (methods.length === 0) {
    categories.add("other");
    return categories;
  }

  if (methods.length > 1 || methods.includes("split")) {
    categories.add("split");
  }

  for (const method of methods) {
    if (method === "cash") categories.add("cash");
    else if (method.includes("mpesa")) categories.add("mpesa");
    else if (method === "customer_credit") categories.add("credit");
    else if (method === "customer_wallet") categories.add("wallet");
    else if (method === "loyalty_redeem") categories.add("loyalty");
    else if (method !== "split") categories.add("other");
  }

  return categories;
}

export function matchesPaymentFilter(
  filter: PaymentFilter,
  paymentMethod: string,
  paymentMethods?: string | null,
): boolean {
  if (filter === "all") return true;
  return salePaymentCategories(paymentMethod, paymentMethods).has(filter);
}

export function formatPaymentMethodLabel(method: string): string {
  const m = method.trim().toLowerCase();
  if (m === "split") return "Split";
  if (m === "cash") return "Cash";
  if (m === "mpesa_manual" || m === "mpesa") return "M-Pesa";
  if (m === "customer_credit") return "Credit";
  if (m === "customer_wallet") return "Wallet";
  if (m === "loyalty_redeem") return "Loyalty";
  if (m === "online") return "Online checkout";
  return method
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatSalePaymentDisplay(
  paymentMethod: string,
  paymentMethods?: string | null,
): string {
  const raw = parsePaymentMethods(paymentMethod, paymentMethods);
  const methods = raw.filter((m) => m !== "split");

  if (raw.includes("split") || methods.length > 1) {
    const parts = methods.map(formatPaymentMethodLabel);
    return parts.length > 0 ? `Split · ${parts.join(" + ")}` : "Split";
  }

  if (methods.length === 1) return formatPaymentMethodLabel(methods[0]!);
  return formatPaymentMethodLabel(paymentMethod || "unknown");
}
