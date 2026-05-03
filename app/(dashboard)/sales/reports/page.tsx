"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { fetchSalesRevenueByCategory, type RevenueByCategoryRow } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function rowAmount(row: RevenueByCategoryRow): number {
  return typeof row.netRevenue === "number" ? row.netRevenue : Number(row.netRevenue);
}

export default function SalesReportsPage() {
  const { me, business } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.SalesIntelligenceRead);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RevenueByCategoryRow[]>([]);

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      const fromArg = from.trim() || undefined;
      const toArg = to.trim() || undefined;
      const data = await fetchSalesRevenueByCategory(fromArg, toArg);
      setRows(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  if (!allowed) {
    return (
      <section className="max-w-xl space-y-2">
        <h2 className="text-xl font-semibold">Sales by category</h2>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this report. Ask an administrator to grant{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {Permission.SalesIntelligenceRead}
          </code>
          .
        </p>
      </section>
    );
  }

  const currency = business?.currency?.trim() ?? "";

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Sales by category</h2>
        <p className="text-sm text-muted-foreground">
          Net POS revenue rolled up by catalog category (sale line totals minus refunds in the selected window).
          Sale rows use each sale&apos;s date; refunds use the refund date. Leave dates empty for the default
          rolling window (last 90 days ending today).
          {currency ? ` Amounts use business currency (${currency}).` : ""}
        </p>
      </header>

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          load().catch(() => {
            setMessage("Failed to load report.");
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
        <h3 className="text-lg font-medium">Net revenue by category</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium text-right">Net revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">
                    No rows yet — choose dates and click Refresh, or nothing matched this range.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.categoryId} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.categoryName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(rowAmount(row))}</td>
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
