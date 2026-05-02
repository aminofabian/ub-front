"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { fetchApAging, type ApAgingTotalsResponse } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ApAgingPage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.PurchasingPaymentRead);

  const [asOf, setAsOf] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApAgingTotalsResponse | null>(null);

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      const row = await fetchApAging(
        asOf.trim() || undefined,
        supplierId.trim() || undefined,
      );
      setData(row);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load AP aging.");
    } finally {
      setLoading(false);
    }
  }, [asOf, supplierId]);

  if (!allowed) {
    return (
      <section className="max-w-xl space-y-2">
        <h2 className="text-xl font-semibold">AP aging</h2>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view accounts payable aging. Ask an administrator to grant{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.PurchasingPaymentRead}</code>.
        </p>
      </section>
    );
  }

  const b = data?.buckets;

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">AP aging</h2>
        <p className="text-sm text-muted-foreground">
          Open balances on posted supplier invoices by due-date bucket (as of the date you choose; leave empty
          for today UTC). Optional supplier filters the invoice set. Click <strong>Refresh</strong> to load.
        </p>
      </header>

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          load().catch(() => {
            setMessage("Failed to load AP aging.");
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">As of</span>
          <input
            type="date"
            className="rounded border bg-background px-2 py-1.5"
            value={asOf}
            onChange={(event) => setAsOf(event.target.value)}
          />
        </label>
        <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Supplier ID (optional)</span>
          <input
            type="text"
            placeholder="UUID"
            className="rounded border bg-background px-2 py-1.5 font-mono text-xs"
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </form>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {data ? (
        <div className="space-y-4">
          <dl className="grid gap-3 rounded-md border bg-muted/20 p-4 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">As of</dt>
              <dd className="font-medium">{data.asOf}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Total open AP</dt>
              <dd className="text-right tabular-nums font-medium">{formatMoney(data.totalOpen)}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:col-span-2">
              <dt className="text-muted-foreground">Supplier prepayment / credit (sum)</dt>
              <dd className="text-right tabular-nums">{formatMoney(data.totalSupplierPrepaymentBalance)}</dd>
            </div>
          </dl>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Bucket</th>
                  <th className="px-3 py-2 font-medium text-right">Open amount</th>
                </tr>
              </thead>
              <tbody>
                {b ? (
                  <>
                    <BucketRow label="Current (not past due)" amount={b.current} />
                    <BucketRow label="1–30 days past due" amount={b.days1To30} />
                    <BucketRow label="31–60 days past due" amount={b.days31To60} />
                    <BucketRow label="61–90 days past due" amount={b.days61To90} />
                    <BucketRow label="Over 90 days past due" amount={b.daysOver90} last />
                  </>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data loaded yet.</p>
      )}
    </section>
  );
}

function BucketRow({
  label,
  amount,
  last = false,
}: {
  label: string;
  amount: number;
  last?: boolean;
}) {
  return (
    <tr className={last ? "" : "border-b"}>
      <td className="px-3 py-2">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(amount)}</td>
    </tr>
  );
}
