"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchBranches,
  fetchInventoryValuation,
  type BranchRecord,
  type InventoryValuationResponseRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function formatMoney(amount: number, currencyCode: string): string {
  try {
    return amount.toLocaleString(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return amount.toFixed(2);
  }
}

function moneyValue(v: number | string): number {
  return typeof v === "number" ? v : Number(v);
}

export default function InventoryValuationPage() {
  const { me, business } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.InventoryRead);
  const currency = business?.currency?.trim() || "KES";

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [data, setData] = useState<InventoryValuationResponseRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const runValuationLoad = useCallback(async (branchId: string) => {
    setMessage("");
    setLoading(true);
    try {
      const row = await fetchInventoryValuation(branchId.trim() || undefined);
      setData(row);
    } catch (error) {
      setData(null);
      setMessage(error instanceof Error ? error.message : "Failed to load valuation.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) {
          setBranches(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("Failed to load branches.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) {
    return (
      <section className="max-w-xl space-y-2">
        <h2 className="text-xl font-semibold">Stock valuation</h2>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view inventory valuation. Ask an administrator to grant{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.InventoryRead}</code>.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Stock valuation</h2>
        <p className="text-sm text-muted-foreground">
          Extension value is Σ(quantity remaining × unit cost) per active batch. Filter by branch or view all
          branches; totals use the same basis as the API report. Choose a branch and click{" "}
          <strong>Refresh</strong> to load.
        </p>
      </header>

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          runValuationLoad(branchFilter).catch(() => {
            setMessage("Failed to load valuation.");
          });
        }}
      >
        <label className="flex min-w-[14rem] flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Branch</span>
          <select
            className="rounded border bg-background px-2 py-1.5"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
          >
            <option value="">All branches</option>
            {branches
              .filter((b) => b.active)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </form>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {data ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4 rounded-md border bg-muted/20 px-4 py-3">
            <span className="text-sm text-muted-foreground">Total extension value</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatMoney(moneyValue(data.totalExtensionValue), currency)}
            </span>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Branch</th>
                  <th className="px-3 py-2 text-right font-medium">Extension</th>
                </tr>
              </thead>
              <tbody>
                {data.byBranch.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">
                      No stock on hand for this filter.
                    </td>
                  </tr>
                ) : (
                  data.byBranch.map((row) => (
                    <tr key={row.branchId} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.branchName}</div>
                        <div className="font-mono text-xs text-muted-foreground">{row.branchId}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(moneyValue(row.extensionValue), currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No report loaded yet.</p>
      )}
    </section>
  );
}
