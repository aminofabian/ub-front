"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalHubShops,
  fetchSupplierPortalInvoices,
  type SupplierPortalInvoiceRow,
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
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function SupplierPortalInvoicesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SupplierPortalInvoiceRow[]>([]);
  const [currency, setCurrency] = useState("KES");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void Promise.all([fetchSupplierPortalInvoices(), fetchSupplierPortalHubShops()])
      .then(([invoices, hub]) => {
        setRows(invoices);
        setCurrency(hub.currency || "KES");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load invoices"));
  }, [router]);

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Invoices</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Supply invoices across connected shops.
          </p>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Invoice</th>
                <th className="px-3 py-2 font-medium">Shop</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Paid</th>
                <th className="px-3 py-2 font-medium">Balance</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.invoiceId} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{row.invoiceNumber}</td>
                  <td className="px-3 py-2">{row.businessName}</td>
                  <td className="px-3 py-2">{fmtDate(row.invoiceDate)}</td>
                  <td className="px-3 py-2">{money(row.grandTotal, currency)}</td>
                  <td className="px-3 py-2">{money(row.amountPaid, currency)}</td>
                  <td className="px-3 py-2">{money(row.balanceOpen, currency)}</td>
                  <td className="px-3 py-2">{row.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !error ? (
            <p className="p-4 text-sm text-muted-foreground">No invoices yet.</p>
          ) : null}
        </div>
      </div>
    </SupplierPortalShell>
  );
}
