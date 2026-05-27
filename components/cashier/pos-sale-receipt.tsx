"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatReceiptDate,
  formatReceiptMoney,
  type PosReceiptSnapshot,
} from "@/lib/pos-receipt";
import { printPosReceipt } from "@/lib/desktop-print";
import { cn } from "@/lib/utils";

export const POS_RECEIPT_PRINT_ROOT_ID = "pos-receipt-print";

/** Printable width for 50mm thermal roll (minus ~2mm non-print margin). */
export const THERMAL_RECEIPT_WIDTH_MM = 50;

type PosSaleReceiptProps = {
  receipt: PosReceiptSnapshot;
  /** Required on desktop for ESC/POS printing via the device bridge. */
  saleId?: string;
  className?: string;
  showPrintButton?: boolean;
};

function hasReceiptFooter(receipt: PosReceiptSnapshot): boolean {
  return Boolean(
    receipt.branchAddress?.trim() ||
      receipt.branchPhone?.trim() ||
      receipt.branchEmail?.trim() ||
      receipt.branchWebsite?.trim() ||
      receipt.servedByName?.trim() ||
      receipt.branchReceiptMessage?.trim(),
  );
}

export function PosSaleReceipt({
  receipt,
  saleId,
  className,
  showPrintButton = true,
}: PosSaleReceiptProps) {
  const showFooter = hasReceiptFooter(receipt);

  return (
    <div className={className}>
      {showPrintButton ? (
        <div className="mb-2 flex justify-end print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              if (saleId) {
                void printPosReceipt(saleId);
              } else {
                window.print();
              }
            }}
          >
            <Printer className="size-3.5" aria-hidden />
            Print receipt
          </Button>
        </div>
      ) : null}

      <article
        id={POS_RECEIPT_PRINT_ROOT_ID}
        className={cn(
          "pos-receipt-paper mx-auto w-full max-w-[12.5rem] bg-white py-3 text-neutral-900",
          "border border-border/60 px-2.5 text-[13px] leading-snug shadow-sm",
          "dark:border-border dark:bg-neutral-950 dark:text-neutral-100",
          "print:max-w-none print:border-0 print:px-0 print:py-0 print:shadow-none",
        )}
        aria-label="Sale receipt"
      >
        {receipt.voided ? (
          <p className="pos-receipt-voided mb-2 text-center font-bold uppercase tracking-wide">
            *** VOIDED ***
          </p>
        ) : null}

        <header className="pos-receipt-header text-center">
          {receipt.logoUrl ? (
            <div className="pos-receipt-logo mb-2 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receipt.logoUrl}
                alt=""
                className="pos-receipt-logo-img max-h-12 w-auto max-w-[10rem] object-contain object-center"
              />
            </div>
          ) : null}
          <h4 className="pos-receipt-shop font-bold uppercase leading-tight">
            {receipt.businessName}
          </h4>
          {receipt.branchName ? (
            <p className="pos-receipt-branch mt-1 font-medium">{receipt.branchName}</p>
          ) : null}
        </header>

        <hr className="pos-receipt-rule" />

        <div className="pos-receipt-meta text-center">
          <p className="pos-receipt-sale-id font-bold">#{receipt.saleId.slice(0, 8)}</p>
          <p>{formatReceiptDate(receipt.soldAt)}</p>
          {receipt.status ? (
            <p className="capitalize">{receipt.status.replace(/_/g, " ")}</p>
          ) : null}
        </div>

        {receipt.customerName ? (
          <>
            <hr className="pos-receipt-rule" />
            <p className="pos-receipt-customer">
              <span className="font-medium">Customer: </span>
              {receipt.customerName}
            </p>
          </>
        ) : null}

        <hr className="pos-receipt-rule" />

        <ul className="pos-receipt-lines list-none space-y-2.5 p-0">
          {receipt.lines.map((line, i) => (
            <li key={`${line.description}-${i}`} className="pos-receipt-line">
              <p className="pos-receipt-line-name font-semibold leading-snug">
                {line.description}
              </p>
              <p className="pos-receipt-line-row flex justify-between gap-1 tabular-nums">
                <span className="pos-receipt-line-detail shrink-0">
                  {line.quantity} x {line.unitPrice.toFixed(2)}
                </span>
                <span className="font-bold">{line.lineTotal.toFixed(2)}</span>
              </p>
            </li>
          ))}
        </ul>

        <hr className="pos-receipt-rule" />

        <div className="pos-receipt-payments space-y-1">
          {receipt.payments.map((p, i) => (
            <div
              key={`${p.method}-${i}`}
              className="pos-receipt-payment-row flex justify-between gap-1 tabular-nums"
            >
              <span className="min-w-0 break-words font-medium">
                {p.label}
                {p.reference ? ` (${p.reference})` : ""}
              </span>
              <span className="shrink-0 font-bold">{p.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <hr className="pos-receipt-rule pos-receipt-rule-bold" />

        <div className="pos-receipt-grand-total flex justify-between gap-1 tabular-nums font-bold">
          <span>TOTAL</span>
          <span>{formatReceiptMoney(receipt.grandTotal, receipt.currency)}</span>
        </div>

        {receipt.cashReceived != null ? (
          <div className="pos-receipt-cash-box mt-2 space-y-1.5">
            <div className="flex justify-between gap-1 tabular-nums">
              <span className="font-semibold">Received</span>
              <span className="font-bold">
                {formatReceiptMoney(receipt.cashReceived, receipt.currency)}
              </span>
            </div>
            <div className="flex justify-between gap-1 tabular-nums">
              <span className="font-semibold">Change</span>
              <span className="font-bold">
                {formatReceiptMoney(receipt.changeGiven ?? 0, receipt.currency)}
              </span>
            </div>
          </div>
        ) : null}

        {showFooter ? (
          <>
            <hr className="pos-receipt-rule pos-receipt-rule-bold" />
            <footer className="pos-receipt-footer space-y-0.5 text-center text-[11px] leading-snug">
              {receipt.branchAddress ? (
                <p className="pos-receipt-address">{receipt.branchAddress}</p>
              ) : null}
              {receipt.branchPhone ? (
                <p className="pos-receipt-phone">Tel: {receipt.branchPhone}</p>
              ) : null}
              {receipt.branchEmail ? (
                <p className="pos-receipt-email">{receipt.branchEmail}</p>
              ) : null}
              {receipt.branchWebsite ? (
                <p className="pos-receipt-website break-all">{receipt.branchWebsite}</p>
              ) : null}
              {receipt.servedByName ? (
                <p className="pos-receipt-served-by mt-1 font-semibold">
                  Served by: {receipt.servedByName}
                </p>
              ) : null}
              {receipt.branchReceiptMessage ? (
                <p className="pos-receipt-footer-msg mt-2 leading-snug">
                  {receipt.branchReceiptMessage}
                </p>
              ) : null}
            </footer>
          </>
        ) : null}

        <p className="pos-receipt-thanks mt-3 text-center font-semibold">Thank you</p>
      </article>
    </div>
  );
}
