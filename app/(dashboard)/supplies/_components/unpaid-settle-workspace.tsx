"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  CreditCard,
  FileEdit,
  Filter,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchPathBSupplyInvoiceDetail,
  type PathBSupplyInvoiceLineRecord,
  type PathBSupplyListRowRecord,
} from "@/lib/api";
import { SupplierDisplayName } from "@/components/suppliers/supplier-display-name";
import { cn } from "@/lib/utils";

import { SuppliesFilterPanel } from "./supplies-filter-panel";
import {
  formatSupplyMoney,
  supplyN,
  supplyPaymentStatusBadge,
} from "./supplies-shared";
import type { SupplyBillFilterId } from "./supplies-bill-filters";

export type UnpaidSupplierGroup = {
  supplierId: string;
  supplierName: string;
  total: number;
  count: number;
  firstUnpaidId: string;
  bills: PathBSupplyListRowRecord[];
};

function groupKey(g: UnpaidSupplierGroup) {
  return g.supplierId || g.firstUnpaidId;
}

export function UnpaidSettleWorkspace({
  groups,
  currency,
  query,
  onQueryChange,
  billFilter,
  onBillFilterChange,
  filterCounts,
  filtersDisabled,
  canEditSupplyBill,
  canPay,
  canOpenReceiptDrawer,
  deletingId,
  onEdit,
  onDelete,
  onPay,
}: {
  groups: UnpaidSupplierGroup[];
  currency: string;
  query: string;
  onQueryChange: (q: string) => void;
  billFilter: SupplyBillFilterId;
  onBillFilterChange: (f: SupplyBillFilterId) => void;
  filterCounts: Partial<Record<SupplyBillFilterId, number>>;
  filtersDisabled?: boolean;
  canEditSupplyBill: boolean;
  canPay: boolean;
  canOpenReceiptDrawer: boolean;
  deletingId: string | null;
  onEdit: (r: PathBSupplyListRowRecord) => void;
  onDelete: (r: PathBSupplyListRowRecord) => void;
  onPay: (r: PathBSupplyListRowRecord, settleAll: boolean) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileBillsOpen, setMobileBillsOpen] = useState(false);

  const openTotal = useMemo(
    () => groups.reduce((sum, g) => sum + g.total, 0),
    [groups],
  );

  useEffect(() => {
    if (groups.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey || !groups.some((g) => groupKey(g) === selectedKey)) {
      setSelectedKey(groupKey(groups[0]));
    }
  }, [groups, selectedKey]);

  const selected = useMemo(
    () => groups.find((g) => groupKey(g) === selectedKey) ?? null,
    [groups, selectedKey],
  );

  const selectVendor = (key: string) => {
    setSelectedKey(key);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setMobileBillsOpen(true);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2 sm:px-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
            Open payables
          </h2>
          <p className="mt-0.5 text-[11px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
            {groups.length} vendor{groups.length === 1 ? "" : "s"} ·{" "}
            <span className="font-semibold text-amber-800">
              {formatSupplyMoney(openTotal, currency)}
            </span>
          </p>
        </div>

        <label className="relative block w-full max-w-[14rem] sm:w-[14rem]">
          <span className="sr-only">Search vendors</span>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Vendor or invoice…"
            className="h-8 w-full rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white pl-8 pr-2.5 text-sm outline-none focus-visible:border-[var(--pos-primary,#0f766e)]"
          />
        </label>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 rounded-none px-2.5 text-[11px] font-semibold lg:hidden"
          onClick={() => setFilterOpen(true)}
        >
          <Filter className="size-3" aria-hidden />
          Filters
        </Button>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1">
        <aside className="hidden w-[10.5rem] shrink-0 flex-col overflow-y-auto border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] p-2.5 lg:flex">
          <SuppliesFilterPanel
            layout="rail"
            value={billFilter}
            onChange={onBillFilterChange}
            counts={filterCounts}
            disabled={filtersDisabled}
          />
        </aside>

        <aside className="flex w-full min-w-0 shrink-0 flex-col border-r-0 md:w-[15.5rem] md:border-r md:border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] lg:w-[17rem]">
          <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
              Vendors
            </p>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {groups.map((g) => {
              const key = groupKey(g);
              const active = key === selectedKey;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => selectVendor(key)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                        : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[13px] font-semibold tracking-[-0.02em]",
                          active
                            ? "text-[var(--pos-primary,#0f766e)]"
                            : "text-[var(--order-ink,#15231f)]",
                        )}
                      >
                        <SupplierDisplayName
                          name={g.supplierName}
                          fallback="Supplier"
                        />
                      </span>
                      <span className="mt-0.5 block text-[11px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                        {g.count} bill{g.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-heading text-[13px] font-semibold tabular-nums tracking-[-0.03em] text-amber-800">
                        {formatSupplyMoney(g.total, currency)}
                      </span>
                      <ChevronRight
                        className="ml-auto mt-0.5 size-3.5 text-[color-mix(in_srgb,var(--order-ink,#15231f)_36%,transparent)] md:hidden"
                        aria-hidden
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="hidden min-h-0 min-w-0 flex-1 flex-col md:flex">
          {selected ? (
            <VendorBillsPanel
              group={selected}
              currency={currency}
              canEditSupplyBill={canEditSupplyBill}
              canPay={canPay}
              canOpenReceiptDrawer={canOpenReceiptDrawer}
              deletingId={deletingId}
              onEdit={onEdit}
              onDelete={onDelete}
              onPay={onPay}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              Select a vendor to settle bills
            </div>
          )}
        </section>
      </div>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent
          side="bottom"
          className="gap-0 rounded-none border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] p-0 sm:rounded-none"
          showCloseButton
        >
          <DialogHeader className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-4 py-3 pr-12">
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.02em]">
              Filters
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              Status and date range for supply receipts
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60dvh] overflow-y-auto p-4">
            <SuppliesFilterPanel
              layout="stack"
              value={billFilter}
              onChange={(f) => {
                onBillFilterChange(f);
                setFilterOpen(false);
              }}
              counts={filterCounts}
              disabled={filtersDisabled}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mobileBillsOpen} onOpenChange={setMobileBillsOpen}>
        <DialogContent
          side="bottom"
          className="gap-0 rounded-none border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] p-0 sm:rounded-none md:hidden"
          showCloseButton
        >
          {selected ? (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>
                  Bills for{" "}
                  {selected.supplierName?.trim() || "supplier"}
                </DialogTitle>
                <DialogDescription>
                  Open invoices and payment actions
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[85dvh] overflow-hidden">
                <VendorBillsPanel
                  group={selected}
                  currency={currency}
                  canEditSupplyBill={canEditSupplyBill}
                  canPay={canPay}
                  canOpenReceiptDrawer={canOpenReceiptDrawer}
                  deletingId={deletingId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPay={onPay}
                  compact
                />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type BillLinesState = {
  loading: boolean;
  error: string | null;
  lines: PathBSupplyInvoiceLineRecord[];
};

function VendorBillsPanel({
  group,
  currency,
  canEditSupplyBill,
  canPay,
  canOpenReceiptDrawer,
  deletingId,
  onEdit,
  onDelete,
  onPay,
  compact,
}: {
  group: UnpaidSupplierGroup;
  currency: string;
  canEditSupplyBill: boolean;
  canPay: boolean;
  canOpenReceiptDrawer: boolean;
  deletingId: string | null;
  onEdit: (r: PathBSupplyListRowRecord) => void;
  onDelete: (r: PathBSupplyListRowRecord) => void;
  onPay: (r: PathBSupplyListRowRecord, settleAll: boolean) => void;
  compact?: boolean;
}) {
  const showPayAll = canPay && group.count >= 2 && group.total > 0.009;
  const first = group.bills[0];
  const billIds = useMemo(
    () => group.bills.map((b) => b.supplierInvoiceId).join("|"),
    [group.bills],
  );
  const [linesByBill, setLinesByBill] = useState<
    Record<string, BillLinesState>
  >({});

  useEffect(() => {
    let cancelled = false;
    const ids = billIds.split("|").filter(Boolean);
    if (ids.length === 0) {
      setLinesByBill({});
      return;
    }

    setLinesByBill((prev) => {
      const next: Record<string, BillLinesState> = {};
      for (const id of ids) {
        next[id] = prev[id]?.lines.length
          ? prev[id]
          : { loading: true, error: null, lines: prev[id]?.lines ?? [] };
      }
      return next;
    });

    void Promise.all(
      ids.map(async (id) => {
        try {
          const detail = await fetchPathBSupplyInvoiceDetail(id);
          if (cancelled) return;
          setLinesByBill((prev) => ({
            ...prev,
            [id]: {
              loading: false,
              error: null,
              lines: [...detail.lines].sort(
                (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
              ),
            },
          }));
        } catch (e) {
          if (cancelled) return;
          setLinesByBill((prev) => ({
            ...prev,
            [id]: {
              loading: false,
              error:
                e instanceof Error ? e.message : "Could not load supply lines.",
              lines: prev[id]?.lines ?? [],
            },
          }));
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [billIds]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-3 py-2.5 sm:px-3.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
            <SupplierDisplayName
              name={group.supplierName}
              fallback="Supplier"
            />
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
            {group.count} open ·{" "}
            <span className="font-semibold text-amber-800">
              {formatSupplyMoney(group.total, currency)}
            </span>
          </p>
        </div>
        {showPayAll && first ? (
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1 rounded-none bg-[var(--pos-primary,#0f766e)] px-2.5 text-[11px] font-semibold hover:bg-[#0d6b63]"
            disabled={!canOpenReceiptDrawer}
            onClick={() => onPay(first, true)}
          >
            <CreditCard className="size-3" aria-hidden />
            Pay all
          </Button>
        ) : null}
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {group.bills.map((r) => {
          const st = supplyPaymentStatusBadge(r.paymentStatus);
          const bal = supplyN(r.balanceOpen);
          const needsPay = bal > 0.009 && canPay;
          const lineState = linesByBill[r.supplierInvoiceId];
          return (
            <li
              key={r.supplierInvoiceId}
              className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
            >
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-3.5",
                  compact && "flex-wrap",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[12px] font-medium text-[var(--order-ink,#15231f)]">
                    {r.invoiceNumber}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                    <span
                      className={cn(
                        "inline-flex px-1 py-px text-[11px] font-semibold tracking-[-0.02em]",
                        st.className,
                      )}
                    >
                      {st.label}
                    </span>
                    <span aria-hidden className="opacity-40">
                      ·
                    </span>
                    <span>
                      {new Date(r.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span aria-hidden className="opacity-40">
                      ·
                    </span>
                    <span>
                      {r.lineCount} item{r.lineCount === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>

                <div className="hidden min-w-[6.5rem] text-right sm:block">
                  <p className="text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                    of {formatSupplyMoney(supplyN(r.grandTotal), currency)}
                  </p>
                  <p className="text-[11px] tabular-nums text-[var(--pos-primary,#0f766e)]">
                    paid {formatSupplyMoney(supplyN(r.amountPaid), currency)}
                  </p>
                </div>

                <p className="min-w-[5.5rem] text-right font-heading text-[13px] font-semibold tabular-nums tracking-[-0.03em] text-amber-800">
                  {formatSupplyMoney(bal, currency)}
                </p>

                <div className="flex shrink-0 items-center gap-0.5">
                  {canEditSupplyBill ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 rounded-none text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)] hover:text-[var(--order-ink,#15231f)]"
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
                      className="size-8 rounded-none text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)] hover:bg-destructive/10 hover:text-destructive"
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
                      "h-8 gap-1 rounded-none px-2.5 text-[11px] font-semibold",
                      needsPay &&
                        "bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]",
                    )}
                    variant={needsPay ? "default" : "outline"}
                    disabled={!canOpenReceiptDrawer}
                    onClick={() => onPay(r, false)}
                  >
                    <CreditCard className="size-3" aria-hidden />
                    {needsPay ? "Pay" : "Details"}
                  </Button>
                </div>
              </div>

              <div className="border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] px-3 py-2 sm:px-3.5">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                  Supplied items
                </p>
                {lineState?.loading && !lineState.lines.length ? (
                  <p className="py-1.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                    Loading items…
                  </p>
                ) : lineState?.error && !lineState.lines.length ? (
                  <p className="py-1.5 text-[11px] text-destructive">
                    {lineState.error}
                  </p>
                ) : (lineState?.lines.length ?? 0) === 0 ? (
                  <p className="py-1.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                    No line items on this receipt.
                  </p>
                ) : (
                  <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white">
                    {lineState!.lines.map((line) => (
                      <li
                        key={line.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-2.5 py-1.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_6rem]"
                      >
                        <p className="min-w-0 truncate text-[12px] font-medium text-[var(--order-ink,#15231f)]">
                          {line.description?.trim() || "Item"}
                        </p>
                        <p className="text-right text-[11px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] sm:text-left">
                          <span className="sm:hidden">×</span>
                          {supplyN(line.qty)}
                          <span className="hidden sm:inline"> qty</span>
                        </p>
                        <p className="hidden text-right font-mono text-[11px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] sm:block">
                          @ {formatSupplyMoney(supplyN(line.unitCost), currency)}
                        </p>
                        <p className="col-span-2 text-right font-mono text-[12px] font-semibold tabular-nums text-[var(--order-ink,#15231f)] sm:col-span-1">
                          {formatSupplyMoney(supplyN(line.lineTotal), currency)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
