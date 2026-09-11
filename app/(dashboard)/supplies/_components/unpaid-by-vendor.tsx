"use client";

import { CreditCard, FileEdit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PathBSupplyListRowRecord } from "@/lib/api";
import { SupplierDisplayName } from "@/components/suppliers/supplier-display-name";
import { cn } from "@/lib/utils";

import { SupplyReceiptCard } from "./supply-receipt-card";
import {
  formatSupplyMoney,
  supplyN,
  supplyPaymentStatusBadge,
} from "./supplies-shared";

export type UnpaidSupplierGroup = {
  supplierId: string;
  supplierName: string;
  total: number;
  count: number;
  firstUnpaidId: string;
  bills: PathBSupplyListRowRecord[];
};

export function UnpaidByVendor({
  groups,
  currency,
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
  canEditSupplyBill: boolean;
  canPay: boolean;
  canOpenReceiptDrawer: boolean;
  deletingId: string | null;
  onEdit: (r: PathBSupplyListRowRecord) => void;
  onDelete: (r: PathBSupplyListRowRecord) => void;
  onPay: (r: PathBSupplyListRowRecord, settleAll: boolean) => void;
}) {
  return (
    <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
      {groups.map((group) => {
        const showPayAll = canPay && group.count >= 2 && group.total > 0.009;
        const first = group.bills[0];
        return (
          <li
            key={group.supplierId || group.firstUnpaidId}
            className="bg-white"
          >
            <div className="sticky top-0 z-[1] flex flex-wrap items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3.5%,white)] px-3 py-2.5 sm:px-3.5">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
                  <SupplierDisplayName
                    name={group.supplierName}
                    fallback="Supplier"
                  />
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                  {group.count} open bill{group.count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <p className="font-heading text-[15px] font-semibold tabular-nums tracking-[-0.03em] text-amber-800">
                  {formatSupplyMoney(group.total, currency)}
                </p>
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
            </div>

            <div className="space-y-2 p-2.5 lg:hidden">
              {group.bills.map((r) => (
                <SupplyReceiptCard
                  key={r.supplierInvoiceId}
                  row={r}
                  hideSupplier
                  canEditSupplyBill={canEditSupplyBill}
                  canPay={canPay}
                  canOpenReceiptDrawer={canOpenReceiptDrawer}
                  deleting={deletingId === r.supplierInvoiceId}
                  onEdit={() => onEdit(r)}
                  onDelete={() => onDelete(r)}
                  onPayOrDetails={() => onPay(r, false)}
                />
              ))}
            </div>

            <ul className="hidden lg:block">
              {group.bills.map((r) => {
                const st = supplyPaymentStatusBadge(r.paymentStatus);
                const bal = supplyN(r.balanceOpen);
                const needsPay = bal > 0.009 && canPay;
                return (
                  <li
                    key={r.supplierInvoiceId}
                    className="flex items-center gap-3 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] px-3.5 py-2 first:border-t-0 hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)]"
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
                          {r.lineCount} line{r.lineCount === 1 ? "" : "s"}
                        </span>
                      </p>
                    </div>

                    <div className="hidden min-w-[7.5rem] text-right sm:block">
                      <p className="text-[10px] font-medium tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                        of {formatSupplyMoney(supplyN(r.grandTotal), currency)}
                      </p>
                      <p className="text-[11px] tabular-nums text-[var(--pos-primary,#0f766e)]">
                        paid {formatSupplyMoney(supplyN(r.amountPaid), currency)}
                      </p>
                    </div>

                    <p className="min-w-[6.5rem] text-right font-heading text-[13px] font-semibold tabular-nums tracking-[-0.03em] text-amber-800">
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
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
