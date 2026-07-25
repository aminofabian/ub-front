"use client";

import type { ReactNode } from "react";
import { Printer, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  printSupplyInvoiceReceipt,
  type LocalReceiptPrinterTarget,
} from "@/lib/desktop-print";
import {
  formatSupplyInvoiceDate,
  formatSupplyInvoiceMoney,
  type SupplyInvoiceReceiptSnapshot,
} from "@/lib/supply-invoice-receipt";
import { POS_RECEIPT_PRINT_ROOT_ID } from "@/components/cashier/pos-sale-receipt";
import { cn } from "@/lib/utils";

type SupplyInvoiceReceiptProps = {
  receipt: SupplyInvoiceReceiptSnapshot;
  receiptPrinter?: LocalReceiptPrinterTarget | null;
  className?: string;
  showPrintButton?: boolean;
  onDismiss?: () => void;
};

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
    <div
      className={cn(
        "pos-receipt-pair flex items-baseline justify-between gap-3",
        className,
      )}
    >
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

function hasReceiptContact(receipt: SupplyInvoiceReceiptSnapshot): boolean {
  return Boolean(
    receipt.branchAddress?.trim() ||
      receipt.branchPhone?.trim() ||
      receipt.tillNumber?.trim() ||
      receipt.branchEmail?.trim() ||
      receipt.branchWebsite?.trim(),
  );
}

export function SupplyInvoiceReceipt({
  receipt,
  receiptPrinter,
  className,
  showPrintButton = true,
  onDismiss,
}: SupplyInvoiceReceiptProps) {
  const showContact = hasReceiptContact(receipt);
  const showBusinessName =
    !receipt.logoUrl && Boolean(receipt.businessName.trim());
  const invoiceRef = receipt.sessionId.slice(0, 8).toUpperCase();
  const location = receipt.branchName.trim() || null;
  const portalUrl = receipt.portalUrl?.trim() || null;

  return (
    <div className={className}>
      {showPrintButton || onDismiss ? (
        <div className="mb-2 flex gap-1 print:hidden">
          {showPrintButton ? (
            <Button
              type="button"
              size="sm"
              className="h-9 flex-1 gap-2 rounded-none text-sm font-semibold shadow-sm bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] hover:opacity-90"
              onClick={() => {
                void printSupplyInvoiceReceipt(
                  receipt,
                  undefined,
                  receiptPrinter,
                );
              }}
            >
              <Printer className="size-4" aria-hidden />
              Print invoice
            </Button>
          ) : null}
          {onDismiss ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 shrink-0 gap-1 rounded-none px-2"
              onClick={onDismiss}
              aria-label="Close receipt"
            >
              <X className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}

      <article
        id={POS_RECEIPT_PRINT_ROOT_ID}
        className={cn(
          "pos-receipt-paper mx-auto w-full max-w-[12.5rem] bg-white py-2 text-black",
          "border border-border/60 px-2 text-[11px] leading-snug",
          "print:max-w-none print:border-0 print:px-0 print:py-0 print:shadow-none",
        )}
        aria-label="Supply invoice"
      >
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

        <section className="pos-receipt-meta space-y-1" aria-label="Invoice details">
          <p className="pos-receipt-sale-id font-bold uppercase tracking-wide text-black">
            Supply invoice #{invoiceRef}
          </p>
          {receipt.receivedByName ? (
            <ReceiptPair
              left={
                <span className="pos-receipt-date">
                  {formatSupplyInvoiceDate(receipt.receivedAt)}
                </span>
              }
              right={
                <span className="pos-receipt-cashier">
                  By: {receipt.receivedByName}
                </span>
              }
            />
          ) : (
            <p className="pos-receipt-date">
              {formatSupplyInvoiceDate(receipt.receivedAt)}
            </p>
          )}
          <p className="pos-receipt-customer">
            Supplier: {receipt.supplierName}
            {receipt.supplierCode ? ` · ${receipt.supplierCode}` : ""}
          </p>
        </section>

        <hr className="pos-receipt-rule" />

        <section className="pos-receipt-lines-section" aria-label="Goods received">
          <div className="pos-receipt-lines-head" aria-hidden>
            <span>Item</span>
            <span>Qty</span>
            <span>Cost</span>
          </div>
          <ul className="pos-receipt-lines">
            {receipt.lines.map((line, i) => (
              <li
                key={`${line.description}-${i}`}
                className="pos-receipt-line-row"
              >
                <span className="pos-receipt-line-item">{line.description}</span>
                <span className="pos-receipt-line-qty tabular-nums">
                  {line.quantity}
                </span>
                <span className="pos-receipt-line-price tabular-nums">
                  {line.unitCost.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <hr className="pos-receipt-rule" />

        <section className="pos-receipt-totals space-y-1" aria-label="Amount due">
          <p className="pos-receipt-payment-note">Terms: pay within 48 hours</p>
          <hr className="pos-receipt-rule pos-receipt-rule--totals" aria-hidden />
          <ReceiptMoney
            emphasis
            label="AMOUNT DUE"
            value={formatSupplyInvoiceMoney(
              receipt.grandTotal,
              receipt.currency,
            )}
          />
        </section>

        <hr className="pos-receipt-rule pos-receipt-rule--dashed" />

        <section
          className="space-y-1.5 text-center text-[10px] leading-snug"
          aria-label="Settlement notice"
        >
          <p>{receipt.paymentTerms}</p>
          <p className="font-medium">{receipt.contactNote}</p>
          {portalUrl ? (
            <p className="break-all pt-1 font-mono text-[9px] leading-snug">
              Track &amp; note issues: {portalUrl}
            </p>
          ) : null}
        </section>

        {showContact ? (
          <>
            <hr className="pos-receipt-rule pos-receipt-rule--dashed" />
            <footer
              className="pos-receipt-contact space-y-0.5 text-center"
              aria-label="Store contact"
            >
              {receipt.branchAddress ? (
                <p className="pos-receipt-address">{receipt.branchAddress}</p>
              ) : null}
              {receipt.branchPhone ? (
                <p className="pos-receipt-phone">Tel: {receipt.branchPhone}</p>
              ) : null}
              {receipt.tillNumber ? (
                <p className="pos-receipt-till">
                  M-Pesa Till: {receipt.tillNumber}
                </p>
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

        <p className="pos-receipt-closing mt-2 text-center">
          Thank you for the delivery
        </p>
      </article>
    </div>
  );
}
