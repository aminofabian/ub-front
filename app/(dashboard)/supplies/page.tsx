"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  Receipt,
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
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { AdvanceDepositDrawer } from "./_components/advance-deposit-drawer";
import { EditSupplyBillDrawer } from "./_components/edit-supply-bill-drawer";
import { NewSupplyDrawer } from "./_components/new-supply-drawer";
import { PaySupplyDrawer } from "./_components/pay-supply-drawer";
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
import { SuppliesReceiptWorkspace } from "./_components/supplies-receipt-workspace";
import {
  formatSupplyMoney,
  supplyN,
} from "./_components/supplies-shared";
import {
  UnpaidSettleWorkspace,
  type UnpaidSupplierGroup,
} from "./_components/unpaid-settle-workspace";
import {
  SupEmptyState,
  SupLoadingBlock,
} from "../suppliers/_components/supplier-layout-primitives";

function groupRowsBySupplier(
  rows: PathBSupplyListRowRecord[],
): UnpaidSupplierGroup[] {
  const map = new Map<string, UnpaidSupplierGroup>();
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
  const [advanceSupplierId, setAdvanceSupplierId] = useState<string | null>(
    null,
  );
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
    if (
      searchParams.get("onboarding") === "create-supply" &&
      canOpenNewSupply
    ) {
      setNewOpen(true);
    }
  }, [searchParams, canOpenNewSupply]);

  useEffect(() => {
    if (searchParams.get("deposit") !== "1" || !canPay) return;
    const supplier = searchParams.get("supplierId")?.trim() || null;
    setAdvanceSupplierId(supplier);
    setAdvanceOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("deposit");
    params.delete("supplierId");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [searchParams, canPay, pathname, router]);

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
      counts[f.id] = rows.filter((r) =>
        matchesSupplyBillFilter(r, f.id),
      ).length;
    }
    return counts;
  }, [rows]);

  const summary = useMemo(() => summarizeSupplyRows(rows), [rows]);

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
    () => (billFilter === "unpaid" ? groupRowsBySupplier(displayRows) : []),
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
                "rounded-none px-1.5 py-0.5 tabular-nums transition",
                isUnpaid
                  ? "font-semibold text-[var(--pos-primary,#0f766e)]"
                  : "hover:text-[var(--pos-primary,#0f766e)]",
              )}
            >
              <span className="font-semibold text-[var(--order-ink,#15231f)]">
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
            onPayAdvance={() => {
              setAdvanceSupplierId(null);
              setAdvanceOpen(true);
            }}
            onPayOpen={() => setBillFilter("unpaid")}
          />
        }
      >
        {listError ? <DashboardFeedback kind="error" text={listError} /> : null}

        {isUnpaid ? (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
            {listLoading && rows.length === 0 ? (
              <SupLoadingBlock label="Loading supplies…" />
            ) : displayRows.length === 0 ? (
              <SupEmptyState
                icon={Receipt}
                title={
                  query.trim()
                    ? "No matching receipts"
                    : "No unpaid receipts"
                }
                description={
                  query.trim()
                    ? "Try another vendor or invoice number."
                    : "All posted supplies are fully paid, or nothing has been received yet."
                }
                action={
                  query.trim() ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-none text-xs"
                      onClick={() => setQuery("")}
                    >
                      Clear search
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-none text-xs"
                      onClick={() => setBillFilter("all")}
                    >
                      Show all
                    </Button>
                  )
                }
                className="m-3 border-0 bg-transparent"
              />
            ) : (
              <UnpaidSettleWorkspace
                groups={unpaidGroups}
                currency={currency}
                query={query}
                onQueryChange={setQuery}
                billFilter={billFilter}
                onBillFilterChange={setBillFilter}
                filterCounts={filterCounts}
                filtersDisabled={listLoading}
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
            )}
          </section>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
            {listLoading && rows.length === 0 ? (
              <SupLoadingBlock label="Loading supplies…" />
            ) : displayRows.length === 0 ? (
              <SupEmptyState
                icon={Receipt}
                title={
                  query.trim()
                    ? "No matching receipts"
                    : billFilter === "all"
                      ? "No deliveries yet"
                      : `No ${supplyBillFilterLabel(billFilter).toLowerCase()} receipts`
                }
                description={
                  query.trim()
                    ? "Try another vendor or invoice number."
                    : billFilter === "all" && canOpenNewSupply
                      ? "Start with Receive → Walk-in, or Against an order."
                      : billFilter === "all"
                        ? "Deliveries appear here after you Receive goods."
                        : "Try a different date range or status filter."
                }
                action={
                  query.trim() ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-none text-xs"
                      onClick={() => setQuery("")}
                    >
                      Clear search
                    </Button>
                  ) : billFilter !== "all" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-none text-xs"
                      onClick={() => setBillFilter("all")}
                    >
                      Show all
                    </Button>
                  ) : canOpenNewSupply ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1 rounded-none bg-[var(--pos-primary,#0f766e)] text-xs font-semibold text-white hover:bg-[#0d6b63]"
                      onClick={() => setNewOpen(true)}
                    >
                      <Package className="size-3" aria-hidden />
                      Walk-in supply
                    </Button>
                  ) : undefined
                }
                className="m-3 border-0 bg-transparent"
              />
            ) : (
              <SuppliesReceiptWorkspace
                rows={displayRows}
                currency={currency}
                query={query}
                onQueryChange={setQuery}
                billFilter={billFilter}
                onBillFilterChange={setBillFilter}
                filterCounts={filterCounts}
                filtersDisabled={listLoading}
                canEditSupplyBill={canEditSupplyBill}
                canPay={canPay}
                canOpenReceiptDrawer={canOpenReceiptDrawer}
                deletingId={deletingId}
                unpaidBySupplier={unpaidBySupplier}
                onEdit={(r) => {
                  setEditRow(r);
                  setEditOpen(true);
                }}
                onDelete={(r) => void onDeleteSupply(r)}
                onPay={(r, all) => openPay(r, all)}
              />
            )}
          </section>
        )}
      </SuppliesPageLayout>

      <NewSupplyDrawer
        open={newOpen}
        onOpenChange={setNewOpen}
        onPosted={() => void refresh()}
      />

      <AdvanceDepositDrawer
        open={advanceOpen}
        onOpenChange={(open) => {
          setAdvanceOpen(open);
          if (!open) setAdvanceSupplierId(null);
        }}
        onDeposited={() => void refresh()}
        currency={currency}
        initialSupplierId={advanceSupplierId}
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
          aria-label="Walk-in supply"
          className={cn(
            "fixed z-40 flex items-center gap-2 rounded-none bg-[var(--pos-primary,#0f766e)] px-4 py-3 text-sm font-semibold text-white",
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

