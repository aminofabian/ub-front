"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalHubShops,
  fetchSupplierPortalPayments,
  type SupplierPortalPaymentRow,
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

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function SupplierPortalPaymentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SupplierPortalPaymentRow[]>([]);
  const [currency, setCurrency] = useState("KES");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void Promise.all([fetchSupplierPortalPayments(), fetchSupplierPortalHubShops()])
      .then(([payments, hub]) => {
        setRows(payments);
        setCurrency(hub.currency || "KES");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load payments"));
  }, [router]);

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Payments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Payments received from connected shops.
          </p>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Shop</th>
                <th className="px-3 py-2 font-medium">Reference</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Shop balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.paymentId} className="border-b last:border-0">
                  <td className="px-3 py-2">{fmtDate(row.paidAt)}</td>
                  <td className="px-3 py-2 font-medium">{row.businessName}</td>
                  <td className="px-3 py-2">{row.reference || "—"}</td>
                  <td className="px-3 py-2 font-medium">{money(row.amount, currency)}</td>
                  <td className="px-3 py-2">{row.paymentMethod}</td>
                  <td className="px-3 py-2">{money(row.shopOpenBalance, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !error ? (
            <p className="p-4 text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : null}
        </div>
      </div>
    </SupplierPortalShell>
  );
}
