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
import {
  supplyBillFilterLabel,
  type SupplyBillFilterId,
} from "./supplies-bill-filters";

type BillLinesState = {
  loading: boolean;
  error: string | null;
  lines: PathBSupplyInvoiceLineRecord[];
};

export function SuppliesReceiptWorkspace({
  rows,
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
  unpaidBySupplier,
  onEdit,
  onDelete,
  onPay,
}: {
  rows: PathBSupplyListRowRecord[];
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
  unpaidBySupplier: Map<
    string,
    { count: number; total: number; firstUnpaidId: string }
  >;
  onEdit: (r: PathBSupplyListRowRecord) => void;
  onDelete: (r: PathBSupplyListRowRecord) => void;
  onPay: (r: PathBSupplyListRowRecord, settleAll: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [linesState, setLinesState] = useState<BillLinesState>({
    loading: false,
    error: null,
    lines: [],
  });

  const viewTotal = useMemo(
    () => rows.reduce((sum, r) => sum + supplyN(r.grandTotal), 0),
    [rows],
  );
  const viewOpen = useMemo(
    () => rows.reduce((sum, r) => sum + supplyN(r.balanceOpen), 0),
    [rows],
  );

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((r) => r.supplierInvoiceId === selectedId)) {
      setSelectedId(rows[0].supplierInvoiceId);
    }
  }, [rows, selectedId]);

  const selected = useMemo(
    () => rows.find((r) => r.supplierInvoiceId === selectedId) ?? null,
    [rows, selectedId],
  );

  useEffect(() => {
    let cancelled = false;
    const id = selected?.supplierInvoiceId;
    if (!id) {
      setLinesState({ loading: false, error: null, lines: [] });
      return;
    }

    setLinesState((prev) => ({
      loading: true,
      error: null,
      lines: prev.lines,
    }));

    void fetchPathBSupplyInvoiceDetail(id)
      .then((detail) => {
        if (cancelled) return;
        setLinesState({
          loading: false,
          error: null,
          lines: [...detail.lines].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
          ),
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setLinesState({
          loading: false,
          error: e instanceof Error ? e.message : "Could not load supply lines.",
          lines: [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.supplierInvoiceId]);

  const selectReceipt = (id: string) => {
    setSelectedId(id);
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches
    ) {
      setMobileDetailOpen(true);
    }
  };

  const title = supplyBillFilterLabel(billFilter);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2 sm:px-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
            {rows.length} receipt{rows.length === 1 ? "" : "s"} ·{" "}
            {formatSupplyMoney(viewTotal, currency)}
            {viewOpen > 0.009 ? (
              <>
                {" "}
                · open{" "}
                <span className="font-semibold text-amber-800">
                  {formatSupplyMoney(viewOpen, currency)}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <label className="relative block w-full max-w-[14rem] sm:w-[14rem]">
          <span className="sr-only">Search supplies</span>
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

        <aside className="flex w-full min-w-0 shrink-0 flex-col border-r-0 md:w-[17rem] md:border-r md:border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] lg:w-[18.5rem]">
          <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
              Receipts
            </p>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {rows.map((r) => {
              const active = r.supplierInvoiceId === selectedId;
              const bal = supplyN(r.balanceOpen);
              const st = supplyPaymentStatusBadge(r.paymentStatus);
              return (
                <li key={r.supplierInvoiceId}>
                  <button
                    type="button"
                    onClick={() => selectReceipt(r.supplierInvoiceId)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors",
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
                          name={r.supplierName}
                          fallback="Supplier"
                        />
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                        {r.invoiceNumber}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                        <span
                          className={cn(
                            "inline-flex px-1 py-px text-[10px] font-semibold tracking-[-0.02em]",
                            st.className,
                          )}
                        >
                          {st.label}
                        </span>
                        <span>
                          {new Date(r.createdAt).toLocaleTimeString("en-KE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span aria-hidden className="opacity-40">
                          ·
                        </span>
                        <span>
                          {r.lineCount} item{r.lineCount === 1 ? "" : "s"}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={cn(
                          "block font-heading text-[12px] font-semibold tabular-nums tracking-[-0.03em]",
                          bal > 0.009
                            ? "text-amber-800"
                            : "text-[var(--order-ink,#15231f)]",
                        )}
                      >
                        {formatSupplyMoney(supplyN(r.grandTotal), currency)}
                      </span>
                      {bal > 0.009 ? (
                        <span className="mt-0.5 block text-[10px] tabular-nums text-amber-800/80">
                          open {formatSupplyMoney(bal, currency)}
                        </span>
                      ) : null}
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
            <ReceiptDetailPanel
              row={selected}
              currency={currency}
              linesState={linesState}
              canEditSupplyBill={canEditSupplyBill}
              canPay={canPay}
              canOpenReceiptDrawer={canOpenReceiptDrawer}
              deletingId={deletingId}
              unpaidBySupplier={unpaidBySupplier}
              onEdit={onEdit}
              onDelete={onDelete}
              onPay={onPay}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              Select a receipt to see supplied items
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

      <Dialog open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <DialogContent
          side="bottom"
          className="gap-0 rounded-none border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] p-0 sm:rounded-none md:hidden"
          showCloseButton
        >
          {selected ? (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>
                  {selected.invoiceNumber} ·{" "}
                  {selected.supplierName?.trim() || "supplier"}
                </DialogTitle>
                <DialogDescription>
                  Receipt detail and supplied items
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[85dvh] overflow-hidden">
                <ReceiptDetailPanel
                  row={selected}
                  currency={currency}
                  linesState={linesState}
                  canEditSupplyBill={canEditSupplyBill}
                  canPay={canPay}
                  canOpenReceiptDrawer={canOpenReceiptDrawer}
                  deletingId={deletingId}
                  unpaidBySupplier={unpaidBySupplier}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPay={onPay}
                />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceiptDetailPanel({
  row,
  currency,
  linesState,
  canEditSupplyBill,
  canPay,
  canOpenReceiptDrawer,
  deletingId,
  unpaidBySupplier,
  onEdit,
  onDelete,
  onPay,
}: {
  row: PathBSupplyListRowRecord;
  currency: string;
  linesState: BillLinesState;
  canEditSupplyBill: boolean;
  canPay: boolean;
  canOpenReceiptDrawer: boolean;
  deletingId: string | null;
  unpaidBySupplier: Map<
    string,
    { count: number; total: number; firstUnpaidId: string }
  >;
  onEdit: (r: PathBSupplyListRowRecord) => void;
  onDelete: (r: PathBSupplyListRowRecord) => void;
  onPay: (r: PathBSupplyListRowRecord, settleAll: boolean) => void;
}) {
  const st = supplyPaymentStatusBadge(row.paymentStatus);
  const bal = supplyN(row.balanceOpen);
  const needsPay = bal > 0.009 && canPay;
  const unpaid = unpaidBySupplier.get(row.supplierId);
  const showPayAll =
    needsPay &&
    Boolean(unpaid) &&
    (unpaid?.count ?? 0) >= 2 &&
    unpaid?.firstUnpaidId === row.supplierInvoiceId;
  const canDelete =
    canEditSupplyBill &&
    supplyN(row.amountPaid) < 0.005 &&
    row.source !== "path_a";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-3 py-2.5 sm:px-3.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
            <SupplierDisplayName
              name={row.supplierName}
              fallback="Supplier"
            />
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
            {row.invoiceNumber}
            <span aria-hidden className="opacity-40">
              ·
            </span>
            <span
              className={cn(
                "inline-flex px-1 py-px font-sans text-[11px] font-semibold tracking-[-0.02em]",
                st.className,
              )}
            >
              {st.label}
            </span>
            <span aria-hidden className="opacity-40">
              ·
            </span>
            <span className="font-sans">
              {new Date(row.createdAt).toLocaleString("en-KE", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
          <p className="mt-1 text-[11px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
            Total {formatSupplyMoney(supplyN(row.grandTotal), currency)}
            {" · "}
            Paid{" "}
            <span className="text-[var(--pos-primary,#0f766e)]">
              {formatSupplyMoney(supplyN(row.amountPaid), currency)}
            </span>
            {" · "}
            Open{" "}
            <span
              className={cn(
                "font-semibold",
                bal > 0.009 ? "text-amber-800" : "text-[var(--order-ink,#15231f)]",
              )}
            >
              {formatSupplyMoney(bal, currency)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-0.5">
          {canEditSupplyBill ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 rounded-none text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)] hover:text-[var(--order-ink,#15231f)]"
              aria-label={`Edit ${row.invoiceNumber}`}
              onClick={() => onEdit(row)}
            >
              <FileEdit className="size-3.5" aria-hidden />
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 rounded-none text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)] hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${row.invoiceNumber}`}
              disabled={deletingId === row.supplierInvoiceId}
              onClick={() => onDelete(row)}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </Button>
          ) : null}
          {showPayAll ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1 rounded-none bg-[var(--pos-primary,#0f766e)] px-2.5 text-[11px] font-semibold hover:bg-[#0d6b63]"
              disabled={!canOpenReceiptDrawer}
              onClick={() => onPay(row, true)}
              title={`Clear ${unpaid!.count} unpaid invoices`}
            >
              <CreditCard className="size-3" aria-hidden />
              Pay all
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className={cn(
              "h-8 gap-1 rounded-none px-2.5 text-[11px] font-semibold",
              needsPay && "bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]",
            )}
            variant={needsPay ? "default" : "outline"}
            disabled={!canOpenReceiptDrawer}
            onClick={() => onPay(row, false)}
          >
            <CreditCard className="size-3" aria-hidden />
            {needsPay ? "Pay" : "Details"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3 py-1.5 sm:px-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
            Supplied items
            {linesState.lines.length > 0
              ? ` · ${linesState.lines.length}`
              : ""}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-3.5">
          {linesState.loading && !linesState.lines.length ? (
            <p className="py-6 text-center text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              Loading items…
            </p>
          ) : linesState.error && !linesState.lines.length ? (
            <p className="py-6 text-center text-[12px] text-destructive">
              {linesState.error}
            </p>
          ) : linesState.lines.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              No line items on this receipt.
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white">
              {linesState.lines.map((line) => (
                <li
                  key={line.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_6rem]"
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
      </div>
    </div>
  );
}
