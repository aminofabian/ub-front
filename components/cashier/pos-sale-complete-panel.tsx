"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardFeedback } from "@/components/dashboard-page-ui";
import type { SaleRecord } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import {
  formatReceiptMoney,
  type PosReceiptSnapshot,
} from "@/lib/pos-receipt";
import { cn } from "@/lib/utils";

import { CashierCurrencySuffix } from "./cashier-currency-inline";
import { PosSaleReceipt } from "./pos-sale-receipt";

function shortSaleId(id: string): string {
  const t = id.trim();
  return t.length > 8 ? t.slice(0, 8) : t;
}

export type PosSaleCompletePanelProps = {
  sale: SaleRecord;
  receipt: PosReceiptSnapshot;
  currency: string;
  error: string;
  canVoid: boolean;
  voidNotes: string;
  setVoidNotes: (s: string) => void;
  onVoidLastSale: () => void;
  voidLoading: boolean;
  onDownloadReceiptPdf: () => void;
  receiptLoading: boolean;
  onStartNewSale: () => void;
};

export function PosSaleCompletePanel({
  sale,
  receipt,
  currency,
  error,
  canVoid,
  voidNotes,
  setVoidNotes,
  onVoidLastSale,
  voidLoading,
  onDownloadReceiptPdf,
  receiptLoading,
  onStartNewSale,
}: PosSaleCompletePanelProps) {
  const itemCount = receipt.lines.reduce((n, l) => n + l.quantity, 0);
  const paymentSummary = receipt.payments
    .map((p) => p.label)
    .filter(Boolean)
    .join(" + ");
  const voided =
    sale.voidedAt != null && String(sale.voidedAt).length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
        <div className="pos-sale-success-enter flex flex-col items-center text-center">
          <span
            className={cn(
              "inline-flex size-14 items-center justify-center rounded-full shadow-md ring-4",
              voided
                ? "bg-destructive/10 text-destructive ring-destructive/15"
                : "bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--pos-primary)] ring-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)]",
            )}
            aria-hidden
          >
            <Check className="size-7 stroke-[2.5]" />
          </span>
          <p
            className={cn(
              "pos-sale-success-enter-delay mt-3 text-lg font-semibold tracking-tight",
              voided ? "text-destructive" : "text-foreground",
            )}
          >
            {voided ? "Sale voided" : "Sale recorded"}
          </p>
          <p className="pos-sale-success-enter-delay mt-1 max-w-[16rem] text-[11px] leading-relaxed text-muted-foreground">
            {voided
              ? "This sale was reversed on the register."
              : "Payment saved. Print or hand the receipt to the customer."}
          </p>
        </div>

        <p className="pos-sale-success-enter-delay mt-5 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Sale ID
          </span>
          <span className="mt-1 block font-mono text-sm font-bold tracking-tight text-foreground">
            {shortSaleId(sale.id)}
          </span>
          <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
            {sale.id}
          </span>
        </p>

        <section
          className="pos-sale-success-enter-delay mt-4 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-3 text-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]"
          aria-label="Sale summary"
        >
          <ul className="space-y-2 text-xs">
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Items</span>
              <span className="font-medium tabular-nums text-foreground">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Total</span>
              <span className="inline-flex items-baseline gap-0.5 font-semibold tabular-nums text-foreground">
                <span>{receipt.grandTotal.toFixed(2)}</span>
                <CashierCurrencySuffix code={currency} />
              </span>
            </li>
            {paymentSummary ? (
              <li className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Paid with</span>
                <span className="text-right font-medium text-foreground">
                  {paymentSummary}
                </span>
              </li>
            ) : null}
            {receipt.customerName ? (
              <li className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Customer</span>
                <span className="truncate font-medium text-foreground">
                  {receipt.customerName}
                </span>
              </li>
            ) : null}
            {receipt.cashReceived != null ? (
              <>
                <li className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">Received</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatReceiptMoney(receipt.cashReceived, receipt.currency)}
                  </span>
                </li>
                <li className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">Change</span>
                  <span className="font-semibold tabular-nums text-[var(--pos-primary)]">
                    {formatReceiptMoney(
                      receipt.changeGiven ?? 0,
                      receipt.currency,
                    )}
                  </span>
                </li>
              </>
            ) : null}
          </ul>
        </section>

        <div className="pos-sale-success-enter-delay mt-5">
          <PosSaleReceipt receipt={receipt} />
        </div>

        {error ? (
          <div className="mt-3 print:hidden">
            <DashboardFeedback kind="error" text={error} />
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/35 pt-3 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={receiptLoading}
            onClick={onDownloadReceiptPdf}
          >
            {receiptLoading ? "…" : "Receipt PDF"}
          </Button>
          {canVoid && !voided ? (
            <>
              <input
                className="h-8 min-w-[7rem] flex-1 rounded-lg border border-border/55 bg-background px-2 text-xs shadow-sm"
                value={voidNotes}
                onChange={(e) => setVoidNotes(e.target.value)}
                placeholder="Void notes (optional)"
                disabled={voidLoading}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={voidLoading}
                onClick={onVoidLastSale}
              >
                {voidLoading ? "…" : "Void"}
              </Button>
            </>
          ) : null}
        </div>
        {canVoid && !voided ? null : !canVoid && !voided ? (
          <p className="mt-2 text-[10px] text-muted-foreground print:hidden">
            Need <code>{Permission.SalesVoidOwn}</code> or{" "}
            <code>{Permission.SalesVoidAny}</code> to void.
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border/40 bg-gradient-to-t from-muted/20 to-background/98 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 print:hidden">
        <Button
          type="button"
          size="lg"
          className="h-12 w-full rounded-xl text-[15px] font-semibold shadow-md bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] hover:bg-[var(--pos-primary)] hover:opacity-[0.92]"
          onClick={onStartNewSale}
        >
          New sale
        </Button>
      </div>
    </div>
  );
}
