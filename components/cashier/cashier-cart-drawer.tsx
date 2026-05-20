"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { Check, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardFeedback } from "@/components/dashboard-page-ui";
import {
  itemListThumbnailUrl,
  type CustomerRecord,
  type ItemSummaryRecord,
  type SalePaymentMethod,
  type SaleRecord,
} from "@/lib/api";
import {
  cashierItemPrimaryLabel,
  posSearchItemDetailLine,
} from "@/lib/cashier-item-display";
import {
  CashierCurrencySuffix,
  CashierDottedLeader,
} from "./cashier-currency-inline";
import { PosSaleCompletePanel } from "./pos-sale-complete-panel";
import { isValidCustomerPhone } from "@/lib/customer-phone";
import { buildStkPhoneNumber, isStkPhoneValid } from "@/lib/stk-phone";
import type { PosReceiptSnapshot } from "@/lib/pos-receipt";
import { cn } from "@/lib/utils";

const DRAWER_SECTION_TITLE = cn(
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
);

const drawerSectionShell = cn(
  "rounded-2xl border border-border/45 bg-muted/[0.035] p-4 shadow-sm ring-1 ring-black/[0.02]",
  "dark:border-border/50 dark:bg-muted/[0.06] dark:ring-white/[0.03]",
);

const drawerSectionHeader = cn(
  "mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-border/35 pb-2.5",
);

const drawerFieldClass = (extra?: string) =>
  cn(
    "rounded-lg border border-border/55 bg-background px-2.5 text-sm shadow-sm transition-[border-color,box-shadow]",
    "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_38%,var(--border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)]",
    extra,
  );

const drawerInsetPanel = cn(
  "rounded-xl border border-border/45 bg-gradient-to-b from-muted/25 to-muted/10 p-3 shadow-sm ring-1 ring-black/[0.02] dark:from-muted/15 dark:to-muted/5 dark:ring-white/[0.03]",
);

type CartLineLike = {
  key: string;
  itemId: string;
  label: string;
  quantity: string;
  unitPrice: string;
  item: ItemSummaryRecord;
};

function payMethodNeedsCustomer(method: SalePaymentMethod): boolean {
  return (
    method === "customer_credit" ||
    method === "customer_wallet" ||
    method === "loyalty_redeem"
  );
}

function lineSubtotal(line: CartLineLike): number {
  const q = Number(line.quantity);
  const p = Number(line.unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p < 0) return 0;
  return Math.round(q * p * 100) / 100;
}

export type CashierCartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  online: boolean;
  currency: string;
  branchSelected: boolean;
  /** Business brand CSS variables (dialog is portaled). */
  brandTheme: CSSProperties;

  lines: CartLineLike[];
  grandTotal: number;
  removeLine: (key: string) => void;
  updateLine: (
    key: string,
    field: "quantity" | "unitPrice",
    value: string,
  ) => void;

  payMethod: SalePaymentMethod;
  setPayMethod: (m: SalePaymentMethod) => void;
  mpesaRef: string;
  setMpesaRef: (s: string) => void;
  splitPay: boolean;
  setSplitPay: (b: boolean) => void;
  cashSplitStr: string;
  setCashSplitStr: (s: string) => void;
  mpesaSplitStr: string;
  setMpesaSplitStr: (s: string) => void;
  splitMpesaRef: string;
  setSplitMpesaRef: (s: string) => void;
  cashTenderStr: string;
  setCashTenderStr: (s: string) => void;

  canLookupCustomers: boolean;
  customerPhoneQuery: string;
  setCustomerPhoneQuery: (s: string) => void;
  customerHits: CustomerRecord[];
  customerSearchBusy: boolean;
  onSearchCustomers: () => void;
  selectedCustomer: CustomerRecord | null;
  setSelectedCustomer: (c: CustomerRecord | null) => void;

  onComplete: () => void;
  canCompleteSale: boolean;
  loading: boolean;

  outboxCount: number;
  outboxBusy: boolean;
  onRetryOutbox: () => void;

  error: string;
  notice: string;

  canVoid: boolean;
  lastSale: SaleRecord | null;
  lastReceipt: PosReceiptSnapshot | null;
  lastSaleCustomerName: string | null;

  stkAreaCode: string;
  setStkAreaCode: (s: string) => void;
  stkPhone: string;
  setStkPhone: (s: string) => void;
  stkPushStatus: string;
  stkPushError: string;
  onStkPush: (phoneNumber: string) => void;
  voidNotes: string;
  setVoidNotes: (s: string) => void;
  onVoidLastSale: () => void;
  voidLoading: boolean;
  onDownloadReceiptPdf: () => void;
  receiptLoading: boolean;
  onStartNewSale: () => void;
};

function PayChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-tight transition-[transform,box-shadow,border-color,background-color]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "active:scale-[0.98]",
        active
          ? "border-transparent text-[var(--pos-primary-ink)] shadow-md ring-2 ring-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] ring-offset-2 ring-offset-background"
          : "border-border/55 bg-background/90 hover:border-[color-mix(in_srgb,var(--pos-primary)_22%,var(--border))] hover:bg-muted/40",
      )}
      style={
        active
          ? {
              backgroundColor: "var(--pos-primary)",
              borderColor: "transparent",
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

export function CashierCartDrawer(props: CashierCartDrawerProps) {
  const {
    open,
    onOpenChange,
    online,
    currency,
    branchSelected,
    brandTheme,
    lines,
    grandTotal,
    removeLine,
    updateLine,
    payMethod,
    setPayMethod,
    mpesaRef,
    setMpesaRef,
    splitPay,
    setSplitPay,
    cashSplitStr,
    setCashSplitStr,
    mpesaSplitStr,
    setMpesaSplitStr,
    splitMpesaRef,
    setSplitMpesaRef,
    cashTenderStr,
    setCashTenderStr,
    canLookupCustomers,
    customerPhoneQuery,
    setCustomerPhoneQuery,
    customerHits,
    customerSearchBusy,
    onSearchCustomers,
    selectedCustomer,
    setSelectedCustomer,
    onComplete,
    canCompleteSale,
    loading,
    outboxCount,
    outboxBusy,
    onRetryOutbox,
    error,
    notice,
    canVoid,
    lastSale,
    lastReceipt,
    lastSaleCustomerName,
    stkAreaCode,
    setStkAreaCode,
    stkPhone,
    setStkPhone,
    stkPushStatus,
    stkPushError,
    onStkPush,
    voidNotes,
    setVoidNotes,
    onVoidLastSale,
    voidLoading,
    onDownloadReceiptPdf,
    receiptLoading,
    onStartNewSale,
  } = props;

  const saleComplete = lastSale != null && lastReceipt != null;

  const totalItems = lines.reduce((acc, l) => {
    const q = Number(l.quantity);
    return acc + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);

  const customerNeeded = !splitPay && payMethodNeedsCustomer(payMethod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        overlayClassName="bg-black/[0.12] backdrop-blur-[3px] dark:bg-black/40"
        className={cn(
          "max-w-[min(100%,22rem)] gap-0 border-border/40 p-0 shadow-2xl sm:max-w-md",
          "flex flex-col bg-gradient-to-b from-background to-muted/12 dark:to-muted/8",
        )}
        style={brandTheme}
        showCloseButton
      >
        {saleComplete ? (
          <>
            <div className="relative shrink-0 border-b border-border/40 px-5 py-4 print:hidden">
              <DialogHeader className="min-w-0 pr-10">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  Sale complete
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Receipt and summary for the completed sale
                </DialogDescription>
              </DialogHeader>
            </div>
            <PosSaleCompletePanel
              sale={lastSale}
              receipt={lastReceipt}
              currency={currency}
              error={error}
              canVoid={canVoid}
              voidNotes={voidNotes}
              setVoidNotes={setVoidNotes}
              onVoidLastSale={onVoidLastSale}
              voidLoading={voidLoading}
              onDownloadReceiptPdf={onDownloadReceiptPdf}
              receiptLoading={receiptLoading}
              onStartNewSale={onStartNewSale}
            />
          </>
        ) : (
          <>
            <div className="relative shrink-0 border-b border-border/40 bg-gradient-to-r from-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)] via-muted/20 to-transparent px-5 py-4 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.05)] dark:from-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] dark:via-muted/10 dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]">
              <span
                className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[var(--pos-primary)] shadow-[2px_0_14px_color-mix(in_srgb,var(--pos-primary)_35%,transparent)]"
                aria-hidden
              />
              <DialogHeader className="min-w-0 space-y-1 pl-3.5 pr-10">
                <DialogTitle className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-foreground">
                  <span className="inline-flex size-8 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--pos-primary)] shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
                    <ShoppingBag className="size-3.5" aria-hidden />
                  </span>
                  Cart
                </DialogTitle>
                <DialogDescription className="pl-[2.625rem] text-[11px] leading-relaxed text-muted-foreground">
                  {lines.length === 0
                    ? "No items yet — tap a tile or search to add."
                    : `${lines.length} line${lines.length === 1 ? "" : "s"} · ${totalItems.toFixed(0)} item${totalItems === 1 ? "" : "s"}`}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-10 bg-gradient-to-b from-background via-background/90 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-10 bg-gradient-to-t from-background via-background/90 to-transparent"
                aria-hidden
              />
              <div className="relative z-0 space-y-5 px-5 py-4">
                {lines.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/50 bg-muted/[0.04] py-12 text-center ring-1 ring-black/[0.02] dark:bg-muted/[0.05] dark:ring-white/[0.03]">
                    <span className="inline-flex size-12 items-center justify-center rounded-xl border border-border/45 bg-background text-muted-foreground shadow-sm">
                      <ShoppingBag className="size-5 opacity-55" aria-hidden />
                    </span>
                    <div className="max-w-[18rem] space-y-1 px-3">
                      <p className="text-sm font-semibold text-foreground">
                        Your cart is empty
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Search or tap a top seller to add items.
                      </p>
                    </div>
                  </div>
                ) : (
                  <section className="space-y-2.5">
                    <div className={drawerSectionHeader}>
                      <h3 className={DRAWER_SECTION_TITLE}>Lines</h3>
                      <span className="rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                        {lines.length} · {totalItems.toFixed(0)} qty
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {lines.map((line) => {
                        const thumb = itemListThumbnailUrl(line.item);
                        const subtotal = lineSubtotal(line);
                        const qNum = Number(line.quantity) || 0;
                        const lineTitle = cashierItemPrimaryLabel(line.item);
                        const lineDetail = posSearchItemDetailLine(line.item);
                        return (
                          <li
                            key={line.key}
                            className={cn(
                              "group relative overflow-hidden rounded-xl border border-border/45 bg-card p-3 shadow-sm ring-1 ring-black/[0.02] transition-[border-color,box-shadow] duration-200",
                              "dark:ring-white/[0.03]",
                              "hover:border-[color-mix(in_srgb,var(--pos-primary)_22%,var(--border))] hover:shadow-md",
                            )}
                          >
                            <span
                              className="pointer-events-none absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-[var(--pos-primary)] opacity-0 shadow-[0_0_10px_color-mix(in_srgb,var(--pos-primary)_40%,transparent)] transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
                              aria-hidden
                            />
                            <div className="flex items-start gap-2.5">
                              {thumb ? (
                                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-gradient-to-b from-muted/40 to-muted/60">
                                  <Image
                                    src={thumb}
                                    alt=""
                                    width={44}
                                    height={44}
                                    className="h-full w-full object-cover"
                                    unoptimized
                                  />
                                </span>
                              ) : (
                                <span
                                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-gradient-to-b from-muted/40 to-muted/60 text-sm font-bold text-muted-foreground"
                                  aria-hidden
                                >
                                  {lineTitle.trim().charAt(0).toUpperCase() ||
                                    "?"}
                                </span>
                              )}
                              <div className="min-w-0 flex-1 pt-0.5">
                                <p className="line-clamp-2 text-[13px] font-semibold leading-[1.25] tracking-tight text-foreground">
                                  {lineTitle}
                                </p>
                                <p className="mt-0.5 break-all text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {lineDetail}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Remove line"
                                onClick={() => removeLine(line.key)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>

                            <div className="mt-2.5 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 text-sm">
                              <span className="text-[11px] font-medium text-muted-foreground">
                                Qty
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  className="h-7 w-7 border-border/55"
                                  aria-label="Decrease"
                                  onClick={() =>
                                    updateLine(
                                      line.key,
                                      "quantity",
                                      String(Math.max(1, qNum - 1)),
                                    )
                                  }
                                >
                                  <Minus className="size-3" />
                                </Button>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  aria-label="Quantity"
                                  className={drawerFieldClass(
                                    "h-7 w-[3.25rem] py-0 text-center text-[13px] font-semibold tabular-nums",
                                  )}
                                  value={line.quantity}
                                  onChange={(e) =>
                                    updateLine(
                                      line.key,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  className="h-7 w-7 border-border/55"
                                  aria-label="Increase"
                                  onClick={() =>
                                    updateLine(
                                      line.key,
                                      "quantity",
                                      String(qNum + 1),
                                    )
                                  }
                                >
                                  <Plus className="size-3" />
                                </Button>
                              </div>
                              <span className="text-[11px] font-medium text-muted-foreground">
                                Unit ({currency})
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                aria-label="Unit price"
                                placeholder="0.00"
                                className={drawerFieldClass(
                                  "h-7 w-full max-w-[7.5rem] py-0 pr-2 text-right text-[13px] font-medium tabular-nums",
                                )}
                                value={line.unitPrice}
                                onChange={(e) =>
                                  updateLine(
                                    line.key,
                                    "unitPrice",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            {subtotal > 0 ? (
                              <p className="mt-2 flex items-end gap-2 border-t border-border/35 pt-2 text-xs font-medium tabular-nums text-muted-foreground">
                                <span className="shrink-0">Subtotal</span>
                                <CashierDottedLeader />
                                <span className="inline-flex shrink-0 items-baseline gap-0.5">
                                  <span>{subtotal.toFixed(2)}</span>
                                  <CashierCurrencySuffix code={currency} />
                                </span>
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                <section className={cn(drawerSectionShell, "space-y-3")}>
                  <div className={drawerSectionHeader}>
                    <h3 className={DRAWER_SECTION_TITLE}>Payment</h3>
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-muted-foreground">
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border-border/60 text-[var(--pos-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)]"
                        checked={splitPay}
                        disabled={payMethodNeedsCustomer(payMethod)}
                        onChange={(e) => {
                          const next = e.target.checked;
                          if (next && payMethodNeedsCustomer(payMethod)) {
                            setPayMethod("cash");
                          }
                          setSplitPay(next);
                        }}
                      />
                      Split cash + M-Pesa
                    </label>
                  </div>

                  {!splitPay ? (
                    <div className="flex flex-wrap gap-2">
                      <PayChip
                        active={payMethod === "cash"}
                        onClick={() => setPayMethod("cash")}
                      >
                        Cash
                      </PayChip>
                      <PayChip
                        active={payMethod === "mpesa_manual"}
                        onClick={() => setPayMethod("mpesa_manual")}
                      >
                        M-Pesa
                      </PayChip>
                      {canLookupCustomers ? (
                        <PayChip
                          active={payMethod === "customer_credit"}
                          onClick={() => {
                            setSplitPay(false);
                            setPayMethod("customer_credit");
                          }}
                        >
                          Customer tab
                        </PayChip>
                      ) : null}
                      {canLookupCustomers ? (
                        <PayChip
                          active={payMethod === "customer_wallet"}
                          disabled={!online}
                          onClick={() => {
                            setSplitPay(false);
                            setPayMethod("customer_wallet");
                          }}
                        >
                          Wallet
                        </PayChip>
                      ) : null}
                      {canLookupCustomers ? (
                        <PayChip
                          active={payMethod === "loyalty_redeem"}
                          disabled={!online}
                          onClick={() => {
                            setSplitPay(false);
                            setPayMethod("loyalty_redeem");
                          }}
                        >
                          Loyalty
                        </PayChip>
                      ) : null}
                    </div>
                  ) : null}

                  {!splitPay && payMethod === "mpesa_manual" ? (
                    <div className="space-y-2">
                      {stkPushStatus === "idle" || stkPushStatus === "failed" ? (
                        <>
                          {stkPushStatus === "failed" ? (
                            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                              ❌ {stkPushError || "STK Push failed"}
                            </p>
                          ) : null}
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Enter the number that should receive the M-Pesa prompt, then send.
                          </p>
                          <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Code
                              <input
                                type="text"
                                inputMode="tel"
                                autoComplete="tel-country-code"
                                className={drawerFieldClass("h-9 w-full tabular-nums")}
                                value={stkAreaCode}
                                onChange={(e) => setStkAreaCode(e.target.value)}
                                placeholder="+254"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              M-Pesa phone
                              <input
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                className={drawerFieldClass("h-9 w-full tabular-nums")}
                                value={stkPhone}
                                onChange={(e) => setStkPhone(e.target.value)}
                                placeholder="712 345 678"
                              />
                            </label>
                          </div>
                          {stkPhone.trim() && !isStkPhoneValid(stkAreaCode, stkPhone) ? (
                            <p className="text-[11px] text-destructive">
                              Enter a valid Kenyan mobile number.
                            </p>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            className="h-9 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={
                              !online ||
                              !isStkPhoneValid(stkAreaCode, stkPhone)
                            }
                            onClick={() =>
                              onStkPush(buildStkPhoneNumber(stkAreaCode, stkPhone))
                            }
                          >
                            {stkPushStatus === "failed" ? "Retry M-Pesa prompt" : "📱 Send M-Pesa prompt"}
                          </Button>
                        </>
                      ) : stkPushStatus === "sending" ? (
                        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                          Sending STK Push…
                        </p>
                      ) : stkPushStatus === "sent" ? (
                        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                          STK sent — waiting for customer to approve on{" "}
                          <span className="font-mono font-semibold">
                            {buildStkPhoneNumber(stkAreaCode, stkPhone)}
                          </span>
                        </p>
                      ) : stkPushStatus === "confirmed" ? (
                        <div
                          className="space-y-2"
                          role="status"
                          aria-live="polite"
                        >
                          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 shadow-sm ring-1 ring-emerald-200/80 dark:border-emerald-800 dark:bg-emerald-950/50 dark:ring-emerald-900">
                            <div className="flex gap-2.5">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                <Check
                                  className="size-4"
                                  strokeWidth={3}
                                  aria-hidden
                                />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-50">
                                  M-Pesa payment confirmed
                                </p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
                                  {currency} {grandTotal.toFixed(2)} received —
                                  complete the sale below.
                                </p>
                              </div>
                            </div>
                          </div>
                          {mpesaRef.trim() ? (
                            <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center text-[10px] text-muted-foreground">
                              Ref:{" "}
                              <span className="font-mono font-semibold text-foreground">
                                {mpesaRef.trim()}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {!splitPay && payMethod === "cash" ? (
                    <label className="block space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Amount received ({currency})
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={drawerFieldClass(
                          "h-9 w-full px-3 text-right tabular-nums",
                        )}
                        value={cashTenderStr}
                        onChange={(e) => setCashTenderStr(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {cashTenderStr.trim() ? (
                          <>
                            Change:{" "}
                            <span className="font-semibold tabular-nums text-foreground">
                              {(() => {
                                const tender = Number(cashTenderStr.trim());
                                if (
                                  !Number.isFinite(tender) ||
                                  tender < grandTotal
                                ) {
                                  return "—";
                                }
                                return (tender - grandTotal).toFixed(2);
                              })()}
                            </span>{" "}
                            <CashierCurrencySuffix code={currency} />
                          </>
                        ) : (
                          "Required — enter cash handed over by the customer."
                        )}
                      </p>
                    </label>
                  ) : null}

                  {splitPay ? (
                    <div className={cn(drawerInsetPanel, "space-y-3 text-sm")}>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Cash ({currency})
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={drawerFieldClass(
                              "h-8 w-full px-2 text-right text-sm",
                            )}
                            value={cashSplitStr}
                            onChange={(e) => setCashSplitStr(e.target.value)}
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            M-Pesa ({currency})
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={drawerFieldClass(
                              "h-8 w-full px-2 text-right text-sm",
                            )}
                            value={mpesaSplitStr}
                            onChange={(e) => setMpesaSplitStr(e.target.value)}
                          />
                        </label>
                      </div>
                      <input
                        className={drawerFieldClass("h-8 w-full px-3 text-sm")}
                        value={splitMpesaRef}
                        onChange={(e) => setSplitMpesaRef(e.target.value)}
                        placeholder="M-Pesa reference (optional)"
                      />
                    </div>
                  ) : null}

                  {customerNeeded && canLookupCustomers ? (
                    <div className={cn(drawerInsetPanel, "space-y-3 text-sm")}>
                      <p className="text-xs text-muted-foreground">
                        {payMethod === "customer_credit"
                          ? "Search by phone, then select the customer. The full cart total posts to their tab."
                          : payMethod === "customer_wallet"
                            ? `Cart total is paid from the customer's store wallet (${currency}).`
                            : "Apply loyalty redemption (server enforces caps & point cost)."}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          className={drawerFieldClass(
                            "h-9 min-w-0 flex-1 px-3",
                          )}
                          value={customerPhoneQuery}
                          onChange={(e) =>
                            setCustomerPhoneQuery(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              onSearchCustomers();
                            }
                          }}
                          placeholder="Phone (2547… or 07…)"
                          disabled={!online}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={
                            !online ||
                            customerSearchBusy ||
                            (payMethod === "customer_credit" &&
                              !isValidCustomerPhone(customerPhoneQuery))
                          }
                          onClick={onSearchCustomers}
                        >
                          {customerSearchBusy ? "…" : "Find"}
                        </Button>
                      </div>
                      {payMethod === "customer_credit" &&
                      customerPhoneQuery.trim() &&
                      !isValidCustomerPhone(customerPhoneQuery) ? (
                        <p className="text-[10px] text-destructive">
                          Enter at least 9 digits (e.g. 254712345678).
                        </p>
                      ) : null}
                      {customerHits.length > 0 ? (
                        <ul className="max-h-40 space-y-1 overflow-y-auto">
                          {customerHits.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                className={cn(
                                  "w-full rounded-lg border px-2.5 py-2 text-left text-xs transition-all",
                                  selectedCustomer?.id === c.id
                                    ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--pos-primary)_20%,transparent)]"
                                    : "border-border/45 bg-background/80 hover:border-[color-mix(in_srgb,var(--pos-primary)_18%,var(--border))] hover:bg-muted/30",
                                )}
                                onClick={() => setSelectedCustomer(c)}
                              >
                                <span className="font-medium text-foreground">
                                  {c.name}
                                </span>
                                <span className="block text-muted-foreground">
                                  {c.phones.find((p) => p.primary)?.phone ??
                                    c.phones[0]?.phone ??
                                    "—"}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {selectedCustomer ? (
                        <div className="rounded-lg border border-[color-mix(in_srgb,var(--pos-primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--pos-primary)_08%,transparent)] p-2.5 text-xs shadow-sm">
                          <p>
                            Selected:{" "}
                            <span className="font-semibold text-foreground">
                              {selectedCustomer.name}
                            </span>
                          </p>
                          <p className="flex flex-wrap items-baseline gap-x-1 tabular-nums text-muted-foreground">
                            <span>Wallet</span>
                            <span className="inline-flex items-baseline gap-0.5">
                              <span>
                                {Number(
                                  selectedCustomer.credit.walletBalance,
                                ).toFixed(2)}
                              </span>
                              <CashierCurrencySuffix code={currency} />
                            </span>
                            <span>
                              · {selectedCustomer.credit.loyaltyPoints} pts
                            </span>
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <div className="space-y-2">
                  {outboxCount > 0 ? (
                    <p className="rounded-xl border border-amber-200/60 bg-amber-50/80 px-3.5 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
                      {outboxCount} sale(s) waiting to sync.{" "}
                      <button
                        type="button"
                        className="font-medium underline-offset-2 hover:underline disabled:opacity-50"
                        disabled={outboxBusy || !online}
                        onClick={onRetryOutbox}
                      >
                        {outboxBusy ? "Syncing…" : "Retry now"}
                      </button>
                    </p>
                  ) : null}

                  {notice ? (
                    <DashboardFeedback kind="success" text={notice} />
                  ) : null}
                  {error ? (
                    <DashboardFeedback kind="error" text={error} />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border/40 bg-gradient-to-t from-muted/20 to-background/98 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_-10px_28px_-14px_rgba(0,0,0,0.08)] backdrop-blur-md dark:from-muted/12 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_-10px_28px_-14px_rgba(0,0,0,0.35)] supports-[backdrop-filter]:bg-background/88">
              <div className="mb-3.5 rounded-2xl border border-border/45 bg-card/85 px-3.5 py-3 shadow-sm ring-1 ring-black/[0.02] dark:bg-card/55 dark:ring-white/[0.04]">
                <div className="flex items-end gap-2">
                  <span className="shrink-0 pb-0.5 text-[11px] font-medium text-muted-foreground">
                    Total
                  </span>
                  <CashierDottedLeader />
                  <span className="inline-flex shrink-0 items-baseline gap-0.5 text-[1.65rem] font-bold tabular-nums leading-none tracking-tight text-[var(--pos-primary)] sm:text-2xl">
                    <span>{grandTotal.toFixed(2)}</span>
                    <CashierCurrencySuffix code={currency} />
                  </span>
                </div>
              </div>
              {!branchSelected ? (
                <p className="mb-3 rounded-xl border border-amber-200/50 bg-amber-50/90 px-3 py-2 text-[11px] leading-snug text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                  Pick a branch in the top nav to enable checkout.
                </p>
              ) : null}
              <Button
                type="button"
                size="lg"
                className="h-12 w-full rounded-xl text-[15px] font-semibold shadow-md transition-[transform,opacity,box-shadow] active:scale-[0.99] bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] hover:bg-[var(--pos-primary)] hover:opacity-[0.92] hover:shadow-lg"
                disabled={
                  loading ||
                  lines.length === 0 ||
                  !branchSelected ||
                  !canCompleteSale
                }
                onClick={onComplete}
              >
                {loading ? "Recording…" : "Complete sale"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
