"use client";

import { CreditCard, FileEdit } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PathBSupplyListRowRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  formatSupplyMoney,
  supplyN,
  supplyPaymentStatusBadge,
} from "./supplies-shared";

type SupplyReceiptCardProps = {
  row: PathBSupplyListRowRecord;
  canEditSupplyBill: boolean;
  canPay: boolean;
  canOpenReceiptDrawer: boolean;
  onManage: () => void;
  onPayOrDetails: () => void;
};

export function SupplyReceiptCard({
  row,
  canEditSupplyBill,
  canPay,
  canOpenReceiptDrawer,
  onManage,
  onPayOrDetails,
}: SupplyReceiptCardProps) {
  const st = supplyPaymentStatusBadge(row.paymentStatus);
  const bal = supplyN(row.balanceOpen);
  const created = new Date(row.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <article className="space-y-3 px-3 py-3.5 sm:px-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold leading-snug text-foreground">
            {row.supplierName || "Unknown supplier"}
          </h3>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {row.invoiceNumber}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{created}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            st.className,
          )}
        >
          {st.label}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border/50 bg-muted/20 px-2 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Total
          </dt>
          <dd className="mt-0.5 font-mono text-xs font-semibold tabular-nums">
            {formatSupplyMoney(supplyN(row.grandTotal))}
          </dd>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 px-2 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Paid
          </dt>
          <dd className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {formatSupplyMoney(supplyN(row.amountPaid))}
          </dd>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 px-2 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Balance
          </dt>
          <dd
            className={cn(
              "mt-0.5 font-mono text-xs font-semibold tabular-nums",
              bal > 0.009 ? "text-amber-800 dark:text-amber-200" : "text-foreground",
            )}
          >
            {formatSupplyMoney(bal)}
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{row.lineCount} line{row.lineCount === 1 ? "" : "s"}</span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {canEditSupplyBill ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-lg text-xs"
              onClick={onManage}
            >
              <FileEdit className="size-3.5" aria-hidden />
              Manage
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={bal > 0.009 && canPay ? "default" : "outline"}
            className="h-8 gap-1 rounded-lg text-xs"
            disabled={!canOpenReceiptDrawer}
            onClick={onPayOrDetails}
          >
            <CreditCard className="size-3.5" aria-hidden />
            {bal > 0.009 && canPay ? "Pay" : "Details"}
          </Button>
        </div>
      </div>
    </article>
  );
}
