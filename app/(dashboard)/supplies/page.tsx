"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard,
  FileEdit,
  Package,
  Receipt,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
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
import { SuppliesPageLayout } from "./_components/supplies-page-layout";
import {
  formatSupplyMoney,
  supplyN,
  supplyPaymentStatusBadge,
} from "./_components/supplies-shared";
import {
  SupEmptyState,
  SupLoadingBlock,
} from "../suppliers/_components/supplier-layout-primitives";

type SupplierGroup = {
  supplierId: string;
  supplierName: string;
  total: number;
  count: number;
  firstUnpaidId: string;
  bills: PathBSupplyListRowRecord[];
};

function groupRowsBySupplier(
  rows: PathBSupplyListRowRecord[],
): SupplierGroup[] {
  const map = new Map<string, SupplierGroup>();
  for (const r of rows) {
    const key = r.supplierId || `anon:${r.supplierName}`;
    const bal = supplyN(r.balanceOpen);
    const prev = map.get(key);
    if (prev) {
      prev.bills.push(r);
      prev.count += 1;
      prev.total += bal;
    } else {
      map.set(key, {
        supplierId: r.supplierId,
        supplierName: r.supplierName,
        total: bal,
        count: 1,
        firstUnpaidId: r.supplierInvoiceId,
        bills: [r],
      });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export default function SuppliesPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const {
    me,
    business,
    loading,
    canPathBWrite,
    canPathBRead,
    canViewSuppliers,
    canViewCategories,
    canViewApAging,
  } = useDashboard();
  const currency = business?.currency?.trim() || "KES";
  const { branchId: headerBranchId, branchName: headerBranchName } =
    useSessionBranch();

  const canListSupplies =
    canPathBRead ||
    hasPermission(me?.permissions, Permission.PurchasingPaymentRead);
  const canOpenNewSupply =
    canPathBWrite && canViewSuppliers && canViewCategories;
  const canEditSupplyBill = canPathBWrite;
  const canPay = hasPermission(
    me?.permissions,
    Permission.PurchasingPaymentWrite,
  );
  const canPaymentRead = hasPermission(
    me?.permissions,
    Permission.PurchasingPaymentRead,
  );
  const canOpenReceiptDrawer = canPay || canPaymentRead;

  const [rows, setRows] = useState<PathBSupplyListRowRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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
      if (row.source === "path_a") {
        toast.error("Order delivery invoices cannot be deleted from Supplies.");
        return;
      }
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
            toast.error(
              e instanceof Error ? e.message : "Could not delete supply.",
            );
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

  const filteredRows = useMemo(
    () => filterAndSortSupplyRows(rows, billFilter),
    [rows, billFilter],
  );

  const displayRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filteredRows;
    return filteredRows.filter((r) => {
      const name = (r.supplierName ?? "").toLowerCase();
      const inv = (r.invoiceNumber ?? "").toLowerCase();
      return name.includes(q) || inv.includes(q);
    });
  }, [filteredRows, query]);

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

  const unpaidGroups = useMemo(
    () =>
      billFilter === "unpaid" ? groupRowsBySupplier(displayRows) : [],
    [billFilter, displayRows],
  );

  const openPay = (row: PathBSupplyListRowRecord, settleAll = false) => {
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
  const isUnpaid = billFilter === "unpaid";

  return (
    <>
      <SuppliesPageLayout
        branchScope={headerBranchName || undefined}
        meta={
          summary.unpaidCount > 0 ? (
            <button
              type="button"
              onClick={() => setBillFilter("unpaid")}
              className={cn(
                "rounded-md px-1.5 py-0.5 tabular-nums transition",
                isUnpaid
                  ? "bg-amber-800/10 font-semibold text-amber-900"
                  : "hover:bg-amber-800/10 hover:text-amber-900",
              )}
            >
              <span className="font-semibold text-amber-900">
                {summary.unpaidCount}
              </span>{" "}
              unpaid · {formatSupplyMoney(summary.openBalance, currency)}
            </button>
          ) : (
            <span>All caught up</span>
          )
        }
        headerActions={
          <SuppliesHeaderActions
            canViewApAging={canViewApAging}
            canShowProcurementLinks={canShowProcurementLinks}
            canOpenNewSupply={canOpenNewSupply}
            canPayAdvance={canPay}
            listLoading={listLoading}
            unpaidActive={isUnpaid}
            onRefresh={() => void refresh()}
            onNewSupply={() => setNewOpen(true)}
            onPayAdvance={() => setAdvanceOpen(true)}
            onPayOpen={() => setBillFilter("unpaid")}
          />
        }
      >
        {listError ? (
          <DashboardFeedback kind="error" text={listError} />
        ) : null}

        {/* Pulse strip */}
        <section
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
          aria-label="Supply pulse"
        >
          <PulseTile
            label="Open balance"
            value={formatSupplyMoney(summary.openBalance, currency)}
            hint={
              summary.unpaidCount === 0
                ? "Nothing owing"
                : `${summary.unpaidCount} open bill${summary.unpaidCount === 1 ? "" : "s"}`
            }
            active={isUnpaid}
            emphasize={summary.openBalance > 0.009}
            onClick={() => setBillFilter("unpaid")}
          />
          <PulseTile
            label={isUnpaid ? "In view" : "Invoiced"}
            value={formatSupplyMoney(
              isUnpaid || billFilter !== "all"
                ? filteredSummary.totalInvoiced
                : summary.totalInvoiced,
              currency,
            )}
            hint={
              billFilter === "all"
                ? `${summary.count} receipts`
                : `${displayRows.length} · ${supplyBillFilterLabel(billFilter)}`
            }
            active={billFilter === "all"}
            onClick={() => setBillFilter("all")}
          />
          <PulseTile
            label="Paid in"
            value={formatSupplyMoney(summary.totalPaid, currency)}
            hint="Settled to date"
            active={billFilter === "paid"}
            tone="ok"
            onClick={() => setBillFilter("paid")}
          />
          {canPay ? (
            <button
              type="button"
              onClick={() => setAdvanceOpen(true)}
              className={cn(
                "flex flex-col justify-between rounded-xl border px-3 py-2.5 text-left transition",
                "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,#fff)]",
                "hover:border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)]",
              )}
            >
              <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--pos-primary,#0f766e)]">
                <Wallet className="size-3" aria-hidden />
                Supplier wallet
              </span>
              <span className="mt-2 font-heading text-sm font-semibold text-[var(--order-ink,#15231f)]">
                Deposit credit
              </span>
              <span className="mt-0.5 text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                Prepay — applies on next supply
              </span>
            </button>
          ) : (
            <PulseTile
              label="Receipts"
              value={String(summary.count)}
              hint="All posted supplies"
              active={billFilter === "all"}
              onClick={() => setBillFilter("all")}
            />
          )}
        </section>

        <section className="flex min-h-[20rem] flex-1 flex-col overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_94%,transparent)] shadow-[0_10px_28px_-22px_rgba(21,35,31,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3 py-2 sm:px-3.5">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold tracking-tight text-[var(--order-ink,#15231f)]">
                {isUnpaid
                  ? "Open payables"
                  : billFilter === "all"
                    ? "All receipts"
                    : supplyBillFilterLabel(billFilter)}
              </h2>
              <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                {isUnpaid
                  ? "Grouped by vendor · largest balance first"
                  : "Unpaid first · newest after"}
              </p>
            </div>
            <label className="relative block w-full max-w-[15rem]">
              <span className="sr-only">Search supplies</span>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]"
                aria-hidden
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Vendor or invoice…"
                className="h-8 w-full rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white pl-8 pr-2.5 text-sm outline-none focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,transparent)]"
              />
            </label>
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
                  query.trim()
                    ? "No matching receipts"
                    : billFilter === "all"
                      ? "No supplies yet"
                      : `No ${supplyBillFilterLabel(billFilter).toLowerCase()} receipts`
                }
                description={
                  query.trim()
                    ? "Try another vendor or invoice number."
                    : billFilter === "unpaid"
                      ? "All posted supplies are fully paid, or nothing has been received yet."
                      : billFilter === "all" && canOpenNewSupply
                        ? "Record your first vendor delivery with New supply."
                        : billFilter === "all"
                          ? "Supplies appear here after posted receipts."
                          : "Try a different date range or status filter."
                }
                action={
                  query.trim() ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-lg text-xs"
                      onClick={() => setQuery("")}
                    >
                      Clear search
                    </Button>
                  ) : billFilter !== "all" ? (
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
            ) : isUnpaid ? (
              <UnpaidByVendor
                groups={unpaidGroups}
                currency={currency}
                canEditSupplyBill={canEditSupplyBill}
                canPay={canPay}
                canOpenReceiptDrawer={canOpenReceiptDrawer}
                deletingId={deletingId}
                onEdit={(r) => {
                  setEditRow(r);
                  setEditOpen(true);
                }}
                onDelete={(r) => void onDeleteSupply(r)}
                onPay={(r, all) => openPay(r, all)}
              />
            ) : (
              <>
                <div className="space-y-2 p-2.5 lg:hidden">
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
                        payAllTotal={showPayAll ? unpaid?.total : undefined}
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
                  <thead className="sticky top-0 z-10 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_85%,#fff)] text-[10px] uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                    <tr>
                      <th className="px-3.5 py-2 font-semibold">Supplier</th>
                      <th className="px-2 py-2 font-semibold">Invoice</th>
                      <th className="w-12 px-2 py-2 text-right font-semibold">
                        Ln
                      </th>
                      <th className="px-2 py-2 text-right font-semibold">
                        Total
                      </th>
                      <th className="px-2 py-2 text-right font-semibold">
                        Paid
                      </th>
                      <th className="px-2 py-2 text-right font-semibold">
                        Balance
                      </th>
                      <th className="w-[4.5rem] px-2 py-2 font-semibold">
                        Status
                      </th>
                      <th className="w-[7.5rem] px-2 py-2 font-semibold">
                        Created
                      </th>
                      <th className="w-[7.25rem] px-2 py-2 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((r) => {
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
                            "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,transparent)]",
                            needsPay &&
                              "bg-[color-mix(in_srgb,#b45309_3%,transparent)]",
                          )}
                        >
                          <td className="max-w-[14rem] truncate px-3.5 py-2 font-medium text-[var(--order-ink,#15231f)]">
                            <span className="block truncate">
                              <SupplierDisplayName
                                name={r.supplierName}
                                fallback="—"
                              />
                            </span>
                            {showPayAll ? (
                              <span className="mt-0.5 block text-[10px] font-medium text-amber-800">
                                {unpaid!.count} unpaid ·{" "}
                                {formatSupplyMoney(unpaid!.total, currency)}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2 py-2 font-mono text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                            {r.invoiceNumber}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                            {r.lineCount}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-[12px] tabular-nums">
                            {formatSupplyMoney(supplyN(r.grandTotal), currency)}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-[12px] tabular-nums text-emerald-700">
                            {formatSupplyMoney(supplyN(r.amountPaid), currency)}
                          </td>
                          <td
                            className={cn(
                              "px-2 py-2 text-right font-mono text-[12px] font-semibold tabular-nums",
                              needsPay && "text-amber-900",
                            )}
                          >
                            {formatSupplyMoney(bal, currency)}
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={cn(
                                "inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                st.className,
                              )}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                            {new Date(r.createdAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <div className="inline-flex items-center justify-end gap-0.5">
                              {canEditSupplyBill ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 rounded-md text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)] hover:text-[var(--order-ink,#15231f)]"
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
                              supplyN(r.amountPaid) < 0.005 &&
                              r.source !== "path_a" ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 rounded-md text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)] hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={`Delete ${r.invoiceNumber}`}
                                  disabled={
                                    deletingId === r.supplierInvoiceId
                                  }
                                  onClick={() => void onDeleteSupply(r)}
                                >
                                  <Trash2 className="size-3" aria-hidden />
                                </Button>
                              ) : null}
                              {showPayAll ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 gap-1 rounded-md bg-emerald-700 px-2 text-[10px] font-semibold hover:bg-emerald-800"
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
                                  "h-7 gap-1 rounded-md px-2 text-[10px] font-semibold",
                                  needsPay &&
                                    "bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]",
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

      <NewSupplyDrawer
        open={newOpen}
        onOpenChange={setNewOpen}
        onPosted={() => void refresh()}
      />

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

function PulseTile({
  label,
  value,
  hint,
  active,
  emphasize,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  active?: boolean;
  emphasize?: boolean;
  tone?: "ok";
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-left transition",
        active
          ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,#fff)] shadow-sm"
          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white/90",
        onClick &&
          !active &&
          "hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
        emphasize &&
          !active &&
          "border-[color-mix(in_srgb,#b45309_22%,transparent)]",
      )}
    >
      <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
        {label}
      </span>
      <span
        className={cn(
          "mt-1.5 block font-heading text-[15px] font-semibold leading-none tabular-nums tracking-[-0.02em]",
          tone === "ok"
            ? "text-emerald-700"
            : emphasize
              ? "text-amber-900"
              : "text-[var(--order-ink,#15231f)]",
        )}
      >
        {value}
      </span>
      <span className="mt-1 block text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
        {hint}
      </span>
    </Comp>
  );
}

function UnpaidByVendor({
  groups,
  currency,
  canEditSupplyBill,
  canPay,
  canOpenReceiptDrawer,
  deletingId,
  onEdit,
  onDelete,
  onPay,
}: {
  groups: SupplierGroup[];
  currency: string;
  canEditSupplyBill: boolean;
  canPay: boolean;
  canOpenReceiptDrawer: boolean;
  deletingId: string | null;
  onEdit: (r: PathBSupplyListRowRecord) => void;
  onDelete: (r: PathBSupplyListRowRecord) => void;
  onPay: (r: PathBSupplyListRowRecord, settleAll: boolean) => void;
}) {
  return (
    <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
      {groups.map((group) => {
        const showPayAll = canPay && group.count >= 2 && group.total > 0.009;
        const first = group.bills[0];
        return (
          <li key={group.supplierId || group.firstUnpaidId} className="p-3 sm:p-3.5">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--order-ink,#15231f)]">
                  <SupplierDisplayName
                    name={group.supplierName}
                    fallback="Supplier"
                  />
                </p>
                <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                  {group.count} open bill{group.count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-heading text-base font-semibold tabular-nums text-amber-900">
                  {formatSupplyMoney(group.total, currency)}
                </p>
                {showPayAll && first ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1 rounded-md bg-emerald-700 px-2.5 text-[11px] font-semibold hover:bg-emerald-800"
                    disabled={!canOpenReceiptDrawer}
                    onClick={() => onPay(first, true)}
                  >
                    <CreditCard className="size-3" aria-hidden />
                    Pay all
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 lg:hidden">
              {group.bills.map((r) => (
                <SupplyReceiptCard
                  key={r.supplierInvoiceId}
                  row={r}
                  hideSupplier
                  canEditSupplyBill={canEditSupplyBill}
                  canPay={canPay}
                  canOpenReceiptDrawer={canOpenReceiptDrawer}
                  deleting={deletingId === r.supplierInvoiceId}
                  onEdit={() => onEdit(r)}
                  onDelete={() => onDelete(r)}
                  onPayOrDetails={() => onPay(r, false)}
                />
              ))}
            </div>

            {/* Desktop nested rows */}
            <ul className="hidden space-y-1.5 lg:block">
              {group.bills.map((r) => {
                const st = supplyPaymentStatusBadge(r.paymentStatus);
                const bal = supplyN(r.balanceOpen);
                const needsPay = bal > 0.009 && canPay;
                return (
                  <li
                    key={r.supplierInvoiceId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_45%,transparent)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium text-[var(--order-ink,#15231f)]">
                        {r.invoiceNumber}
                      </p>
                      <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                        <span
                          className={cn(
                            "mr-1.5 inline-flex rounded px-1 py-px text-[9px] font-bold uppercase",
                            st.className,
                          )}
                        >
                          {st.label}
                        </span>
                        {new Date(r.createdAt).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                        })}
                        {" · "}
                        {r.lineCount} line{r.lineCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-amber-900">
                          {formatSupplyMoney(bal, currency)}
                        </p>
                        <p className="text-[10px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                          of {formatSupplyMoney(supplyN(r.grandTotal), currency)}{" "}
                          · paid{" "}
                          {formatSupplyMoney(supplyN(r.amountPaid), currency)}
                        </p>
                      </div>
                      {canEditSupplyBill ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-md"
                          aria-label={`Edit ${r.invoiceNumber}`}
                          onClick={() => onEdit(r)}
                        >
                          <FileEdit className="size-3.5" aria-hidden />
                        </Button>
                      ) : null}
                      {canEditSupplyBill &&
                      supplyN(r.amountPaid) < 0.005 &&
                      r.source !== "path_a" ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-md text-destructive hover:bg-destructive/10"
                          aria-label={`Delete ${r.invoiceNumber}`}
                          disabled={deletingId === r.supplierInvoiceId}
                          onClick={() => onDelete(r)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        className={cn(
                          "h-8 gap-1 rounded-md px-2.5 text-[11px] font-semibold",
                          needsPay
                            ? "bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]"
                            : "",
                        )}
                        variant={needsPay ? "default" : "outline"}
                        disabled={!canOpenReceiptDrawer}
                        onClick={() => onPay(r, false)}
                      >
                        <CreditCard className="size-3" aria-hidden />
                        {needsPay ? "Pay" : "Details"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
