"use client";

import { SaleReceiptActions } from "@/components/sales/sale-receipt-actions";
import { salesHair, salesInk, salesMute } from "@/components/sales/sales-surface";
import type { SaleRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

function fmtKes(n: number | string | null | undefined): string {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(v) ? v : 0);
}

export function ReceiptLookupBanner({
  receiptNo,
  code,
  sale,
  loading,
  notFound,
  onOpen,
}: {
  receiptNo?: number | null;
  /** M-Pesa transaction code lookup. Takes the banner copy when set. */
  code?: string | null;
  sale: SaleRecord | null;
  loading: boolean;
  notFound: boolean;
  /** Optional — e.g. open the credit till slip for this sale. */
  onOpen?: (sale: SaleRecord) => void;
}) {
  if (!loading && !sale && !notFound) return null;
  const looking = code ? `M-Pesa code ${code}` : `receipt #${receiptNo}`;
  const foundLabel = code
    ? code
    : `Receipt #${sale?.receiptNo ?? receiptNo}`;

  return (
    <div
      className={cn(
        "border-b px-3 py-2.5 sm:px-3.5",
        salesHair,
        "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)]",
      )}
    >
      {loading ? (
        <p className={cn("text-[12px]", salesMute)}>Looking up {looking}…</p>
      ) : sale ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("text-[12.5px] font-semibold", salesInk)}>
              {code ? (
                <span className="font-mono tracking-[0.04em]">{foundLabel}</span>
              ) : (
                foundLabel
              )}
              <span className={cn("ml-2 font-mono tabular-nums font-medium", salesMute)}>
                {fmtKes(sale.grandTotal)}
              </span>
            </p>
            <p className={cn("mt-0.5 text-[11px]", salesMute)}>
              Outside this period’s list
              {sale.soldByName?.trim() ? ` · ${sale.soldByName.trim()}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {onOpen ? (
              <button
                type="button"
                className={cn(
                  "h-7 rounded-lg px-2.5 text-[12px] font-semibold",
                  "text-[var(--pos-primary,#0f766e)] hover:underline",
                )}
                onClick={() => onOpen(sale)}
              >
                Open
              </button>
            ) : null}
            <SaleReceiptActions
              saleId={sale.id}
              receiptLabel={
                code
                  ? code
                  : sale.receiptNo != null
                    ? String(sale.receiptNo)
                    : String(receiptNo ?? "")
              }
              receiptPrinter={{ branchId: sale.branchId }}
            />
          </div>
        </div>
      ) : (
        <p className={cn("text-[12px]", salesMute)}>
          No sale for {looking}.
        </p>
      )}
    </div>
  );
}
