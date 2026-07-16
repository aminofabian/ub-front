"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  Banknote,
  Loader2,
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
  fetchOutstandingTabs,
  proposeTabClearance,
  type OutstandingTabRowRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type CashierCreditTabsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  currency: string;
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

export function CashierCreditTabsModal({
  open,
  onOpenChange,
  brandTheme,
  currency,
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

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setQuery("");
    setAmountStr("");
    setChannel("cash");
    setReference("");
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
