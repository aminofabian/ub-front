"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreditCard, FileEdit, Package, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { useSessionBranch } from "@/hooks/use-session-scope";
import {
  deletePathBSupplyInvoice,
  fetchPathBSupplies,
  type PathBSupplyListRowRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { displaySupplierName } from "@/lib/supplier-display";
import { SupplierDisplayName } from "@/components/suppliers/supplier-display-name";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { AdvanceDepositDrawer } from "./_components/advance-deposit-drawer";
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
import { SuppliesHeaderActions } from "./_components/supplies-header-actions";
import {
  SUPPLIES_SURFACE,
  SuppliesPageLayout,
} from "./_components/supplies-page-layout";
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
  supSectionHeader,
  supStatTile,
  supTableHead,
  supTableRow,
  supWorkspaceShell,
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
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payRow, setPayRow] = useState<PathBSupplyListRowRecord | null>(null);
  const [paySettleAll, setPaySettleAll] = useState(false);
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
    (row: PathBSupplyListRowRecord) => {
      if (supplyN(row.amountPaid) >= 0.005) {
        toast.error("Remove payments from this invoice before deleting it.");
        return;
      }
      showThemedConfirmToast({
        id: `delete-supply-${row.supplierInvoiceId}`,
        title: `Delete supply ${row.invoiceNumber}?`,
        description: `From ${displaySupplierName({ name: row.supplierName, fallback: "supplier" })}. This reverses stock and cannot be undone.`,
        confirmLabel: "Delete",
        onConfirm: async () => {
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
      });
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

  /** Unpaid invoice count + balance per supplier (from full branch list). */
  const unpaidBySupplier = useMemo(() => {
    const map = new Map<
      string,
      { count: number; total: number; firstUnpaidId: string }
    >();
    for (const r of rows) {
      const bal = supplyN(r.balanceOpen);
      if (bal <= 0.009 || !r.supplierId) continue;
      const prev = map.get(r.supplierId);
      if (prev) {
        prev.count += 1;
        prev.total += bal;
      } else {
        map.set(r.supplierId, {
          count: 1,
          total: bal,
          firstUnpaidId: r.supplierInvoiceId,
        });
      }
    }
    return map;
  }, [rows]);

  const openPay = (
    row: PathBSupplyListRowRecord,
    settleAll = false,
  ) => {
    setPayRow(row);
    setPaySettleAll(settleAll);
    setPayOpen(true);
  };

  if (loading) {
    return <DashboardLoading label="Loading session…" />;
  }

  if (!me) {
    return (
      <DashboardAccessDenied
        title="Session required"
        description="Sign in to manage supplies."
        backHref={APP_ROUTES.staffLogin}
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
    <>
      <SuppliesPageLayout
        branchScope={headerBranchName || undefined}
        headerActions={
          <SuppliesHeaderActions
            canViewApAging={canViewApAging}
            canShowProcurementLinks={canShowProcurementLinks}
            canOpenNewSupply={canOpenNewSupply}
            canPayAdvance={canPay}
            listLoading={listLoading}
            onRefresh={() => void refresh()}
            onNewSupply={() => setNewOpen(true)}
            onPayAdvance={() => setAdvanceOpen(true)}
          />
        }
      >
        {listError ? (
          <DashboardFeedback kind="error" text={listError} />
        ) : null}

        {canPay ? (
          <button
            type="button"
            onClick={() => setAdvanceOpen(true)}
            className={cn(
              SUPPLIES_SURFACE,
              "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
              "hover:border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,transparent)]",
            )}
          >
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-[var(--order-ink,#15231f)]">
                Deposit to a supplier wallet
              </span>
              <span className="mt-0.5 block text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                Prepay now — credit applies automatically when they bring supplies.
              </span>
            </span>
            <span className="shrink-0 rounded-md border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--pos-primary,#0f766e)]">
              Deposit
            </span>
          </button>
        ) : null}

        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          role="group"
          aria-label="Supply summary"
        >
          <button
            type="button"
            onClick={() => setBillFilter("all")}
            className={cn(
              supStatTile,
              "text-left transition-colors hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]",
              billFilter === "all" &&
                "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,transparent)]",
            )}
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
              Total
            </span>
            <span className="mt-1 block text-lg font-bold tabular-nums leading-none text-[var(--order-ink,#15231f)]">
              {summary.count}
            </span>
          </button>
          <div className={supStatTile}>
            <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
              Invoiced
            </span>
            <span className="mt-1 block font-mono text-[13px] font-semibold tabular-nums leading-none text-[var(--order-ink,#15231f)]">
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
              supStatTile,
              "text-left transition-colors hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]",
              billFilter === "paid" &&
                "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,transparent)]",
            )}
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
              Paid
            </span>
            <span className="mt-1 block font-mono text-[13px] font-semibold tabular-nums leading-none text-emerald-700 dark:text-emerald-300">
              {formatSupplyMoney(summary.totalPaid, currency)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setBillFilter("unpaid")}
            className={cn(
              supStatTile,
              "text-left transition-colors hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]",
              billFilter === "unpaid" &&
                "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,transparent)]",
            )}
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
              Unpaid · {summary.unpaidCount}
            </span>
            <span
              className={cn(
                "mt-1 block font-mono text-[13px] font-semibold tabular-nums leading-none",
                summary.openBalance > 0.009
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-[var(--order-ink,#15231f)]",
              )}
            >
              {formatSupplyMoney(summary.openBalance, currency)}
            </span>
          </button>
        </div>

        <section className={cn(supWorkspaceShell, "flex min-h-[20rem] flex-1 flex-col")}>
          <div className={supSectionHeader}>
            <h2 className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--order-ink,#15231f)]">
              {billFilter === "all" ? "All receipts" : supplyBillFilterLabel(billFilter)}
              <span className="ml-2 font-normal normal-case tracking-normal text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                unpaid first · newest after
              </span>
            </h2>
            {!listLoading ? (
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
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
                      className="h-7 rounded-lg text-xs"
                      onClick={() => setBillFilter("all")}
                    >
                      Show all
                    </Button>
                  ) : canOpenNewSupply ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 rounded-lg text-xs font-semibold"
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
                  {displayRows.map((r) => {
                    const unpaid = unpaidBySupplier.get(r.supplierId);
                    const showPayAll =
                      canPay &&
                      supplyN(r.balanceOpen) > 0.009 &&
                      Boolean(unpaid) &&
                      (unpaid?.count ?? 0) >= 2 &&
                      unpaid?.firstUnpaidId === r.supplierInvoiceId;
                    return (
                      <SupplyReceiptCard
                        key={r.supplierInvoiceId}
                        row={r}
                        canEditSupplyBill={canEditSupplyBill}
                        canPay={canPay}
                        canOpenReceiptDrawer={canOpenReceiptDrawer}
                        deleting={deletingId === r.supplierInvoiceId}
                        payAllTotal={
                          showPayAll ? unpaid?.total : undefined
                        }
                        payAllCount={showPayAll ? unpaid?.count : undefined}
                        onEdit={() => {
                          setEditRow(r);
                          setEditOpen(true);
                        }}
                        onDelete={() => void onDeleteSupply(r)}
                        onPayOrDetails={() => openPay(r, false)}
                        onPayAll={
                          showPayAll ? () => openPay(r, true) : undefined
                        }
                      />
                    );
                  })}
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
                      const unpaid = unpaidBySupplier.get(r.supplierId);
                      const showPayAll =
                        needsPay &&
                        Boolean(unpaid) &&
                        (unpaid?.count ?? 0) >= 2 &&
                        unpaid?.firstUnpaidId === r.supplierInvoiceId;
                      return (
                        <tr
                          key={r.supplierInvoiceId}
                          className={cn(
                            supTableRow,
                            idx % 2 === 1 && "bg-[#fafbfd] dark:bg-muted/[0.06]",
                          )}
                        >
                          <td className="max-w-[14rem] truncate px-3 py-1.5 font-medium text-foreground">
                            <span className="block truncate">
                              <SupplierDisplayName
                                name={r.supplierName}
                                fallback="—"
                              />
                            </span>
                            {showPayAll ? (
                              <span className="mt-0.5 block text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                {unpaid!.count} unpaid ·{" "}
                                {formatSupplyMoney(unpaid!.total, currency)}
                              </span>
                            ) : null}
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
                              {canEditSupplyBill &&
                              supplyN(r.amountPaid) < 0.005 ? (
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
                              {showPayAll ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-6 gap-1 rounded-none bg-emerald-600 px-1.5 text-[10px] font-semibold hover:bg-emerald-700"
                                  disabled={!canOpenReceiptDrawer}
                                  onClick={() => openPay(r, true)}
                                  title={`Clear ${unpaid!.count} unpaid invoices`}
                                >
                                  <CreditCard className="size-3" aria-hidden />
                                  Pay all
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
                                onClick={() => openPay(r, false)}
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
      </SuppliesPageLayout>

      <NewSupplyDrawer open={newOpen} onOpenChange={setNewOpen} onPosted={() => void refresh()} />

      <AdvanceDepositDrawer
        open={advanceOpen}
        onOpenChange={setAdvanceOpen}
        onDeposited={() => void refresh()}
        currency={currency}
      />

      <PaySupplyDrawer
        open={payOpen}
        onOpenChange={(o) => {
          setPayOpen(o);
          if (!o) {
            setPayRow(null);
            setPaySettleAll(false);
          }
        }}
        row={payRow}
        settleAllOnOpen={paySettleAll}
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
            "fixed z-40 flex items-center gap-2 rounded-full bg-[var(--order-ink,#15231f)] px-5 py-3.5 text-sm font-semibold text-white",
            "shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]",
            "right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]",
            "active:scale-95 touch-manipulation sm:hidden",
          )}
        >
          <Package className="size-5" aria-hidden />
          Receive
        </button>
      ) : null}
    </>
  );
}
