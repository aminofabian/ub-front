"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreditCard, FileEdit, Package, Receipt } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBranch } from "@/hooks/use-session-scope";
import { fetchPathBSupplies, type PathBSupplyListRowRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { EditSupplyBillDrawer } from "./_components/edit-supply-bill-drawer";
import { NewSupplyDrawer } from "./_components/new-supply-drawer";
import { PaySupplyDrawer } from "./_components/pay-supply-drawer";
import { SupplyReceiptCard } from "./_components/supply-receipt-card";
import { SuppliesBillFilterBar } from "./_components/supplies-bill-filter-bar";
import {
  filterAndSortSupplyRows,
  matchesSupplyBillFilter,
  parseSupplyBillFilter,
  summarizeSupplyRows,
  SUPPLY_BILL_FILTERS,
  supplyBillFilterLabel,
  type SupplyBillFilterId,
} from "./_components/supplies-bill-filters";
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
  supStatTile,
  supTableHead,
  supTableRow,
} from "../suppliers/_components/supplier-ui-tokens";

export default function SuppliesPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading, canPathBWrite, canPathBRead, canViewSuppliers, canViewCategories, canViewApAging } =
    useDashboard();
  const { branchId: headerBranchId, branchName: headerBranchName } =
    useSessionBranch();

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
      setRows(
        await fetchPathBSupplies({
          branchId: headerBranchId?.trim() || undefined,
        }),
      );
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not load supplies.");
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [canListSupplies, headerBranchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (searchParams.get("onboarding") === "create-supply" && canOpenNewSupply) {
      setNewOpen(true);
    }
  }, [searchParams, canOpenNewSupply]);

  const billFilter = parseSupplyBillFilter(
    searchParams.get("filter"),
    searchParams.get("unpaid"),
  );

  const setBillFilter = useCallback(
    (next: SupplyBillFilterId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("unpaid");
      if (next === "all") {
        params.delete("filter");
      } else {
        params.set("filter", next);
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const displayRows = useMemo(
    () => filterAndSortSupplyRows(rows, billFilter),
    [rows, billFilter],
  );

  const filterCounts = useMemo(() => {
    const counts: Partial<Record<SupplyBillFilterId, number>> = {};
    for (const f of SUPPLY_BILL_FILTERS) {
      counts[f.id] = rows.filter((r) => matchesSupplyBillFilter(r, f.id)).length;
    }
    return counts;
  }, [rows]);

  const summary = useMemo(() => summarizeSupplyRows(rows), [rows]);

  const filteredSummary = useMemo(
    () => summarizeSupplyRows(displayRows),
    [displayRows],
  );

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

  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const isStockManager = roleKey === "stock_manager";
  const canShowProcurementLinks = !isStockManager;

  return (
    <div className={cn(DASHBOARD_MAX, "min-w-0 max-w-full overflow-x-hidden")}>
      <div className="min-w-0 space-y-3">
        <SuppliesPageHeader
        canViewApAging={canViewApAging}
        canShowProcurementLinks={canShowProcurementLinks}
        canOpenNewSupply={canOpenNewSupply}
        listLoading={listLoading}
        branchScopeLabel={headerBranchName || undefined}
        onRefresh={() => void refresh()}
        onNewSupply={() => setNewOpen(true)}
      />

      {listError ? <DashboardFeedback kind="error" text={listError} /> : null}

      <div
        className="flex gap-2 overflow-x-auto pb-0.5 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0"
        role="group"
        aria-label="Supply summary"
      >
        <button
          type="button"
          onClick={() => setBillFilter("all")}
          className={cn(
            supStatTile,
            "min-w-[5.75rem] shrink-0 px-2.5 py-2 text-left transition-colors sm:min-w-0",
            billFilter === "all"
              ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/25"
              : "hover:bg-muted/30",
          )}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Total
          </span>
          <span className="mt-0.5 block text-base font-bold tabular-nums text-foreground sm:text-xl">
            {summary.count}
          </span>
        </button>
        <div className={cn(supStatTile, "min-w-[5.75rem] shrink-0 px-2.5 py-2 sm:min-w-0")}>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Invoiced
          </span>
          <span className="mt-0.5 block font-mono text-sm font-semibold tabular-nums sm:text-lg">
            {formatSupplyMoney(
              billFilter === "all" ? summary.totalInvoiced : filteredSummary.totalInvoiced,
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setBillFilter("paid")}
          className={cn(
            supStatTile,
            "min-w-[5.75rem] shrink-0 px-2.5 py-2 text-left transition-colors sm:min-w-0",
            billFilter === "paid"
              ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/25"
              : "hover:bg-muted/30",
          )}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Paid
          </span>
          <span className="mt-0.5 block font-mono text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300 sm:text-lg">
            {formatSupplyMoney(summary.totalPaid)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setBillFilter("unpaid")}
          className={cn(
            supStatTile,
            "min-w-[5.75rem] shrink-0 px-2.5 py-2 text-left transition-colors sm:min-w-0",
            billFilter === "unpaid"
              ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/25"
              : "hover:bg-muted/30",
          )}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Unpaid ({summary.unpaidCount})
          </span>
          <span
            className={cn(
              "mt-0.5 block font-mono text-sm font-semibold tabular-nums sm:text-lg",
              summary.openBalance > 0.009
                ? "text-amber-800 dark:text-amber-200"
                : "text-foreground",
            )}
          >
            {formatSupplyMoney(summary.openBalance)}
          </span>
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/45 bg-muted/25 px-3 py-2.5 sm:px-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {billFilter === "all" ? "All receipts" : supplyBillFilterLabel(billFilter)}
            </h2>
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
              {billFilter === "all"
                ? "Unpaid bills first, then newest — use filters to narrow the list."
                : billFilter === "unpaid"
                  ? "Open balances — use Pay on each row."
                  : "Filtered receipt list — newest first."}
            </p>
          </div>
          {!listLoading ? (
            <span className="shrink-0 rounded-md bg-background/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-border/50">
              {displayRows.length} shown
              {billFilter !== "all" && rows.length !== displayRows.length
                ? ` · ${rows.length} total`
                : ""}
            </span>
          ) : null}
        </div>

        <SuppliesBillFilterBar
          value={billFilter}
          onChange={setBillFilter}
          counts={filterCounts}
          disabled={listLoading}
        />

        <div className="min-w-0 lg:overflow-x-auto">
            {listLoading && rows.length === 0 ? (
              <SupLoadingBlock label="Loading supplies…" />
            ) : displayRows.length === 0 ? (
              <SupEmptyState
                icon={Receipt}
                title={
                  billFilter === "all"
                    ? "No supplies yet"
                    : `No ${supplyBillFilterLabel(billFilter).toLowerCase()} receipts`
                }
                description={
                  billFilter === "unpaid"
                    ? "All posted supplies are fully paid, or nothing has been received yet."
                    : billFilter === "all" && canOpenNewSupply
                      ? "Record your first vendor delivery with New supply — stock and payables post together."
                      : billFilter === "all"
                        ? "Supplies appear here after posted Path B receipts."
                        : "Try a different date range or status filter."
                }
                action={
                  billFilter !== "all" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => setBillFilter("all")}
                    >
                      Show all receipts
                    </Button>
                  ) : canOpenNewSupply ? (
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
              <>
                <div className="divide-y divide-border/60 lg:hidden">
                  {displayRows.map((r) => (
                    <SupplyReceiptCard
                      key={r.supplierInvoiceId}
                      row={r}
                      canEditSupplyBill={canEditSupplyBill}
                      canPay={canPay}
                      canOpenReceiptDrawer={canOpenReceiptDrawer}
                      onManage={() => {
                        setEditRow(r);
                        setEditOpen(true);
                      }}
                      onPayOrDetails={() => {
                        setPayRow(r);
                        setPayOpen(true);
                      }}
                    />
                  ))}
                </div>

                <table className="hidden w-full min-w-[64rem] border-collapse text-left text-sm lg:table">
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
                    {displayRows.map((r) => {
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
              </>
            )}
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
    </div>
  );
}
