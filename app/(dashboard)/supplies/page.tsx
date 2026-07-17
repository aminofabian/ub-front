"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreditCard, FileEdit, Package, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBranch } from "@/hooks/use-session-scope";
import {
  deletePathBSupplyInvoice,
  fetchPathBSupplies,
  type PathBSupplyListRowRecord,
} from "@/lib/api";
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
  supTableHead,
  supTableRow,
} from "../suppliers/_components/supplier-ui-tokens";

export default function SuppliesPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { me, business, loading, canPathBWrite, canPathBRead, canViewSuppliers, canViewCategories, canViewApAging } =
    useDashboard();
  const currency = business?.currency?.trim() || "KES";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const onDeleteSupply = useCallback(
    async (row: PathBSupplyListRowRecord) => {
      if (supplyN(row.amountPaid) >= 0.005) {
        toast.error("Remove payments from this invoice before deleting it.");
        return;
      }
      if (
        !window.confirm(
          `Delete supply ${row.invoiceNumber} from ${row.supplierName || "supplier"}? This reverses stock and cannot be undone.`,
        )
      ) {
        return;
      }
      setDeletingId(row.supplierInvoiceId);
      try {
        await deletePathBSupplyInvoice(row.supplierInvoiceId);
        toast.success(`Deleted ${row.invoiceNumber}.`);
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete supply.");
      } finally {
        setDeletingId(null);
      }
    },
    [refresh],
  );

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
      params.set("filter", next);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Default landing: /supplies → /supplies?filter=today
  useEffect(() => {
    const filter = searchParams.get("filter");
    const unpaid = searchParams.get("unpaid");
    if (filter != null || unpaid === "1") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", "today");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : `${pathname}?filter=today`, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

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
    <div className={cn(DASHBOARD_MAX, "relative flex min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden")}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-16 sm:pb-0">
        <SuppliesPageHeader
          canViewApAging={canViewApAging}
          canShowProcurementLinks={canShowProcurementLinks}
          canOpenNewSupply={canOpenNewSupply}
          listLoading={listLoading}
          branchScopeLabel={headerBranchName || undefined}
          onRefresh={() => void refresh()}
          onNewSupply={() => setNewOpen(true)}
        />

        {listError ? (
          <div className="px-3 pt-2 sm:px-4">
            <DashboardFeedback kind="error" text={listError} />
          </div>
        ) : null}

        <div
          className="grid grid-cols-2 border-b border-border sm:grid-cols-4"
          role="group"
          aria-label="Supply summary"
        >
          <button
            type="button"
            onClick={() => setBillFilter("all")}
            className={cn(
              "border-r border-border px-3 py-1.5 text-left transition-colors",
              billFilter === "all" ? "bg-primary/[0.07]" : "bg-card hover:bg-muted/25",
            )}
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Total
            </span>
            <span className="mt-0.5 block text-base font-bold tabular-nums leading-none text-foreground">
              {summary.count}
            </span>
          </button>
          <div className="border-r border-border bg-card px-3 py-1.5">
            <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Invoiced
            </span>
            <span className="mt-0.5 block font-mono text-[13px] font-semibold tabular-nums leading-none">
              {formatSupplyMoney(
                billFilter === "all" ? summary.totalInvoiced : filteredSummary.totalInvoiced,
                currency,
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBillFilter("paid")}
            className={cn(
              "border-r border-border border-t px-3 py-1.5 text-left transition-colors sm:border-t-0",
              billFilter === "paid" ? "bg-primary/[0.07]" : "bg-card hover:bg-muted/25",
            )}
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Paid
            </span>
            <span className="mt-0.5 block font-mono text-[13px] font-semibold tabular-nums leading-none text-emerald-700 dark:text-emerald-300">
              {formatSupplyMoney(summary.totalPaid, currency)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setBillFilter("unpaid")}
            className={cn(
              "border-t border-border px-3 py-1.5 text-left transition-colors sm:border-t-0",
              billFilter === "unpaid" ? "bg-primary/[0.07]" : "bg-card hover:bg-muted/25",
            )}
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Unpaid · {summary.unpaidCount}
            </span>
            <span
              className={cn(
                "mt-0.5 block font-mono text-[13px] font-semibold tabular-nums leading-none",
                summary.openBalance > 0.009
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-foreground",
              )}
            >
              {formatSupplyMoney(summary.openBalance, currency)}
            </span>
          </button>
        </div>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-b border-border bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-[#e8eef5] px-3 py-1 dark:bg-muted/40 sm:px-4">
            <h2 className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/80">
              {billFilter === "all" ? "All receipts" : supplyBillFilterLabel(billFilter)}
              <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground">
                unpaid first · newest after
              </span>
            </h2>
            {!listLoading ? (
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                {displayRows.length}
                {billFilter !== "all" && rows.length !== displayRows.length
                  ? ` / ${rows.length}`
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

          <div className="min-h-0 min-w-0 flex-1 lg:overflow-auto">
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
                      ? "Record your first vendor delivery with New supply."
                      : billFilter === "all"
                        ? "Supplies appear here after posted receipts."
                        : "Try a different date range or status filter."
                }
                action={
                  billFilter !== "all" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-none text-xs"
                      onClick={() => setBillFilter("all")}
                    >
                      Show all
                    </Button>
                  ) : canOpenNewSupply ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 rounded-none text-xs font-semibold"
                      onClick={() => setNewOpen(true)}
                    >
                      <Package className="size-3" aria-hidden />
                      New supply
                    </Button>
                  ) : undefined
                }
                className="m-3 border-0 bg-transparent"
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
                      deleting={deletingId === r.supplierInvoiceId}
                      onEdit={() => {
                        setEditRow(r);
                        setEditOpen(true);
                      }}
                      onDelete={() => void onDeleteSupply(r)}
                      onPayOrDetails={() => {
                        setPayRow(r);
                        setPayOpen(true);
                      }}
                    />
                  ))}
                </div>

                <table className="hidden w-full border-collapse text-left text-[13px] lg:table">
                  <thead className={cn(supTableHead, "sticky top-0 z-10")}>
                    <tr>
                      <th className="px-3 py-1.5 font-semibold">Supplier</th>
                      <th className="px-2 py-1.5 font-semibold">Invoice</th>
                      <th className="w-12 px-2 py-1.5 text-right font-semibold">Ln</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Total</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Paid</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Balance</th>
                      <th className="w-[4.5rem] px-2 py-1.5 font-semibold">Status</th>
                      <th className="w-[7.5rem] px-2 py-1.5 font-semibold">Created</th>
                      <th className="w-[7.25rem] px-2 py-1.5 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((r, idx) => {
                      const st = supplyPaymentStatusBadge(r.paymentStatus);
                      const bal = supplyN(r.balanceOpen);
                      const needsPay = bal > 0.009 && canPay;
                      return (
                        <tr
                          key={r.supplierInvoiceId}
                          className={cn(
                            supTableRow,
                            idx % 2 === 1 && "bg-[#fafbfd] dark:bg-muted/[0.06]",
                          )}
                        >
                          <td className="max-w-[14rem] truncate px-3 py-1.5 font-medium text-foreground">
                            {r.supplierName || "—"}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                            {r.invoiceNumber}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                            {r.lineCount}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[12px] tabular-nums">
                            {formatSupplyMoney(supplyN(r.grandTotal), currency)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[12px] tabular-nums text-emerald-700 dark:text-emerald-300">
                            {formatSupplyMoney(supplyN(r.amountPaid), currency)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[12px] font-semibold tabular-nums">
                            {formatSupplyMoney(bal, currency)}
                          </td>
                          <td className="px-2 py-1.5">
                            <span
                              className={cn(
                                "inline-flex border px-1 py-px text-[9px] font-bold uppercase tracking-wide",
                                st.className,
                              )}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-[11px] text-muted-foreground">
                            {new Date(r.createdAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-2 py-1 text-right">
                            <div className="inline-flex items-center justify-end gap-0.5">
                              {canEditSupplyBill ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-6 rounded-none text-muted-foreground hover:text-foreground"
                                  aria-label={`Edit ${r.invoiceNumber}`}
                                  onClick={() => {
                                    setEditRow(r);
                                    setEditOpen(true);
                                  }}
                                >
                                  <FileEdit className="size-3" aria-hidden />
                                </Button>
                              ) : null}
                              {canEditSupplyBill && supplyN(r.amountPaid) < 0.005 ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-6 rounded-none text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={`Delete ${r.invoiceNumber}`}
                                  disabled={deletingId === r.supplierInvoiceId}
                                  onClick={() => void onDeleteSupply(r)}
                                >
                                  <Trash2 className="size-3" aria-hidden />
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant={needsPay ? "default" : "outline"}
                                className={cn(
                                  "h-6 gap-1 rounded-none px-1.5 text-[10px] font-semibold",
                                  !needsPay && "border-border",
                                )}
                                disabled={!canOpenReceiptDrawer}
                                onClick={() => {
                                  setPayRow(r);
                                  setPayOpen(true);
                                }}
                              >
                                <CreditCard className="size-3" aria-hidden />
                                {needsPay ? "Pay" : "Details"}
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
      </div>

      <NewSupplyDrawer open={newOpen} onOpenChange={setNewOpen} onPosted={() => void refresh()} />

      <PaySupplyDrawer
        open={payOpen}
        onOpenChange={(o) => {
          setPayOpen(o);
          if (!o) setPayRow(null);
        }}
        row={payRow}
        onPaid={() => void refresh()}
        canDeleteSupply={canEditSupplyBill}
        onDeleteSupply={onDeleteSupply}
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

      {canOpenNewSupply && !newOpen ? (
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          aria-label="Receive new supply"
          className={cn(
            "fixed z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground",
            "shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--primary)_65%,transparent)]",
            "right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]",
            "active:scale-95 touch-manipulation sm:hidden",
          )}
        >
          <Package className="size-5" aria-hidden />
          Receive
        </button>
      ) : null}
    </div>
  );
}
