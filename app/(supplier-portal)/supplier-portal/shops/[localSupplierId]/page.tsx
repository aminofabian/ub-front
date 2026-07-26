"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalPayments,
  fetchSupplierPortalShopDetail,
  type SupplierPortalPaymentRow,
  type SupplierPortalShopDetail,
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

type Tab = "supplies" | "payments";

export default function SupplierPortalShopDetailPage() {
  const router = useRouter();
  const params = useParams<{ localSupplierId: string }>();
  const localSupplierId = params.localSupplierId;
  const [detail, setDetail] = useState<SupplierPortalShopDetail | null>(null);
  const [payments, setPayments] = useState<SupplierPortalPaymentRow[]>([]);
  const [tab, setTab] = useState<Tab>("supplies");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    if (!localSupplierId) return;
    void Promise.all([
      fetchSupplierPortalShopDetail(localSupplierId),
      fetchSupplierPortalPayments({ localSupplierId }),
    ])
      .then(([shop, pay]) => {
        setDetail(shop);
        setPayments(pay);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load shop"));
  }, [router, localSupplierId]);

  const currency = detail?.currency ?? "KES";

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <div>
          <Link
            href={APP_ROUTES.supplierPortalShops}
            className="text-sm text-muted-foreground underline underline-offset-2"
          >
            ← Shops
          </Link>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {detail?.shopName ?? "Shop"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail?.localSupplierName ?? "Supplier link"}
          </p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {detail ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Current balance" value={money(detail.summary.openBalance, currency)} />
            <Stat label="Total paid" value={money(detail.summary.totalPaid, currency)} />
            <Stat
              label="Last supply"
              value={fmtDate(detail.summary.lastInvoiceDate)}
            />
          </div>
        ) : null}

        <div className="flex gap-2 border-b">
          <TabButton active={tab === "supplies"} onClick={() => setTab("supplies")}>
            Supplies
          </TabButton>
          <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>
            Payments
          </TabButton>
        </div>

        {tab === "supplies" ? (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Invoice</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Paid</th>
                  <th className="px-3 py-2 font-medium">Balance</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(detail?.supplies ?? []).map((row) => (
                  <tr key={`${row.invoiceNumber}-${row.invoiceDate}`} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{row.invoiceNumber}</td>
                    <td className="px-3 py-2">{fmtDate(row.invoiceDate)}</td>
                    <td className="px-3 py-2">{money(row.grandTotal, currency)}</td>
                    <td className="px-3 py-2">{money(row.amountPaid, currency)}</td>
                    <td className="px-3 py-2">{money(row.balanceOpen, currency)}</td>
                    <td className="px-3 py-2">{row.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detail && detail.supplies.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No supplies yet.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "payments" ? (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Reference</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Shop balance</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row) => (
                  <tr key={row.paymentId} className="border-b last:border-0">
                    <td className="px-3 py-2">{fmtDate(row.paidAt)}</td>
                    <td className="px-3 py-2">{row.reference || "—"}</td>
                    <td className="px-3 py-2 font-medium">{money(row.amount, currency)}</td>
                    <td className="px-3 py-2">{row.paymentMethod}</td>
                    <td className="px-3 py-2">{money(row.shopOpenBalance, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No payments yet.</p>
            ) : null}
          </div>
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm font-medium ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
