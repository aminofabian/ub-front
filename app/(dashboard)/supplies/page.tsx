"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, FileEdit, Package, Receipt } from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
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
import { SuppliesPageHeader } from "./_components/SuppliesPageHeader";
import {
  formatSupplyMoney,
  supplyN,
  supplyPaymentStatusBadge,
} from "./_components/supplies-shared";
import {
  SupEmptyState,
  SupLoadingBlock,
} from "../suppliers/_components/supplier-layout-primitives";
import {
  supPageRoot,
  supStatTile,
  supTableHead,
  supTableRow,
  supWorkspaceInner,
  supWorkspaceShell,
} from "../suppliers/_components/supplier-ui-tokens";

export default function SuppliesPage() {
  const searchParams = useSearchParams();
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
    if (!canListSupplies) return;
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
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (searchParams.get("onboarding") === "create-supply" && canOpenNewSupply) {
      setNewOpen(true);
    }
  }, [searchParams, canOpenNewSupply]);

  const summary = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let openBalance = 0;
    let unpaidCount = 0;
    for (const r of rows) {
      totalInvoiced += supplyN(r.grandTotal);
      totalPaid += supplyN(r.amountPaid);
      const bal = supplyN(r.balanceOpen);
      if (bal > 0.009) {
        openBalance += bal;
        unpaidCount += 1;
      }
    }
    return { totalInvoiced, totalPaid, openBalance, unpaidCount, count: rows.length };
  }, [rows]);

  if (loading) {
    return <DashboardLoading label="Loading session…" />;
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
    <div className={cn(supPageRoot, "mx-auto max-w-6xl gap-4 px-3 pb-8 sm:px-4 lg:gap-5")}>
      <SuppliesPageHeader
        canViewApAging={canViewApAging}
        canOpenNewSupply={canOpenNewSupply}
        listLoading={listLoading}
        onRefresh={() => void refresh()}
        onNewSupply={() => setNewOpen(true)}
      />

      {listError ? <DashboardFeedback kind="error" text={listError} /> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className={supStatTile}>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Receipts
          </span>
          <span className="mt-1 block font-heading text-xl font-bold tabular-nums text-foreground">
            {summary.count}
          </span>
        </div>
        <div className={supStatTile}>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Invoiced
          </span>
          <span className="mt-1 block font-mono text-lg font-semibold tabular-nums">
            {formatSupplyMoney(summary.totalInvoiced)}
          </span>
        </div>
        <div className={supStatTile}>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Paid
          </span>
          <span className="mt-1 block font-mono text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {formatSupplyMoney(summary.totalPaid)}
          </span>
        </div>
        <div className={supStatTile}>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Open ({summary.unpaidCount})
          </span>
          <span
            className={cn(
              "mt-1 block font-mono text-lg font-semibold tabular-nums",
              summary.openBalance > 0.009
                ? "text-amber-800 dark:text-amber-200"
                : "text-foreground",
            )}
          >
            {formatSupplyMoney(summary.openBalance)}
          </span>
        </div>
      </div>

      <section className={supWorkspaceShell}>
        <div className={cn(supWorkspaceInner, "gap-0 p-0 sm:p-0")}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/45 bg-gradient-to-r from-muted/35 to-transparent px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Receipt history
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Pay or open details to reduce open balance. Edit bill adjusts invoice
                and lines when unpaid.
              </p>
            </div>
            {!listLoading ? (
              <span className="rounded-md bg-background/80 px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-border/50">
                {rows.length} record{rows.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            {listLoading && rows.length === 0 ? (
              <SupLoadingBlock label="Loading supplies…" />
            ) : rows.length === 0 ? (
              <SupEmptyState
                icon={Receipt}
                title="No supplies yet"
                description={
                  canOpenNewSupply
                    ? "Record your first vendor delivery with New supply — stock and payables post together."
                    : "Supplies appear here after posted Path B receipts."
                }
                action={
                  canOpenNewSupply ? (
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 rounded-lg font-semibold"
                      onClick={() => setNewOpen(true)}
                    >
                      <Package className="size-3.5" aria-hidden />
                      New supply
                    </Button>
                  ) : undefined
                }
                className="m-4 border-0 bg-transparent"
              />
            ) : (
              <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
                <thead className={supTableHead}>
                  <tr>
                    <th className="px-4 py-3 font-semibold sm:px-5">Supplier</th>
                    <th className="px-4 py-3 font-semibold sm:px-5">Invoice</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-5">Lines</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-5">Total</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-5">Paid</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-5">Balance</th>
                    <th className="px-4 py-3 font-semibold sm:px-5">Status</th>
                    <th className="px-4 py-3 font-semibold sm:px-5">Created</th>
                    <th className="px-4 py-3 text-right sm:px-5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = supplyPaymentStatusBadge(r.paymentStatus);
                    const bal = supplyN(r.balanceOpen);
                    return (
                      <tr key={r.supplierInvoiceId} className={supTableRow}>
                        <td className="px-4 py-3.5 sm:px-5">
                          <span className="font-medium text-foreground">
                            {r.supplierName || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground sm:px-5">
                          {r.invoiceNumber}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums sm:px-5">
                          {r.lineCount}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono tabular-nums sm:px-5">
                          {formatSupplyMoney(supplyN(r.grandTotal))}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-300 sm:px-5">
                          {formatSupplyMoney(supplyN(r.amountPaid))}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums sm:px-5">
                          {formatSupplyMoney(bal)}
                        </td>
                        <td className="px-4 py-3.5 sm:px-5">
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              st.className,
                            )}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground sm:px-5">
                          {new Date(r.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3.5 text-right sm:px-5">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {canEditSupplyBill ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 rounded-lg text-xs"
                                onClick={() => {
                                  setEditRow(r);
                                  setEditOpen(true);
                                }}
                              >
                                <FileEdit className="size-3.5" aria-hidden />
                                Manage
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant={bal > 0.009 && canPay ? "default" : "outline"}
                              className="h-8 gap-1 rounded-lg text-xs"
                              disabled={!canOpenReceiptDrawer}
                              onClick={() => {
                                setPayRow(r);
                                setPayOpen(true);
                              }}
                            >
                              <CreditCard className="size-3.5" aria-hidden />
                              {bal > 0.009 && canPay ? "Pay" : "Details"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <NewSupplyDrawer open={newOpen} onOpenChange={setNewOpen} onPosted={() => void refresh()} />

      <PaySupplyDrawer
        open={payOpen}
        onOpenChange={(o) => {
          setPayOpen(o);
          if (!o) setPayRow(null);
        }}
        row={payRow}
        onPaid={() => void refresh()}
      />

      <EditSupplyBillDrawer
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditRow(null);
        }}
        row={editRow}
        onSaved={() => void refresh()}
      />
    </div>
  );
}
