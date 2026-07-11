"use client";

import type { ReactNode } from "react";
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

/** Printable width for 80mm thermal roll (minus ~2mm non-print margin). */
export const THERMAL_RECEIPT_WIDTH_MM = 80;

type PosSaleReceiptProps = {
  receipt: PosReceiptSnapshot;
  /** Required on desktop for ESC/POS printing via the device bridge. */
  saleId?: string;
  className?: string;
  showPrintButton?: boolean;
};

function receiptLocation(receipt: PosReceiptSnapshot): string | null {
  const branch = receipt.branchName.trim();
  if (branch) return branch;
  const business = receipt.businessName.trim();
  return business || null;
}

function receiptClosing(receipt: PosReceiptSnapshot): string {
  return receipt.branchReceiptMessage?.trim() || "Thank you";
}

function hasReceiptContact(receipt: PosReceiptSnapshot): boolean {
  return Boolean(
    receipt.branchAddress?.trim() ||
      receipt.branchPhone?.trim() ||
      receipt.tillNumber?.trim() ||
      receipt.branchEmail?.trim() ||
      receipt.branchWebsite?.trim(),
  );
}

function ReceiptPair({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("pos-receipt-pair flex items-baseline justify-between gap-3", className)}>
      <div className="pos-receipt-pair-left min-w-0 flex-1">{left}</div>
      <div className="pos-receipt-pair-right shrink-0 text-right">{right}</div>
    </div>
  );
}

function ReceiptMoney({
  label,
  value,
  emphasis = false,
}: {
  label: ReactNode;
  value: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "pos-receipt-money flex w-full items-baseline justify-between gap-3",
        emphasis && "pos-receipt-money--emphasis",
      )}
    >
      <span className="pos-receipt-money-label min-w-0 flex-1">{label}</span>
      <span className="pos-receipt-money-value min-w-[3.5rem] shrink-0 text-right tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function PosSaleReceipt({
  receipt,
  saleId,
  className,
  showPrintButton = true,
}: PosSaleReceiptProps) {
  const showContact = hasReceiptContact(receipt);
  const location = receiptLocation(receipt);
  const closing = receiptClosing(receipt);
  const showBusinessName = !receipt.logoUrl && Boolean(receipt.businessName.trim());
  const singlePayment =
    receipt.payments.length === 1 ? receipt.payments[0] : null;

  return (
    <div className={className}>
      {showPrintButton ? (
        <div className="mb-2 print:hidden">
          <Button
            type="button"
            size="sm"
            className="h-9 w-full gap-2 rounded-sm text-sm font-semibold shadow-sm bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] hover:opacity-90"
            onClick={() => {
              if (saleId) {
                void printPosReceipt(saleId);
              } else {
                window.print();
              }
            }}
          >
            <Printer className="size-4" aria-hidden />
            Print receipt
          </Button>
        </div>
      ) : null}

      <article
        id={POS_RECEIPT_PRINT_ROOT_ID}
        className={cn(
          "pos-receipt-paper mx-auto w-full max-w-[12.5rem] bg-white py-2 text-black",
          "border border-border/60 px-2 text-[11px] leading-snug",
          "print:max-w-none print:border-0 print:px-0 print:py-0 print:shadow-none",
        )}
        aria-label="Sale receipt"
      >
        {receipt.voided ? (
          <p className="pos-receipt-voided mb-2 text-center">VOIDED</p>
        ) : null}

        <header className="pos-receipt-brand text-center">
          {receipt.logoUrl ? (
            <div className="pos-receipt-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receipt.logoUrl}
                alt=""
                className="pos-receipt-logo-img mx-auto max-h-10 w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
          {showBusinessName ? (
            <p className="pos-receipt-shop">{receipt.businessName}</p>
          ) : null}
          {location ? (
            <p
              className={cn(
                "pos-receipt-location",
                receipt.logoUrl ? "pos-receipt-location--branch" : null,
              )}
            >
              {location}
            </p>
          ) : null}
        </header>

        <hr className="pos-receipt-rule" />

        <section className="pos-receipt-meta space-y-1" aria-label="Sale details">
          <p className="pos-receipt-sale-id font-bold uppercase tracking-wide text-black">
            #{receipt.saleId.slice(0, 8).toUpperCase()}
          </p>
          {receipt.servedByName ? (
            <ReceiptPair
              left={<span className="pos-receipt-date">{formatReceiptDate(receipt.soldAt)}</span>}
              right={<span className="pos-receipt-cashier">Cashier: {receipt.servedByName}</span>}
            />
          ) : (
            <p className="pos-receipt-date">{formatReceiptDate(receipt.soldAt)}</p>
          )}
          {receipt.customerName ? (
            <p className="pos-receipt-customer">Customer: {receipt.customerName}</p>
          ) : null}
        </section>

        <hr className="pos-receipt-rule" />

        <section className="pos-receipt-lines-section" aria-label="Items sold">
          <div className="pos-receipt-lines-head" aria-hidden>
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
          </div>
          <ul className="pos-receipt-lines">
            {receipt.lines.map((line, i) => (
              <li key={`${line.description}-${i}`} className="pos-receipt-line-row">
                <span className="pos-receipt-line-item">{line.description}</span>
                <span className="pos-receipt-line-qty tabular-nums">{line.quantity}</span>
                <span className="pos-receipt-line-price tabular-nums">
                  {line.unitPrice.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <hr className="pos-receipt-rule" />

        <section className="pos-receipt-totals space-y-1" aria-label="Payment summary">
          {singlePayment ? (
            <p className="pos-receipt-payment-note">
              Paid via: {singlePayment.label}
            </p>
          ) : receipt.payments.length > 0 ? (
            <p className="pos-receipt-payment-note">
              Paid via:{" "}
              {receipt.payments
                .map((p) => (p.reference ? `${p.label} (${p.reference})` : p.label))
                .join(" + ")}
            </p>
          ) : null}

          <hr className="pos-receipt-rule pos-receipt-rule--totals" aria-hidden />

          <ReceiptMoney
            emphasis
            label="TOTAL"
            value={formatReceiptMoney(receipt.grandTotal, receipt.currency)}
          />
          {receipt.cashReceived != null ? (
            <>
              <ReceiptMoney
                label="Received"
                value={formatReceiptMoney(receipt.cashReceived, receipt.currency)}
              />
              <ReceiptMoney
                label="Change"
                value={formatReceiptMoney(receipt.changeGiven ?? 0, receipt.currency)}
              />
            </>
          ) : null}
        </section>

        {showContact ? (
          <>
            <hr className="pos-receipt-rule pos-receipt-rule--dashed" />
            <footer className="pos-receipt-contact space-y-0.5 text-center" aria-label="Store contact">
              {receipt.branchAddress ? (
                <p className="pos-receipt-address">{receipt.branchAddress}</p>
              ) : null}
              {receipt.branchPhone ? (
                <p className="pos-receipt-phone">Tel: {receipt.branchPhone}</p>
              ) : null}
              {receipt.tillNumber ? (
                <p className="pos-receipt-till">M-Pesa Till: {receipt.tillNumber}</p>
              ) : null}
              {receipt.branchEmail ? (
                <p className="pos-receipt-email">{receipt.branchEmail}</p>
              ) : null}
              {receipt.branchWebsite ? (
                <p className="pos-receipt-website">{receipt.branchWebsite}</p>
              ) : null}
            </footer>
          </>
        ) : null}

        <p className="pos-receipt-closing mt-2 text-center">{closing}</p>
      </article>
    </div>
  );
}
