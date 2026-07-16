"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  Banknote,
  ChevronDown,
  ChevronRight,
  Loader2,
  Printer,
  Receipt,
  Search,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchCustomerTabPurchases,
  fetchOutstandingTabs,
  proposeTabClearance,
  type OutstandingTabRowRecord,
  type TabPurchaseRowRecord,
} from "@/lib/api";
import {
  printPosReceipt,
  type LocalReceiptPrinterTarget,
} from "@/lib/desktop-print";
import { cn } from "@/lib/utils";

type CashierCreditTabsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  currency: string;
  receiptPrinter?: LocalReceiptPrinterTarget | null;
};

const fieldClass = cn(
  "w-full rounded-lg border border-border/60 bg-background px-2.5 py-2 text-sm shadow-sm",
  "placeholder:text-muted-foreground/50",
  "focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)]",
);

function money(amount: number | string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  try {
    return n.toLocaleString(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function formatSoldAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function qtyLabel(q: number | string): string {
  const n = Number(q);
  if (!Number.isFinite(n)) return String(q);
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, "");
}

export function CashierCreditTabsModal({
  open,
  onOpenChange,
  brandTheme,
  currency,
  receiptPrinter,
}: CashierCreditTabsModalProps) {
  const [rows, setRows] = useState<OutstandingTabRowRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<OutstandingTabRowRecord | null>(
    null,
  );
  const [amountStr, setAmountStr] = useState("");
  const [channel, setChannel] = useState<"cash" | "mpesa">("cash");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showPurchases, setShowPurchases] = useState(false);
  const [purchases, setPurchases] = useState<TabPurchaseRowRecord[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [printingSaleId, setPrintingSaleId] = useState<string | null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      setRows(await fetchOutstandingTabs(q));
    } catch (error) {
      setRows([]);
      toast.error(
        error instanceof Error ? error.message : "Could not load credit tabs.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPurchases = useCallback(async (customerId: string) => {
    setPurchasesLoading(true);
    try {
      setPurchases(await fetchCustomerTabPurchases(customerId));
    } catch (error) {
      setPurchases([]);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load tab purchases.",
      );
    } finally {
      setPurchasesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setQuery("");
    setAmountStr("");
    setChannel("cash");
    setReference("");
    setShowPurchases(false);
    setPurchases([]);
    setExpandedSaleId(null);
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open || selected) return;
    const handle = window.setTimeout(() => {
      void load(query.trim() || undefined);
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, open, selected, load]);

  const totalOutstanding = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const n = Number(row.balanceOwed);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [rows],
  );

  const selectRow = (row: OutstandingTabRowRecord) => {
    setSelected(row);
    setAmountStr(Number(row.balanceOwed).toFixed(2));
    setChannel("cash");
    setReference("");
    setShowPurchases(false);
    setPurchases([]);
    setExpandedSaleId(null);
  };

  const togglePurchases = () => {
    if (!selected) return;
    if (showPurchases) {
      setShowPurchases(false);
      return;
    }
    setShowPurchases(true);
    void loadPurchases(selected.customerId);
  };

  const printSale = async (saleId: string) => {
    setPrintingSaleId(saleId);
    try {
      await printPosReceipt(saleId, 80, receiptPrinter ?? null);
    } catch {
      // printPosReceipt already toasts
    } finally {
      setPrintingSaleId(null);
    }
  };

  const submit = async () => {
    if (!selected) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    const owed = Number(selected.balanceOwed);
    if (Number.isFinite(owed) && amount > owed + 0.001) {
      toast.error("Amount cannot exceed the tab balance.");
      return;
    }
    setSubmitting(true);
    try {
      await proposeTabClearance({
        customerId: selected.customerId,
        amount,
        channel,
        reference: reference.trim() || null,
      });
      toast.success("Sent to admin — tab clears when approved.");
      setSelected(null);
      await load(query.trim() || undefined);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit clearance.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={brandTheme}
        className="flex max-h-[min(92vh,720px)] w-[min(96vw,34rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="relative shrink-0 space-y-0 border-b border-border/50 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_srgb,var(--pos-primary)_18%,transparent),transparent_55%)] px-4 pb-3 pt-4 text-left">
          <button
            type="button"
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)] text-[var(--pos-primary)]">
              <Users className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-base font-semibold tracking-tight">
                {selected ? selected.name : "Credit tabs"}
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
                {selected
                  ? "Record what they paid. An admin must approve before the balance drops."
                  : `${rows.length} open · ${money(totalOutstanding, currency)} outstanding`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!selected ? (
            <div className="space-y-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={cn(fieldClass, "pl-8")}
                  placeholder="Search name or phone"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </label>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading tabs…
                </div>
              ) : rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No open tabs
                  {query.trim() ? " match this search" : ""}.
                </p>
              ) : (
                <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
                  {rows.map((row) => (
                    <li key={row.customerId}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)]"
                        onClick={() => selectRow(row)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {row.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {row.primaryPhone?.trim() || "No phone"}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--pos-primary)]">
                          {money(row.balanceOwed, currency)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft className="size-3.5" />
                All tabs
              </button>

              <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-5 text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Owed on tab
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {money(selected.balanceOwed, currency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.primaryPhone?.trim() || "No phone on file"}
                </p>
              </div>

              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  showPurchases
                    ? "border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)]"
                    : "border-border/60 bg-background hover:bg-muted/40",
                )}
                onClick={togglePurchases}
              >
                <span className="inline-flex items-center gap-2">
                  <Receipt className="size-4 text-[var(--pos-primary)]" />
                  {showPurchases ? "Hide purchases" : "View purchases"}
                </span>
                {showPurchases ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>

              {showPurchases ? (
                <div className="space-y-2">
                  {purchasesLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading purchases…
                    </div>
                  ) : purchases.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                      No credit purchases on file for this tab.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                      {purchases.map((purchase) => {
                        const openRow = expandedSaleId === purchase.saleId;
                        const printing = printingSaleId === purchase.saleId;
                        return (
                          <li key={purchase.saleId}>
                            <div className="flex items-stretch gap-0">
                              <button
                                type="button"
                                className="min-w-0 flex-1 px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
                                onClick={() =>
                                  setExpandedSaleId(
                                    openRow ? null : purchase.saleId,
                                  )
                                }
                              >
                                <span className="flex items-center gap-2">
                                  {openRow ? (
                                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                                  )}
                                  <span className="min-w-0">
                                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                      <span className="font-mono text-[11px] font-semibold text-foreground/70">
                                        #
                                        {purchase.receiptNo ??
                                          purchase.saleId.slice(0, 8)}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground">
                                        {formatSoldAt(purchase.soldAt)}
                                      </span>
                                    </span>
                                    <span className="mt-0.5 block text-sm font-semibold tabular-nums">
                                      {money(purchase.creditAmount, currency)}
                                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                        on tab
                                      </span>
                                    </span>
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                className="shrink-0 border-l border-border/50 px-3 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
                                title="Print receipt"
                                disabled={printing}
                                onClick={() => void printSale(purchase.saleId)}
                              >
                                {printing ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Printer className="size-4" />
                                )}
                              </button>
                            </div>
                            {openRow ? (
                              <ul className="space-y-1 border-t border-border/40 bg-muted/15 px-3 py-2.5 pl-9">
                                {purchase.lines.map((line, idx) => (
                                  <li
                                    key={`${purchase.saleId}-${idx}`}
                                    className="flex items-start justify-between gap-3 text-xs"
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate font-medium text-foreground">
                                        {line.itemName}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {qtyLabel(line.quantity)} ×{" "}
                                        {money(line.unitPrice, currency)}
                                      </span>
                                    </span>
                                    <span className="shrink-0 tabular-nums font-medium">
                                      {money(line.lineTotal, currency)}
                                    </span>
                                  </li>
                                ))}
                                {purchase.lines.length === 0 ? (
                                  <li className="text-xs text-muted-foreground">
                                    No line items.
                                  </li>
                                ) : null}
                              </ul>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Amount received
                  </label>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-[var(--pos-primary)] hover:underline"
                    onClick={() =>
                      setAmountStr(Number(selected.balanceOwed).toFixed(2))
                    }
                  >
                    Pay all
                  </button>
                </div>
                <input
                  className={fieldClass}
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Channel
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      channel === "cash"
                        ? "border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40",
                    )}
                    onClick={() => setChannel("cash")}
                  >
                    <Banknote className="size-4" />
                    Cash
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      channel === "mpesa"
                        ? "border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40",
                    )}
                    onClick={() => setChannel("mpesa")}
                  >
                    <Smartphone className="size-4" />
                    M-Pesa
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Reference (optional)
                </label>
                <input
                  className={fieldClass}
                  placeholder={
                    channel === "mpesa" ? "M-Pesa code" : "Receipt / note"
                  }
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {selected ? (
          <DialogFooter className="shrink-0 border-t border-border/50 bg-muted/20 px-4 py-3 sm:justify-stretch">
            <Button
              type="button"
              className="h-11 w-full text-sm font-semibold"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit for approval"
              )}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
