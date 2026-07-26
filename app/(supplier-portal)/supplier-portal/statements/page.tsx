"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  downloadSupplierPortalStatement,
  fetchSupplierPortalCapabilities,
  fetchSupplierPortalHubShops,
  fetchSupplierPortalStatement,
  type SupplierPortalHubShops,
  type SupplierPortalStatement,
} from "@/lib/marketplace-api";
import { formatMoneyCompact, resolveCurrencyCode } from "@/lib/money";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function money(amount: unknown, currency: string): string {
  return formatMoneyCompact(toNum(amount), resolveCurrencyCode(currency));
}

export default function SupplierPortalStatementsPage() {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const [hub, setHub] = useState<SupplierPortalHubShops | null>(null);
  const [localSupplierId, setLocalSupplierId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [statement, setStatement] = useState<SupplierPortalStatement | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void Promise.all([fetchSupplierPortalHubShops(), fetchSupplierPortalCapabilities()])
      .then(([shops, caps]) => {
        setHub(shops);
        setAllowed(caps.allowStatementDownloads);
        if (shops.shops[0]) {
          setLocalSupplierId(shops.shops[0].localSupplierId);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load shops"));
  }, [router]);

  const load = async () => {
    if (!localSupplierId) return;
    setError("");
    setBusy(true);
    try {
      setStatement(await fetchSupplierPortalStatement({ localSupplierId, year, month }));
    } catch (err) {
      setStatement(null);
      setError(err instanceof Error ? err.message : "Could not load statement");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (localSupplierId && allowed) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when shop/period changes
  }, [localSupplierId, year, month, allowed]);

  const onDownload = async (format: "csv" | "pdf") => {
    if (!localSupplierId) return;
    setError("");
    try {
      await downloadSupplierPortalStatement({ localSupplierId, year, month, format });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const currency = statement?.currency ?? hub?.currency ?? "KES";

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Statements</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Monthly ledger per shop — opening balance through closing.
            </p>
          </div>
          {allowed ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={!statement || busy} onClick={() => void onDownload("csv")}>
                Download CSV
              </Button>
              <Button type="button" disabled={!statement || busy} onClick={() => void onDownload("pdf")}>
                Download PDF
              </Button>
            </div>
          ) : null}
        </header>

        {!allowed ? (
          <AuthAlert variant="error">Statement downloads are disabled by the platform.</AuthAlert>
        ) : null}
        {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Shop</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={localSupplierId}
              onChange={(e) => setLocalSupplierId(e.target.value)}
              disabled={!allowed}
            >
              {(hub?.shops ?? []).map((shop) => (
                <option key={shop.localSupplierId} value={shop.localSupplierId}>
                  {shop.shopName}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Month</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              disabled={!allowed}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString("en", { month: "long" })}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Year</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={!allowed}
            >
              {[year - 2, year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        {statement ? (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Opening" value={money(statement.openingBalance, currency)} />
              <Stat label="Invoices" value={money(statement.periodInvoices, currency)} />
              <Stat label="Payments" value={money(statement.periodPayments, currency)} />
              <Stat label="Closing" value={money(statement.closingBalance, currency)} />
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Reference</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Debit</th>
                    <th className="px-3 py-2 font-medium">Credit</th>
                    <th className="px-3 py-2 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-muted/20">
                    <td className="px-3 py-2">{statement.periodStart}</td>
                    <td className="px-3 py-2">OPENING</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">Opening balance</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2 font-medium">{money(statement.openingBalance, currency)}</td>
                  </tr>
                  {statement.entries.map((row, idx) => (
                    <tr key={`${row.date}-${row.type}-${row.reference}-${idx}`} className="border-b last:border-0">
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2">{row.type}</td>
                      <td className="px-3 py-2">{row.reference || "—"}</td>
                      <td className="px-3 py-2">{row.description || "—"}</td>
                      <td className="px-3 py-2">
                        {toNum(row.debit) ? money(row.debit, currency) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {toNum(row.credit) ? money(row.credit, currency) : "—"}
                      </td>
                      <td className="px-3 py-2 font-medium">{money(row.balance, currency)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/20">
                    <td className="px-3 py-2">{statement.periodEnd}</td>
                    <td className="px-3 py-2">CLOSING</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">Closing balance</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2 font-medium">{money(statement.closingBalance, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </SupplierPortalShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
