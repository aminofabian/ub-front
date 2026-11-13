import type { PostSalePayload, SalePaymentMethod } from "@/lib/api";

/**
 * The cart of the "ring a service" screen, kept free of React so the money rules can be tested.
 * Amounts are KES; a tip is never part of the sale total.
 */

export type ServiceCartLine = {
  /** Local id for React keys and removal. */
  key: string;
  serviceId: string;
  name: string;
  performerId: string;
  performerName: string;
  quantity: number;
  /** Price per service. For a variable-price service the attendant types it. */
  unitPrice: number;
  priceIsVariable: boolean;
};

export type ServiceCartTotals = {
  total: number;
  tips: number;
  /** What the customer hands over: total plus tips. */
  toPay: number;
};

export function serviceCartTotals(
  lines: readonly ServiceCartLine[],
  tips: Readonly<Record<string, number>>,
): ServiceCartTotals {
  const total = round2(lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0));
  const performers = new Set(lines.map((l) => l.performerId));
  let tipSum = 0;
  for (const [performerId, amount] of Object.entries(tips)) {
    // A tip only counts for someone who is on this sale.
    if (performers.has(performerId) && amount > 0) tipSum += amount;
  }
  const tipsTotal = round2(tipSum);
  return { total, tips: tipsTotal, toPay: round2(total + tipsTotal) };
}

/** Why the cart cannot be paid yet, or null when it can. */
export function serviceCartProblem(lines: readonly ServiceCartLine[]): string | null {
  if (lines.length === 0) return "Add a service first";
  for (const line of lines) {
    if (!(line.unitPrice > 0)) return `Enter the price for ${line.name}`;
    if (!Number.isInteger(line.quantity) || line.quantity < 1) return `Check the quantity for ${line.name}`;
  }
  return null;
}

export function buildServiceSalePayload(input: {
  branchId: string;
  lines: readonly ServiceCartLine[];
  tips: Readonly<Record<string, number>>;
  method: Extract<SalePaymentMethod, "cash" | "mpesa_manual">;
  /** M-Pesa confirmation code, when the attendant has one. */
  reference?: string;
  /** Cash the customer handed over, for change. Ignored unless it covers the amount to pay. */
  cashReceived?: number | null;
  soldAt: Date;
}): PostSalePayload {
  const totals = serviceCartTotals(input.lines, input.tips);
  const performers = new Set(input.lines.map((l) => l.performerId));
  const tips = Object.entries(input.tips)
    .filter(([performerId, amount]) => performers.has(performerId) && amount > 0)
    .map(([staffProfileId, amount]) => ({ staffProfileId, amount: round2(amount) }));
  const payload: PostSalePayload = {
    branchId: input.branchId,
    lines: input.lines.map((l) => ({
      kind: "SERVICE" as const,
      serviceId: l.serviceId,
      performerStaffProfileId: l.performerId,
      quantity: l.quantity,
      unitPrice: round2(l.unitPrice),
    })),
    payments: [
      {
        method: input.method,
        amount: totals.toPay,
        ...(input.method === "mpesa_manual" && input.reference?.trim()
          ? { reference: input.reference.trim().toUpperCase() }
          : {}),
      },
    ],
    clientSoldAt: input.soldAt.toISOString(),
  };
  if (tips.length > 0) payload.tips = tips;
  if (input.method === "cash" && input.cashReceived != null && input.cashReceived >= totals.toPay) {
    payload.cashReceived = round2(input.cashReceived);
  }
  return payload;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
