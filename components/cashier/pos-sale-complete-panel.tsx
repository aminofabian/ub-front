"use client";

import { Check, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardFeedback } from "@/components/dashboard-page-ui";
import type { SaleRecord } from "@/lib/api";
import { printPosReceipt, type LocalReceiptPrinterTarget } from "@/lib/desktop-print";
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
  /** Branch receipt printer (CUPS / network) for raw ESC/POS + cut. */
  receiptPrinter?: LocalReceiptPrinterTarget | null;
};

function SummaryRow({
  label,
  children,
  valueClassName,
}: {
  label: string;
  children: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right font-medium tabular-nums text-foreground", valueClassName)}>
        {children}
      </span>
    </li>
  );
}

function cashTenderFromReceipt(
  receipt: PosReceiptSnapshot,
): { received: number; change: number } | null {
  if (receipt.cashReceived == null || receipt.cashReceived <= 0) {
    return null;
  }
  return {
    received: receipt.cashReceived,
    change: receipt.changeGiven ?? 0,
  };
}

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
  receiptPrinter,
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-sm",
              voided
                ? "bg-destructive/10 text-destructive"
                : "bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-[var(--pos-primary)]",
            )}
            aria-hidden
          >
            <Check className="size-3.5 stroke-[2.5]" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm font-semibold leading-tight",
                voided ? "text-destructive" : "text-foreground",
              )}
            >
              {voided ? "Sale voided" : "Sale recorded"}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {voided
                ? "This sale was reversed on the register."
                : "Payment saved — print or hand the receipt to the customer."}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              {sale.receiptNo != null
                ? `Receipt #${sale.receiptNo}`
                : `#${shortSaleId(sale.id)}`}
            </p>
          </div>
        </div>

        <section
          className="mt-2.5 border border-border/50 bg-muted/15 px-2 py-1.5"
          aria-label="Sale summary"
        >
          <ul className="space-y-1">
            <SummaryRow label="Items">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </SummaryRow>
            <SummaryRow label="Total">
              <span className="inline-flex items-baseline gap-0.5 font-semibold">
                <span>{receipt.grandTotal.toFixed(2)}</span>
                <CashierCurrencySuffix code={currency} />
              </span>
            </SummaryRow>
            {paymentSummary ? (
              <SummaryRow label="Paid with">{paymentSummary}</SummaryRow>
            ) : null}
            {receipt.customerName ? (
              <SummaryRow label="Customer">{receipt.customerName}</SummaryRow>
            ) : null}
            {receipt.cashReceived != null ? (
              <>
                <SummaryRow label="Received">
                  {formatReceiptMoney(receipt.cashReceived, receipt.currency)}
                </SummaryRow>
                <SummaryRow label="Change" valueClassName="font-semibold text-[var(--pos-primary)]">
                  {formatReceiptMoney(receipt.changeGiven ?? 0, receipt.currency)}
                </SummaryRow>
              </>
            ) : null}
          </ul>
        </section>

        <div className="mt-2.5">
          <PosSaleReceipt
            receipt={receipt}
            saleId={sale.id}
            receiptPrinter={receiptPrinter}
            showPrintButton={false}
          />
        </div>

        {error ? (
          <div className="mt-2 print:hidden">
            <DashboardFeedback kind="error" text={error} />
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-sm px-2 text-[11px]"
            disabled={receiptLoading}
            onClick={onDownloadReceiptPdf}
          >
            {receiptLoading ? "…" : "Receipt PDF"}
          </Button>
          {canVoid && !voided ? (
            <>
              <input
                className="h-7 min-w-[6rem] flex-1 rounded-sm border border-border/60 bg-background px-2 text-[11px]"
                value={voidNotes}
                onChange={(e) => setVoidNotes(e.target.value)}
                placeholder="Void notes"
                disabled={voidLoading}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-7 rounded-sm px-2 text-[11px]"
                disabled={voidLoading}
                onClick={onVoidLastSale}
              >
                {voidLoading ? "…" : "Void"}
              </Button>
            </>
          ) : null}
        </div>
        {canVoid && !voided ? null : !canVoid && !voided ? (
          <p className="mt-1.5 text-[10px] text-muted-foreground print:hidden">
            Need <code>{Permission.SalesVoidOwn}</code> or{" "}
            <code>{Permission.SalesVoidAny}</code> to void.
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border/50 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2.5 print:hidden">
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 min-w-0 flex-1 gap-1.5 rounded-sm border-[var(--pos-primary)] text-sm font-semibold text-[var(--pos-primary)] hover:bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)]"
            onClick={() => {
              void printPosReceipt(
                sale.id,
                undefined,
                receiptPrinter,
                cashTenderFromReceipt(receipt),
              );
            }}
          >
            <Printer className="size-4 shrink-0" aria-hidden />
            Print
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 min-w-0 flex-1 rounded-sm text-sm font-semibold bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] hover:opacity-90"
            onClick={onStartNewSale}
          >
            New sale
          </Button>
        </div>
      </div>
    </div>
  );
}
