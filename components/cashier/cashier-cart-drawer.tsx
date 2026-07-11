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
import { IS_DESKTOP } from "@/lib/runtime";
import { buildStkPhoneNumber, isStkPhoneValid } from "@/lib/stk-phone";
import type { PosReceiptSnapshot } from "@/lib/pos-receipt";
import { cn } from "@/lib/utils";

const sectionLabel = "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

const fieldClass = (extra?: string) =>
  cn(
    "rounded-sm border border-border/60 bg-background px-2 text-sm",
    "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_40%,var(--border))] focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_20%,transparent)]",
    extra,
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
  canManageCustomers: boolean;
  customerPhoneQuery: string;
  setCustomerPhoneQuery: (s: string) => void;
  customerHits: CustomerRecord[];
  customerNoPhoneMatch: boolean;
  customerRegisterName: string;
  setCustomerRegisterName: (s: string) => void;
  customerSearchBusy: boolean;
  customerRegisterBusy: boolean;
  onSearchCustomers: () => void;
  onRegisterCustomer: () => void;
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
        "rounded-sm border px-2 py-1 text-[11px] font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-transparent text-[var(--pos-primary-ink)]"
          : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground",
      )}
      style={
        active
          ? { backgroundColor: "var(--pos-primary)", borderColor: "transparent" }
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
    canManageCustomers,
    customerPhoneQuery,
    setCustomerPhoneQuery,
    customerHits,
    customerNoPhoneMatch,
    customerRegisterName,
    setCustomerRegisterName,
    customerSearchBusy,
    customerRegisterBusy,
    onSearchCustomers,
    onRegisterCustomer,
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

  const cashChange = (() => {
    const tender = Number(cashTenderStr.trim());
    if (!Number.isFinite(tender) || tender < grandTotal) return null;
    return (tender - grandTotal).toFixed(2);
  })();

  const completeBlockedHint = (() => {
    if (loading || lines.length === 0 || !branchSelected || canCompleteSale) {
      return null;
    }
    if (splitPay) {
      return "Enter cash and M-Pesa amounts that add up to the total.";
    }
    if (payMethod === "cash") {
      return "Enter amount received (or tap Exact) before completing.";
    }
    if (customerNeeded && !selectedCustomer) {
      return "Select a customer for this payment method.";
    }
    if (payMethod === "customer_credit" && selectedCustomer) {
      return "Confirm a valid phone for tab credit.";
    }
    return "Finish payment details to complete the sale.";
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        overlayClassName="bg-black/20 backdrop-blur-[2px] dark:bg-black/35"
        className={cn(
          "max-w-[min(100%,20rem)] gap-0 border-border/50 p-0 shadow-xl sm:max-w-[22rem]",
          "flex flex-col bg-background",
        )}
        style={brandTheme}
        showCloseButton
      >
        {saleComplete ? (
          <>
            <div className="shrink-0 border-b border-border/50 px-3 py-2.5 print:hidden">
              <DialogHeader className="min-w-0 pr-8">
                <DialogTitle className="text-sm font-semibold">Sale complete</DialogTitle>
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
            <div className="shrink-0 border-b border-border/50 px-3 py-2.5">
              <DialogHeader className="min-w-0 pr-8">
                <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingBag className="size-3.5 text-[var(--pos-primary)]" aria-hidden />
                  Cart
                  {lines.length > 0 ? (
                    <span className="font-normal text-muted-foreground">
                      · {lines.length} line{lines.length === 1 ? "" : "s"} ·{" "}
                      {totalItems.toFixed(0)} qty
                    </span>
                  ) : null}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {lines.length === 0
                    ? "Cart is empty"
                    : `${lines.length} lines, ${totalItems} items`}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="space-y-3 px-3 py-2.5">
                {lines.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 border border-dashed border-border/50 py-10 text-center">
                    <ShoppingBag className="size-5 text-muted-foreground/50" aria-hidden />
                    <p className="text-xs text-muted-foreground">
                      Tap a tile or search to add items
                    </p>
                  </div>
                ) : (
                  <section>
                    <div className="mb-1.5 flex items-center justify-between">
                      <h3 className={sectionLabel}>Lines</h3>
                    </div>
                    <ul className="divide-y divide-border/50 border border-border/50 bg-card">
                      {lines.map((line) => {
                        const thumb = itemListThumbnailUrl(line.item);
                        const subtotal = lineSubtotal(line);
                        const qNum = Number(line.quantity) || 0;
                        const lineTitle = cashierItemPrimaryLabel(line.item);
                        const lineDetail = posSearchItemDetailLine(line.item);
                        return (
                          <li key={line.key} className="px-2 py-1.5">
                            <div className="flex items-start gap-2">
                              {thumb ? (
                                <span className="relative size-9 shrink-0 overflow-hidden border border-border/40 bg-muted/30">
                                  <Image
                                    src={thumb}
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="size-full object-cover"
                                    unoptimized
                                  />
                                </span>
                              ) : (
                                <span
                                  className="inline-flex size-9 shrink-0 items-center justify-center border border-border/40 bg-muted/30 text-xs font-bold text-muted-foreground"
                                  aria-hidden
                                >
                                  {lineTitle.trim().charAt(0).toUpperCase() || "?"}
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-1">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold leading-snug text-foreground">
                                      {lineTitle}
                                    </p>
                                    {lineDetail ? (
                                      <p className="text-[10px] leading-snug text-muted-foreground">
                                        {lineDetail}
                                      </p>
                                    ) : null}
                                  </div>
                                  {subtotal > 0 ? (
                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                                      {subtotal.toFixed(2)}
                                    </span>
                                  ) : null}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                                    aria-label="Remove line"
                                    onClick={() => removeLine(line.key)}
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <div className="flex items-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon-sm"
                                      className="size-11 rounded-md border-border/60"
                                      aria-label="Decrease"
                                      onClick={() =>
                                        updateLine(
                                          line.key,
                                          "quantity",
                                          String(Math.max(1, qNum - 1)),
                                        )
                                      }
                                    >
                                      <Minus className="size-4" />
                                    </Button>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      aria-label="Quantity"
                                      className={fieldClass(
                                        "mx-0.5 h-11 w-12 rounded-md py-0 text-center text-sm font-semibold tabular-nums",
                                      )}
                                      value={line.quantity}
                                      onChange={(e) =>
                                        updateLine(line.key, "quantity", e.target.value)
                                      }
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon-sm"
                                      className="size-11 rounded-md border-border/60"
                                      aria-label="Increase"
                                      onClick={() =>
                                        updateLine(
                                          line.key,
                                          "quantity",
                                          String(qNum + 1),
                                        )
                                      }
                                    >
                                      <Plus className="size-4" />
                                    </Button>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">×</span>
                                  <label className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">
                                      {currency}
                                    </span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      aria-label="Unit price"
                                      placeholder="0"
                                      className={fieldClass(
                                        "h-6 w-14 rounded-sm py-0 text-right text-xs font-medium tabular-nums",
                                      )}
                                      value={line.unitPrice}
                                      onChange={(e) =>
                                        updateLine(line.key, "unitPrice", e.target.value)
                                      }
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                <section className="space-y-2 border border-border/50 bg-muted/10 p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className={sectionLabel}>Payment</h3>
                    {!IS_DESKTOP ? (
                      <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground">
                        <input
                          type="checkbox"
                          className="size-3 rounded-sm border-border/60"
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
                    ) : null}
                  </div>

                  {!splitPay ? (
                    <div className="flex flex-wrap gap-1">
                      <PayChip
                        active={payMethod === "cash"}
                        onClick={() => setPayMethod("cash")}
                      >
                        Cash
                      </PayChip>
                      {!IS_DESKTOP ? (
                        <PayChip
                          active={payMethod === "mpesa_manual"}
                          onClick={() => setPayMethod("mpesa_manual")}
                        >
                          M-Pesa
                        </PayChip>
                      ) : null}
                      {canLookupCustomers ? (
                        <PayChip
                          active={payMethod === "customer_credit"}
                          onClick={() => {
                            setSplitPay(false);
                            setPayMethod("customer_credit");
                          }}
                        >
                          Tab
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
                    <div className="space-y-1.5">
                      {stkPushStatus === "idle" || stkPushStatus === "failed" ? (
                        <>
                          {stkPushStatus === "failed" ? (
                            <p className="rounded-sm border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                              {stkPushError || "STK Push failed"}
                            </p>
                          ) : null}
                          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-1.5">
                            <label className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                              Code
                              <input
                                type="text"
                                inputMode="tel"
                                className={fieldClass("h-7 w-full tabular-nums")}
                                value={stkAreaCode}
                                onChange={(e) => setStkAreaCode(e.target.value)}
                                placeholder="+254"
                              />
                            </label>
                            <label className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                              M-Pesa phone
                              <input
                                type="tel"
                                inputMode="tel"
                                className={fieldClass("h-7 w-full tabular-nums")}
                                value={stkPhone}
                                onChange={(e) => setStkPhone(e.target.value)}
                                placeholder="712 345 678"
                              />
                            </label>
                          </div>
                          {stkPhone.trim() && !isStkPhoneValid(stkAreaCode, stkPhone) ? (
                            <p className="text-[10px] text-destructive">
                              Enter a valid Kenyan mobile number.
                            </p>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 w-full rounded-sm bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                            disabled={
                              !online || !isStkPhoneValid(stkAreaCode, stkPhone)
                            }
                            onClick={() =>
                              onStkPush(buildStkPhoneNumber(stkAreaCode, stkPhone))
                            }
                          >
                            {stkPushStatus === "failed"
                              ? "Retry M-Pesa prompt"
                              : "Send M-Pesa prompt"}
                          </Button>
                        </>
                      ) : stkPushStatus === "sending" ? (
                        <p className="rounded-sm border border-blue-200 bg-blue-50 px-2 py-1.5 text-center text-[11px] text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                          Sending STK Push…
                        </p>
                      ) : stkPushStatus === "sent" ? (
                        <p className="rounded-sm border border-blue-200 bg-blue-50 px-2 py-1.5 text-center text-[11px] text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                          Waiting for approval on{" "}
                          <span className="font-mono font-semibold">
                            {buildStkPhoneNumber(stkAreaCode, stkPhone)}
                          </span>
                        </p>
                      ) : stkPushStatus === "confirmed" ? (
                        <div className="space-y-1.5" role="status" aria-live="polite">
                          <div className="flex gap-2 rounded-sm border border-emerald-300 bg-emerald-50 px-2 py-1.5 dark:border-emerald-800 dark:bg-emerald-950/50">
                            <Check
                              className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
                              strokeWidth={3}
                              aria-hidden
                            />
                            <div className="min-w-0 text-[11px] text-emerald-950 dark:text-emerald-50">
                              <p className="font-semibold">M-Pesa confirmed</p>
                              <p className="text-emerald-900/90 dark:text-emerald-100/90">
                                {currency} {grandTotal.toFixed(2)} — complete sale below
                              </p>
                            </div>
                          </div>
                          {mpesaRef.trim() ? (
                            <p className="text-center text-[10px] text-muted-foreground">
                              Ref{" "}
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
                    <div className="space-y-1">
                      <div className="flex items-end justify-between gap-2">
                        <label className="block min-w-0 flex-1 space-y-0.5">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            Amount received ({currency})
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={fieldClass(
                              "h-9 w-full text-right text-sm font-semibold tabular-nums",
                            )}
                            value={cashTenderStr}
                            onChange={(e) => setCashTenderStr(e.target.value)}
                            placeholder={grandTotal.toFixed(2)}
                            required
                            autoFocus
                          />
                        </label>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9 shrink-0 px-2.5 text-xs font-semibold"
                          onClick={() =>
                            setCashTenderStr(grandTotal.toFixed(2))
                          }
                        >
                          Exact
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {cashChange != null ? (
                          <>
                            Change{" "}
                            <span className="font-semibold tabular-nums text-foreground">
                              {cashChange}
                            </span>{" "}
                            <CashierCurrencySuffix code={currency} />
                          </>
                        ) : (
                          "Enter cash from customer, or tap Exact"
                        )}
                      </p>
                    </div>
                  ) : null}

                  {splitPay ? (
                    <div className="space-y-1.5 text-sm">
                      <div className="grid grid-cols-2 gap-1.5">
                        <label className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            Cash ({currency})
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={fieldClass("h-7 w-full text-right text-xs")}
                            value={cashSplitStr}
                            onChange={(e) => setCashSplitStr(e.target.value)}
                          />
                        </label>
                        <label className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            M-Pesa ({currency})
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={fieldClass("h-7 w-full text-right text-xs")}
                            value={mpesaSplitStr}
                            onChange={(e) => setMpesaSplitStr(e.target.value)}
                          />
                        </label>
                      </div>
                      <input
                        className={fieldClass("h-7 w-full text-xs")}
                        value={splitMpesaRef}
                        onChange={(e) => setSplitMpesaRef(e.target.value)}
                        placeholder="M-Pesa reference (optional)"
                      />
                    </div>
                  ) : null}

                  {customerNeeded && canLookupCustomers ? (
                    <div className="space-y-1.5 border-t border-border/40 pt-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <input
                          className={fieldClass("h-7 min-w-0 flex-1 text-xs")}
                          value={customerPhoneQuery}
                          onChange={(e) => setCustomerPhoneQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              onSearchCustomers();
                            }
                          }}
                          placeholder="Phone 2547… or 07…"
                          disabled={!online}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-7 rounded-sm px-2 text-xs"
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
                          Enter at least 9 digits.
                        </p>
                      ) : null}
                      {customerHits.length > 0 ? (
                        <ul className="max-h-32 space-y-0.5 overflow-y-auto border border-border/50">
                          {customerHits.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                className={cn(
                                  "w-full px-2 py-1.5 text-left text-[11px] transition-colors",
                                  selectedCustomer?.id === c.id
                                    ? "bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] font-medium"
                                    : "hover:bg-muted/40",
                                )}
                                onClick={() => setSelectedCustomer(c)}
                              >
                                {c.name}
                                <span className="ml-1 text-muted-foreground">
                                  {c.phones.find((p) => p.primary)?.phone ??
                                    c.phones[0]?.phone ??
                                    ""}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {payMethod === "customer_credit" &&
                      customerNoPhoneMatch &&
                      !selectedCustomer &&
                      isValidCustomerPhone(customerPhoneQuery) ? (
                        <div className="space-y-1.5 border border-dashed border-border/50 p-2">
                          <p className="text-[10px] text-muted-foreground">
                            No match for that phone.
                          </p>
                          {canManageCustomers ? (
                            <>
                              <input
                                className={fieldClass("h-7 w-full text-xs")}
                                value={customerRegisterName}
                                onChange={(e) =>
                                  setCustomerRegisterName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    onRegisterCustomer();
                                  }
                                }}
                                placeholder="Customer name"
                                disabled={!online || customerRegisterBusy}
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 w-full rounded-sm text-xs"
                                disabled={
                                  !online ||
                                  customerRegisterBusy ||
                                  !customerRegisterName.trim()
                                }
                                onClick={onRegisterCustomer}
                              >
                                {customerRegisterBusy ? "Saving…" : "Register & use tab"}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      {selectedCustomer ? (
                        <p className="text-[11px]">
                          <span className="font-semibold">{selectedCustomer.name}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · wallet{" "}
                            {Number(selectedCustomer.credit.walletBalance).toFixed(2)}{" "}
                            {currency}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                {outboxCount > 0 ? (
                  <p className="rounded-sm border border-amber-200/60 bg-amber-50/80 px-2 py-1.5 text-[11px] text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
                    {outboxCount} sale(s) waiting to sync.{" "}
                    <button
                      type="button"
                      className="font-medium underline-offset-2 hover:underline disabled:opacity-50"
                      disabled={outboxBusy || !online}
                      onClick={onRetryOutbox}
                    >
                      {outboxBusy ? "Syncing…" : "Retry"}
                    </button>
                  </p>
                ) : null}
                {notice ? <DashboardFeedback kind="success" text={notice} /> : null}
                {error ? <DashboardFeedback kind="error" text={error} /> : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-border/50 bg-background px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2.5">
              <div className="mb-2 flex items-end gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">Total</span>
                <CashierDottedLeader />
                <span className="inline-flex shrink-0 items-baseline gap-0.5 text-xl font-bold tabular-nums leading-none text-[var(--pos-primary)]">
                  <span>{grandTotal.toFixed(2)}</span>
                  <CashierCurrencySuffix code={currency} />
                </span>
              </div>
              {!branchSelected ? (
                <p className="mb-2 rounded-sm border border-amber-200/50 bg-amber-50/90 px-2 py-1 text-[10px] text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                  Pick a branch in the top nav to check out.
                </p>
              ) : null}
              {completeBlockedHint ? (
                <p className="mb-2 rounded-sm border border-border/50 bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
                  {completeBlockedHint}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="h-9 w-full rounded-sm text-sm font-semibold bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] hover:opacity-90"
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
