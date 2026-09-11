"use client";

import { CreditCard, FileEdit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PathBSupplyListRowRecord } from "@/lib/api";
import { SupplierDisplayName } from "@/components/suppliers/supplier-display-name";
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
  /** Hide supplier name when the card sits under a supplier group header. */
  hideSupplier?: boolean;
  payAllTotal?: number;
  payAllCount?: number;
  onEdit: () => void;
  onDelete: () => void;
  onPayOrDetails: () => void;
  onPayAll?: () => void;
};

export function SupplyReceiptCard({
  row,
  canEditSupplyBill,
  canPay,
  canOpenReceiptDrawer,
  deleting = false,
  hideSupplier = false,
  payAllTotal,
  payAllCount,
  onEdit,
  onDelete,
  onPayOrDetails,
  onPayAll,
}: SupplyReceiptCardProps) {
  const st = supplyPaymentStatusBadge(row.paymentStatus);
  const bal = supplyN(row.balanceOpen);
  const needsPay = bal > 0.009 && canPay;
  const canDelete =
    canEditSupplyBill &&
    supplyN(row.amountPaid) < 0.005 &&
    row.source !== "path_a";
  const showPayAll =
    Boolean(onPayAll) && (payAllCount ?? 0) >= 2 && (payAllTotal ?? 0) > 0.009;
  const created = new Date(row.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (hideSupplier) {
    return (
      <article
        className={cn(
          "rounded-none border bg-white px-3 py-2.5",
          needsPay
            ? "border-amber-700/35"
            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-[12px] font-medium text-[var(--order-ink,#15231f)]">
              {row.invoiceNumber}
            </p>
            <p className="mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              <span
                className={cn(
                  "mr-1.5 inline-flex px-1 py-px text-[11px] font-semibold tracking-[-0.02em]",
                  st.className,
                )}
              >
                {st.label}
              </span>
              {created}
              <span className="mx-1 opacity-40">·</span>
              {row.lineCount} ln
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "font-heading text-[14px] font-semibold tabular-nums tracking-[-0.03em]",
                needsPay ? "text-amber-800" : "text-[var(--order-ink,#15231f)]",
              )}
            >
              {formatSupplyMoney(bal)}
            </p>
            <p className="text-[10px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
              of {formatSupplyMoney(supplyN(row.grandTotal))}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-1">
          {canEditSupplyBill ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-none px-2.5 text-[11px]"
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
            className={cn(
              "ml-auto h-8 gap-1 rounded-none px-3 text-[11px]",
              needsPay && "bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]",
            )}
            disabled={!canOpenReceiptDrawer}
            onClick={onPayOrDetails}
          >
            <CreditCard className="size-3" aria-hidden />
            {needsPay ? "Pay" : "Details"}
          </Button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "rounded-none border bg-white px-3 py-2.5",
        needsPay
          ? "border-amber-700/40"
          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-semibold leading-tight text-[var(--order-ink,#15231f)]">
            <SupplierDisplayName
              name={row.supplierName}
              fallback="Unknown supplier"
            />
          </h3>
          <p className="mt-0.5 truncate font-mono text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
            {row.invoiceNumber}
            <span className="mx-1 opacity-40">·</span>
            {created}
            <span className="mx-1 opacity-40">·</span>
            {row.lineCount} ln
          </p>
          {showPayAll ? (
            <p className="mt-0.5 text-[10px] font-medium text-amber-800">
              {payAllCount} unpaid · {formatSupplyMoney(payAllTotal ?? 0)}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 px-1.5 py-0.5 text-[11px] font-semibold tracking-[-0.02em]",
            st.className,
          )}
        >
          {st.label}
        </span>
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-1.5">
        <div className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-1.5 text-center">
          <dt className="text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
            Total
          </dt>
          <dd className="font-mono text-[12px] font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
            {formatSupplyMoney(supplyN(row.grandTotal))}
          </dd>
        </div>
        <div className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-1.5 text-center">
          <dt className="text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
            Paid
          </dt>
          <dd className="font-mono text-[12px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
            {formatSupplyMoney(supplyN(row.amountPaid))}
          </dd>
        </div>
        <div
          className={cn(
            "rounded-none border bg-white px-2 py-1.5 text-center",
            needsPay
              ? "border-amber-700/40"
              : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
          )}
        >
          <dt className="text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
            Balance
          </dt>
          <dd
            className={cn(
              "font-mono text-[12px] font-semibold tabular-nums",
              needsPay ? "text-amber-800" : "text-[var(--order-ink,#15231f)]",
            )}
          >
            {formatSupplyMoney(bal)}
          </dd>
        </div>
      </dl>

      <div className="mt-2 flex items-center justify-end gap-1">
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
        {showPayAll ? (
          <Button
            type="button"
            size="sm"
            className="h-8 flex-1 gap-1 rounded-none bg-[var(--pos-primary,#0f766e)] text-[11px] hover:bg-[#0d6b63]"
            disabled={!canOpenReceiptDrawer}
            onClick={onPayAll}
          >
            <CreditCard className="size-3" aria-hidden />
            Pay all
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant={needsPay ? "default" : "outline"}
          className={cn(
            "h-8 flex-1 gap-1 rounded-none text-[11px]",
            needsPay && "bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]",
          )}
          disabled={!canOpenReceiptDrawer}
          onClick={onPayOrDetails}
        >
          <CreditCard className="size-3" aria-hidden />
          {needsPay ? "Pay" : "Details"}
        </Button>
      </div>
    </article>
  );
}
