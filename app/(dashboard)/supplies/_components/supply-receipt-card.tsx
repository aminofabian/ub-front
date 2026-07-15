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
  const needsPay = bal > 0.009 && canPay;
  const created = new Date(row.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <article
      className={cn(
        "relative overflow-hidden border-b border-border/60 bg-card",
        "active:bg-muted/30",
        "motion-safe:transition-colors motion-safe:duration-150",
      )}
    >
      {/* Status rail */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          needsPay
            ? "bg-amber-500"
            : bal <= 0.009
              ? "bg-primary"
              : "bg-border",
        )}
        aria-hidden
      />

      <div className="space-y-3 py-3.5 pl-4 pr-3 sm:px-4">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-[15px] font-semibold leading-snug tracking-tight text-foreground">
              {row.supplierName || "Unknown supplier"}
            </h3>
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {row.invoiceNumber}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{created}</p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
              st.className,
            )}
          >
            {st.label}
          </span>
        </div>

        <dl className="grid grid-cols-3 gap-1.5">
          <div className="rounded-sm border border-border/50 bg-muted/20 px-2 py-2.5 text-center">
            <dt className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
              Total
            </dt>
            <dd className="mt-0.5 font-mono text-[13px] font-semibold tabular-nums">
              {formatSupplyMoney(supplyN(row.grandTotal))}
            </dd>
          </div>
          <div className="rounded-sm border border-border/50 bg-muted/20 px-2 py-2.5 text-center">
            <dt className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
              Paid
            </dt>
            <dd className="mt-0.5 font-mono text-[13px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatSupplyMoney(supplyN(row.amountPaid))}
            </dd>
          </div>
          <div
            className={cn(
              "rounded-sm border px-2 py-2.5 text-center",
              needsPay
                ? "border-amber-500/35 bg-amber-500/[0.08]"
                : "border-border/50 bg-muted/20",
            )}
          >
            <dt className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
              Balance
            </dt>
            <dd
              className={cn(
                "mt-0.5 font-mono text-[13px] font-semibold tabular-nums",
                needsPay
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-foreground",
              )}
            >
              {formatSupplyMoney(bal)}
            </dd>
          </div>
        </dl>

        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {row.lineCount} line{row.lineCount === 1 ? "" : "s"}
          </span>
          <div className="ml-auto flex min-w-0 flex-1 justify-end gap-2">
            {canEditSupplyBill ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-10 min-w-[4.5rem] flex-1 gap-1.5 rounded-lg text-xs touch-manipulation sm:flex-none"
                onClick={onManage}
              >
                <FileEdit className="size-3.5" aria-hidden />
                Manage
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={needsPay ? "default" : "outline"}
              className="h-10 min-w-[4.5rem] flex-1 gap-1.5 rounded-lg text-xs touch-manipulation sm:flex-none"
              disabled={!canOpenReceiptDrawer}
              onClick={onPayOrDetails}
            >
              <CreditCard className="size-3.5" aria-hidden />
              {needsPay ? "Pay" : "Details"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
