"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, CreditCard, FileEdit, Loader2, PackagePlus, RefreshCw, Truck } from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
  DASHBOARD_MAX_WIDE,
  dashboardHintClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { fetchPathBSupplies, type PathBSupplyListRowRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { EditSupplyBillDrawer } from "./_components/edit-supply-bill-drawer";
import { NewSupplyDrawer } from "./_components/new-supply-drawer";
import { PaySupplyDrawer } from "./_components/pay-supply-drawer";

function n(v: number | string): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function formatMoney(v: number): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusBadge(status: string): { label: string; className: string } {
  const s = status.toUpperCase();
  if (s === "PAID") {
    return {
      label: "Paid",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
    };
  }
  if (s === "PARTIAL") {
    return {
      label: "Partial",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    };
  }
  return {
    label: "Unpaid",
    className: "border-border bg-muted/50 text-muted-foreground",
  };
}

export default function SuppliesPage() {
  const { me, loading, canPathBWrite, canPathBRead, canViewSuppliers, canViewCategories, canViewApAging } =
    useDashboard();

  const canListSupplies = canPathBRead || hasPermission(me?.permissions, Permission.PurchasingPaymentRead);
  const canOpenNewSupply = canPathBWrite && canViewSuppliers && canViewCategories;
  const canEditSupplyBill = canPathBWrite;
  const canPay = hasPermission(me?.permissions, Permission.PurchasingPaymentWrite);
  const canPaymentRead = hasPermission(me?.permissions, Permission.PurchasingPaymentRead);
  const canOpenReceiptDrawer = canPay || canPaymentRead;

  const [rows, setRows] = useState<PathBSupplyListRowRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payRow, setPayRow] = useState<PathBSupplyListRowRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<PathBSupplyListRowRecord | null>(null);

  const refresh = useCallback(async () => {
    if (!canListSupplies) {
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      setRows(await fetchPathBSupplies());
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not load supplies.");
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [canListSupplies]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial list load tied to auth gate
    void refresh();
  }, [refresh]);

  if (loading) {
    return <DashboardLoading />;
  }

  if (!me) {
    return (
      <DashboardAccessDenied
        title="Session required"
        description="Sign in to manage supplies."
        backHref={APP_ROUTES.login}
        backLabel="Login"
      />
    );
  }

  if (!canListSupplies) {
    return (
      <DashboardAccessDenied
        title="Supplies"
        description="You need Path B purchasing read and/or supplier payment read to view this list."
        backHref={APP_ROUTES.business}
        backLabel="Back"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashboardPageHero
          icon={Truck}
          eyebrow="Purchasing"
          title="Supplies"
          description="Direct receipts from vendors: stock in, supplier invoices, and payables. One row per posted supply."
          compact
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1" disabled={listLoading} onClick={() => void refresh()}>
            <RefreshCw className={cn("size-3.5", listLoading && "animate-spin")} />
            Refresh
          </Button>
          {canOpenNewSupply ? (
            <Button type="button" size="sm" className="gap-1.5 shadow-sm" onClick={() => setNewOpen(true)}>
              <PackagePlus className="size-3.5" />
              New supply
            </Button>
          ) : null}
        </div>
      </div>

      <DashboardQuickLinks
        compact
        links={[
          ...(canViewApAging
            ? [{ href: APP_ROUTES.purchasingApAging, label: "AP aging", desc: "", icon: BarChart3 }]
            : []),
          {
            href: APP_ROUTES.purchasingRecordPayment,
            label: "Record payment",
            desc: "",
            icon: CreditCard,
          },
          { href: APP_ROUTES.suppliers, label: "Suppliers", desc: "", icon: Truck },
        ]}
      />

      {listError ? <DashboardFeedback kind="error" text={listError} /> : null}

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Receipt history</h2>
            <p className={dashboardHintClass()}>Path B supplies only (linked to a purchase session). Pay to reduce open balance.</p>
          </div>
          {listLoading ? (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading…
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{rows.length} record(s)</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted/90 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3 text-right">Lines</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right"> </th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {rows.length === 0 && !listLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    No supplies yet. {canOpenNewSupply ? "Start with New supply." : null}
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => {
                const st = statusBadge(r.paymentStatus);
                const bal = n(r.balanceOpen);
                return (
                  <tr key={r.supplierInvoiceId} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-foreground">{r.supplierName || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.invoiceNumber}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.lineCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatMoney(n(r.grandTotal))}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                      {formatMoney(n(r.amountPaid))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium tabular-nums">{formatMoney(bal)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          st.className,
                        )}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {canEditSupplyBill ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => {
                              setEditRow(r);
                              setEditOpen(true);
                            }}
                          >
                            <FileEdit className="size-3.5" />
                            Edit bill
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant={bal > 0.009 && canPay ? "default" : "outline"}
                          className="h-8 gap-1"
                          disabled={!canOpenReceiptDrawer}
                          onClick={() => {
                            setPayRow(r);
                            setPayOpen(true);
                          }}
                        >
                          <CreditCard className="size-3.5" />
                          {bal > 0.009 && canPay ? "Pay" : "Details"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <NewSupplyDrawer open={newOpen} onOpenChange={setNewOpen} onPosted={() => void refresh()} />

      <PaySupplyDrawer
        open={payOpen}
        onOpenChange={(o) => {
          setPayOpen(o);
          if (!o) {
            setPayRow(null);
          }
        }}
        row={payRow}
        onPaid={() => void refresh()}
      />

      <EditSupplyBillDrawer
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) {
            setEditRow(null);
          }
        }}
        row={editRow}
        onSaved={() => void refresh()}
      />
    </div>
  );
}
