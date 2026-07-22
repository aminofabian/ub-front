"use client";

import { useCallback, useMemo } from "react";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import {
  FALLBACK_CURRENCY,
  formatMoney,
  formatMoneyCompact,
  resolveCurrencyCode,
} from "@/lib/money";

/**
 * Business currency from dashboard context (KES fallback when unknown).
 */
export function useBusinessCurrency(): string {
  const dashboard = useOptionalDashboard();
  return resolveCurrencyCode(dashboard?.business?.currency);
}

/**
 * Currency-aware money formatters bound to the current business.
 */
export function useFormatMoney() {
  const currency = useBusinessCurrency();

  const money = useCallback(
    (amount: number | string | null | undefined) =>
      formatMoney(amount, currency),
    [currency],
  );

  const moneyCompact = useCallback(
    (amount: number | string | null | undefined) =>
      formatMoneyCompact(amount, currency),
    [currency],
  );

  return useMemo(
    () => ({ currency, formatMoney: money, formatMoneyCompact: moneyCompact }),
    [currency, money, moneyCompact],
  );
}

export { FALLBACK_CURRENCY };
