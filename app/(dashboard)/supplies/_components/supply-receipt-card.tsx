"use client";

import { CreditCard, FileEdit, Trash2 } from "lucide-react";

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
  deleting?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPayOrDetails: () => void;
};

export function SupplyReceiptCard({
  row,
  canEditSupplyBill,
  canPay,
  canOpenReceiptDrawer,
  deleting = false,
  onEdit,
  onDelete,
  onPayOrDetails,
}: SupplyReceiptCardProps) {
  const st = supplyPaymentStatusBadge(row.paymentStatus);
  const bal = supplyN(row.balanceOpen);
  const needsPay = bal > 0.009 && canPay;
  const canDelete = canEditSupplyBill && supplyN(row.amountPaid) < 0.005;
  const created = new Date(row.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article
      className={cn(
        "relative border-b border-border/70 bg-card",
        "active:bg-muted/25",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-0.5",
          needsPay ? "bg-amber-500" : bal <= 0.009 ? "bg-primary" : "bg-border",
        )}
        aria-hidden
      />

      <div className="space-y-2 py-2.5 pl-3.5 pr-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] font-semibold leading-tight text-foreground">
              {row.supplierName || "Unknown supplier"}
            </h3>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {row.invoiceNumber}
              <span className="mx-1 text-border">·</span>
              {created}
              <span className="mx-1 text-border">·</span>
              {row.lineCount} ln
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 border px-1 py-px text-[9px] font-bold uppercase tracking-wide",
              st.className,
            )}
          >
            {st.label}
          </span>
        </div>

        <dl className="grid grid-cols-3 gap-px border border-border bg-border">
          <div className="bg-card px-2 py-1.5 text-center">
            <dt className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
              Total
            </dt>
            <dd className="font-mono text-[12px] font-semibold tabular-nums">
              {formatSupplyMoney(supplyN(row.grandTotal))}
            </dd>
          </div>
          <div className="bg-card px-2 py-1.5 text-center">
            <dt className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
              Paid
            </dt>
            <dd className="font-mono text-[12px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatSupplyMoney(supplyN(row.amountPaid))}
            </dd>
          </div>
          <div
            className={cn(
              "px-2 py-1.5 text-center",
              needsPay ? "bg-amber-500/[0.08]" : "bg-card",
            )}
          >
            <dt className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
              Balance
            </dt>
            <dd
              className={cn(
                "font-mono text-[12px] font-semibold tabular-nums",
                needsPay && "text-amber-800 dark:text-amber-200",
              )}
            >
              {formatSupplyMoney(bal)}
            </dd>
          </div>
        </dl>

        <div className="flex items-center justify-end gap-1">
          {canEditSupplyBill ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 flex-1 gap-1 rounded-none text-[11px]"
              onClick={onEdit}
            >
              <FileEdit className="size-3" aria-hidden />
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-none px-2.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deleting}
              onClick={onDelete}
            >
              <Trash2 className="size-3" aria-hidden />
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={needsPay ? "default" : "outline"}
            className="h-8 flex-1 gap-1 rounded-none text-[11px]"
            disabled={!canOpenReceiptDrawer}
            onClick={onPayOrDetails}
          >
            <CreditCard className="size-3" aria-hidden />
            {needsPay ? "Pay" : "Details"}
          </Button>
        </div>
      </div>
    </article>
  );
}
