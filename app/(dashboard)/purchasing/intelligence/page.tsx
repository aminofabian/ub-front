"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchPriceCompetitiveness,
  fetchSingleSourceRisk,
  fetchSpendBySupplierCategory,
  type PriceCompetitivenessRow,
  type SingleSourceRiskRow,
  type SpendBySupplierCategoryRow,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMaybePct(n: number | null | undefined): string {
  if (n === null || n === undefined) {
    return "—";
  }
  return `${formatMoney(n)}%`;
}

function formatUnit(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export default function PurchasingIntelligencePage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.PurchasingIntelligenceRead);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [spend, setSpend] = useState<SpendBySupplierCategoryRow[]>([]);
  const [prices, setPrices] = useState<PriceCompetitivenessRow[]>([]);
  const [risk, setRisk] = useState<SingleSourceRiskRow[]>([]);

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      const fromArg = from.trim() || undefined;
      const toArg = to.trim() || undefined;
      const [spendRows, priceRows, riskRows] = await Promise.all([
        fetchSpendBySupplierCategory(fromArg, toArg),
        fetchPriceCompetitiveness(fromArg, toArg),
        fetchSingleSourceRisk(),
      ]);
      setSpend(spendRows);
      setPrices(priceRows);
      setRisk(riskRows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  if (!allowed) {
    return (
      <section className="max-w-xl space-y-2">
        <h2 className="text-xl font-semibold">Supplier intelligence</h2>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view purchasing intelligence. Ask an administrator to grant{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {Permission.PurchasingIntelligenceRead}
          </code>
          .
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Supplier intelligence</h2>
        <p className="text-sm text-muted-foreground">
          Spend by supplier and category, unit price vs primary supplier last cost, and sellable items with a
          single active supplier link. Leave dates empty to use the default rolling window (last 90 days ending
          today). Click <strong>Refresh</strong> to load or reload all sections.
        </p>
      </header>

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          load().catch(() => {
            setMessage("Failed to load reports.");
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">From</span>
          <input
            type="date"
            className="rounded border bg-background px-2 py-1.5"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">To</span>
          <input
            type="date"
            className="rounded border bg-background px-2 py-1.5"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </form>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Spend by supplier & category</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium text-right">Spend</th>
              </tr>
            </thead>
            <tbody>
              {spend.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                    No rows for this range.
                  </td>
                </tr>
              ) : (
                spend.map((row) => (
                  <tr key={`${row.supplierId}-${row.categoryId}`} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.supplierName}</td>
                    <td className="px-3 py-2">{row.categoryName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.spendTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Price vs primary last cost</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium text-right">Paid / unit</th>
                <th className="px-3 py-2 font-medium text-right">Primary last cost</th>
                <th className="px-3 py-2 font-medium text-right">Variance %</th>
                <th className="px-3 py-2 font-medium">From primary?</th>
              </tr>
            </thead>
            <tbody>
              {prices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No invoice lines in range with a catalog primary cost.
                  </td>
                </tr>
              ) : (
                prices.map((row) => (
                  <tr key={row.supplierInvoiceLineId} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.itemSku}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatUnit(row.paidUnitCost)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.primaryLastCostPrice == null ? "—" : formatUnit(row.primaryLastCostPrice)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMaybePct(row.variancePercentVsPrimary)}
                    </td>
                    <td className="px-3 py-2">{row.purchasedFromPrimarySupplier ? "Yes" : "No"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Single-source risk (sellable items)</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Supplier</th>
              </tr>
            </thead>
            <tbody>
              {risk.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                    No single-source sellable items.
                  </td>
                </tr>
              ) : (
                risk.map((row) => (
                  <tr key={row.itemId} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.sku}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.soleSupplierName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
