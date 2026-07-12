"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import {
  Banknote,
  Check,
  ChevronDown,
  Gift,
  Minus,
  Plus,
  ShoppingBag,
  Smartphone,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";

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
  cashierItemTitleParts,
} from "@/lib/cashier-item-display";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { CashierCurrencySuffix } from "./cashier-currency-inline";
import { PosSaleCompletePanel } from "./pos-sale-complete-panel";
import { isValidCustomerPhone } from "@/lib/customer-phone";
import { IS_DESKTOP } from "@/lib/runtime";
import { buildStkPhoneNumber, isStkPhoneValid } from "@/lib/stk-phone";
import type { LocalReceiptPrinterTarget } from "@/lib/desktop-print";
import type { PosReceiptSnapshot } from "@/lib/pos-receipt";
import { cn } from "@/lib/utils";

const fieldClass = (extra?: string) =>
  cn(
    "rounded-xl border border-border/55 bg-background px-3 text-sm shadow-sm",
    "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_45%,var(--border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_18%,transparent)]",
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

const CASH_QUICK_AMOUNTS = [50, 100, 200, 500, 1000] as const;

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
  /** Branch CUPS / network printer for raw ESC/POS + cut. */
  receiptPrinter?: LocalReceiptPrinterTarget | null;
};

function PayMethodTile({
  active,
  disabled,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[4.25rem] flex-col items-start justify-center gap-1 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "scale-[1.02] border-transparent text-[var(--pos-primary-ink)] shadow-md"
          : "border-border/50 bg-background/80 text-foreground hover:border-border hover:bg-card hover:shadow-sm",
      )}
      style={
        active
          ? {
              backgroundColor: "var(--pos-primary)",
              boxShadow:
                "0 10px 28px -12px color-mix(in srgb, var(--pos-primary) 55%, transparent)",
            }
          : undefined
      }
    >
      <span
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-lg",
          active
            ? "bg-[color-mix(in_srgb,var(--pos-primary-ink)_14%,transparent)]"
            : "bg-muted/60 text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="text-[13px] font-bold leading-none tracking-tight">
        {label}
      </span>
      {hint ? (
        <span
          className={cn(
            "text-[10px] leading-tight",
            active
              ? "text-[color-mix(in_srgb,var(--pos-primary-ink)_72%,transparent)]"
              : "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      ) : null}
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
    setSplitPay,
    splitPay,
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
    receiptPrinter,
  } = props;

  const [linesOpen, setLinesOpen] = useState(false);
  const saleComplete = lastSale != null && lastReceipt != null;

  const totalItems = lines.reduce((acc, l) => {
    const q = Number(l.quantity);
    return acc + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);

  const customerNeeded = !splitPay && payMethodNeedsCustomer(payMethod);

  const tenderNum = Number(cashTenderStr.trim());
  const cashChange =
    Number.isFinite(tenderNum) && tenderNum >= grandTotal
      ? (tenderNum - grandTotal).toFixed(2)
      : null;
  const cashReady =
    !splitPay &&
    payMethod === "cash" &&
    cashChange != null &&
    Number.isFinite(tenderNum);

  useEffect(() => {
    if (!open || saleComplete) return;
    if (splitPay || payMethod !== "cash") return;
    if (grandTotal <= 0) return;
    setCashTenderStr(grandTotal.toFixed(2));
  }, [open, saleComplete, splitPay, payMethod, grandTotal, setCashTenderStr]);

  useEffect(() => {
    if (open) setLinesOpen(false);
  }, [open]);

  const completeBlockedHint = (() => {
    if (loading || lines.length === 0 || !branchSelected || canCompleteSale) {
      return null;
    }
    if (splitPay) {
      return "Split amounts must add up to the total.";
    }
    if (payMethod === "cash") {
      return "Cash received is still short of the total.";
    }
    if (customerNeeded && !selectedCustomer) {
      return "Pick a customer to continue.";
    }
    if (payMethod === "customer_credit" && selectedCustomer) {
      return "Confirm a valid phone for tab credit.";
    }
    return "Finish payment details to complete.";
  })();

  const setCashFromPicker = (amount: number) => {
    setCashTenderStr(amount.toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        overlayClassName="bg-black/45 backdrop-blur-[3px] dark:bg-black/55"
        className={cn(
          "max-w-[min(100%,26rem)] gap-0 border-border/40 p-0 shadow-2xl sm:max-w-[26rem]",
          "flex flex-col overflow-hidden bg-[color-mix(in_srgb,var(--background)_92%,var(--pos-primary)_3%)]",
        )}
        style={brandTheme}
        showCloseButton
      >
        {saleComplete ? (
          <>
            <div className="shrink-0 border-b border-border/50 px-4 py-3 print:hidden">
              <DialogHeader className="min-w-0 pr-8">
                <DialogTitle className="text-base font-semibold">
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
              receiptPrinter={receiptPrinter}
            />
          </>
        ) : (
          <>
            <div
              className="relative shrink-0 overflow-hidden px-4 pb-4 pt-5"
              style={{
                background:
                  "linear-gradient(160deg, color-mix(in srgb, var(--pos-primary) 18%, transparent) 0%, transparent 70%)",
              }}
            >
              <div
                className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full opacity-30"
                style={{
                  background:
                    "radial-gradient(circle, var(--pos-primary), transparent 70%)",
                }}
                aria-hidden
              />
              <DialogHeader className="relative min-w-0 pr-8">
                <DialogTitle className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Checkout
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Pay for this cart and complete the sale
                </DialogDescription>
              </DialogHeader>
              <p className="relative mt-3 text-[11px] font-medium text-muted-foreground">
                {lines.length === 0
                  ? "Cart is empty"
                  : `${lines.length} line${lines.length === 1 ? "" : "s"} · ${totalItems.toFixed(0)} items`}
              </p>
              <div className="relative mt-1 flex items-baseline gap-2">
                <span className="text-[2.75rem] font-bold leading-none tracking-tight tabular-nums text-foreground sm:text-[3rem]">
                  {grandTotal.toFixed(2)}
                </span>
                <CashierCurrencySuffix
                  code={currency}
                  className="!text-[12px] tracking-[0.14em] text-muted-foreground/70"
                />
              </div>
              {cashReady && Number(cashChange) > 0 ? (
                <p className="relative mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                  Change due {cashChange} {currency}
                </p>
              ) : cashReady ? (
                <p className="relative mt-2 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--pos-primary)]">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  Exact cash — ready
                </p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              <div className="space-y-4">
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      How are they paying?
                    </h3>
                    {!IS_DESKTOP ? (
                      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          className="size-3.5 rounded border-border/60 accent-[var(--pos-primary)]"
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
                        Split
                      </label>
                    ) : null}
                  </div>

                  {!splitPay ? (
                    <div className="grid grid-cols-2 gap-2">
                      <PayMethodTile
                        active={payMethod === "cash"}
                        onClick={() => setPayMethod("cash")}
                        icon={<Banknote className="size-3.5" aria-hidden />}
                        label="Cash"
                        hint="Notes & coins"
                      />
                      {!IS_DESKTOP ? (
                        <PayMethodTile
                          active={payMethod === "mpesa_manual"}
                          onClick={() => setPayMethod("mpesa_manual")}
                          icon={<Smartphone className="size-3.5" aria-hidden />}
                          label="M-Pesa"
                          hint="STK prompt"
                        />
                      ) : null}
                      {canLookupCustomers ? (
                        <PayMethodTile
                          active={payMethod === "customer_credit"}
                          onClick={() => {
                            setSplitPay(false);
                            setPayMethod("customer_credit");
                          }}
                          icon={<UserRound className="size-3.5" aria-hidden />}
                          label="Tab"
                          hint="Charge later"
                        />
                      ) : null}
                      {canLookupCustomers ? (
                        <PayMethodTile
                          active={payMethod === "customer_wallet"}
                          disabled={!online}
                          onClick={() => {
                            setSplitPay(false);
                            setPayMethod("customer_wallet");
                          }}
                          icon={<Wallet className="size-3.5" aria-hidden />}
                          label="Wallet"
                          hint="Store credit"
                        />
                      ) : null}
                      {canLookupCustomers ? (
                        <PayMethodTile
                          active={payMethod === "loyalty_redeem"}
                          disabled={!online}
                          onClick={() => {
                            setSplitPay(false);
                            setPayMethod("loyalty_redeem");
                          }}
                          icon={<Gift className="size-3.5" aria-hidden />}
                          label="Loyalty"
                          hint="Points"
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {!splitPay && payMethod === "cash" ? (
                    <div className="space-y-3 rounded-2xl border border-border/50 bg-card/90 p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Cash received
                        </p>
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--pos-primary)] hover:bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)]"
                          onClick={() =>
                            setCashTenderStr(grandTotal.toFixed(2))
                          }
                        >
                          Exact total
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`Amount received in ${currency}`}
                        className={fieldClass(
                          "h-14 w-full text-right text-2xl font-bold tabular-nums tracking-tight",
                        )}
                        value={cashTenderStr}
                        onChange={(e) => setCashTenderStr(e.target.value)}
                        placeholder="0.00"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {CASH_QUICK_AMOUNTS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setCashFromPicker(n)}
                            className="rounded-xl border border-border/55 bg-background px-2.5 py-1.5 text-[12px] font-semibold tabular-nums text-foreground transition hover:border-[var(--pos-primary)] hover:text-[var(--pos-primary)]"
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <p
                        className={cn(
                          "text-[12px] font-medium",
                          cashReady
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-muted-foreground",
                        )}
                      >
                        {cashReady
                          ? Number(cashChange) === 0
                            ? "Exact — tap Complete below"
                            : `Give back ${cashChange} ${currency}`
                          : "Tap Exact total, or pick a note amount"}
                      </p>
                    </div>
                  ) : null}

                  {!splitPay && payMethod === "mpesa_manual" ? (
                    <div className="space-y-2.5 rounded-2xl border border-border/50 bg-card/90 p-3 shadow-sm">
                      {stkPushStatus === "idle" || stkPushStatus === "failed" ? (
                        <>
                          {stkPushStatus === "failed" ? (
                            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                              {stkPushError || "STK Push failed"}
                            </p>
                          ) : null}
                          <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
                            <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                              Code
                              <input
                                type="text"
                                inputMode="tel"
                                className={fieldClass("h-11 w-full tabular-nums")}
                                value={stkAreaCode}
                                onChange={(e) => setStkAreaCode(e.target.value)}
                                placeholder="+254"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                              Phone
                              <input
                                type="tel"
                                inputMode="tel"
                                className={fieldClass("h-11 w-full tabular-nums")}
                                value={stkPhone}
                                onChange={(e) => setStkPhone(e.target.value)}
                                placeholder="712 345 678"
                              />
                            </label>
                          </div>
                          {stkPhone.trim() &&
                          !isStkPhoneValid(stkAreaCode, stkPhone) ? (
                            <p className="text-[11px] text-destructive">
                              Enter a valid Kenyan mobile number.
                            </p>
                          ) : null}
                          <Button
                            type="button"
                            className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
                            disabled={
                              !online || !isStkPhoneValid(stkAreaCode, stkPhone)
                            }
                            onClick={() =>
                              onStkPush(
                                buildStkPhoneNumber(stkAreaCode, stkPhone),
                              )
                            }
                          >
                            {stkPushStatus === "failed"
                              ? "Retry M-Pesa prompt"
                              : "Send M-Pesa prompt"}
                          </Button>
                        </>
                      ) : stkPushStatus === "sending" ? (
                        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-center text-[12px] font-medium text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                          Sending STK Push…
                        </p>
                      ) : stkPushStatus === "sent" ? (
                        <div className="space-y-2">
                          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-center text-[12px] font-medium text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                            Waiting on{" "}
                            <span className="font-mono font-semibold">
                              {buildStkPhoneNumber(stkAreaCode, stkPhone)}
                            </span>
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 w-full rounded-xl text-sm font-semibold"
                            disabled={
                              !online || !isStkPhoneValid(stkAreaCode, stkPhone)
                            }
                            onClick={() =>
                              onStkPush(
                                buildStkPhoneNumber(stkAreaCode, stkPhone),
                              )
                            }
                          >
                            Send prompt again
                          </Button>
                        </div>
                      ) : stkPushStatus === "confirmed" ? (
                        <div
                          className="space-y-2"
                          role="status"
                          aria-live="polite"
                        >
                          <div className="flex gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 dark:border-emerald-800 dark:bg-emerald-950/50">
                            <Check
                              className="mt-0.5 size-4 shrink-0 text-emerald-600"
                              strokeWidth={3}
                              aria-hidden
                            />
                            <div className="min-w-0 text-[12px] text-emerald-950 dark:text-emerald-50">
                              <p className="font-semibold">M-Pesa confirmed</p>
                              <p className="opacity-90">
                                {currency} {grandTotal.toFixed(2)} — complete
                                below
                              </p>
                            </div>
                          </div>
                          {mpesaRef.trim() ? (
                            <p className="text-center text-[11px] text-muted-foreground">
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

                  {splitPay ? (
                    <div className="space-y-2.5 rounded-2xl border border-border/50 bg-card/90 p-3 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Cash ({currency})
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={fieldClass(
                              "h-11 w-full text-right font-semibold tabular-nums",
                            )}
                            value={cashSplitStr}
                            onChange={(e) => setCashSplitStr(e.target.value)}
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            M-Pesa ({currency})
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={fieldClass(
                              "h-11 w-full text-right font-semibold tabular-nums",
                            )}
                            value={mpesaSplitStr}
                            onChange={(e) => setMpesaSplitStr(e.target.value)}
                          />
                        </label>
                      </div>
                      <input
                        className={fieldClass("h-11 w-full")}
                        value={splitMpesaRef}
                        onChange={(e) => setSplitMpesaRef(e.target.value)}
                        placeholder="M-Pesa reference (optional)"
                      />
                    </div>
                  ) : null}

                  {customerNeeded && canLookupCustomers ? (
                    <div className="space-y-2.5 rounded-2xl border border-border/50 bg-card/90 p-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Customer
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          className={fieldClass("h-11 min-w-0 flex-1")}
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
                          placeholder="Phone 2547… or 07…"
                          disabled={!online}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-11 rounded-xl px-3 text-sm font-semibold"
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
                        <p className="text-[11px] text-destructive">
                          Enter at least 9 digits.
                        </p>
                      ) : null}
                      {customerHits.length > 0 ? (
                        <ul className="max-h-36 space-y-1 overflow-y-auto">
                          {customerHits.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                className={cn(
                                  "w-full rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors",
                                  selectedCustomer?.id === c.id
                                    ? "bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] font-semibold"
                                    : "hover:bg-muted/50",
                                )}
                                onClick={() => setSelectedCustomer(c)}
                              >
                                {c.name}
                                <span className="ml-1.5 text-muted-foreground">
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
                        <div className="space-y-2 rounded-xl border border-dashed border-border/60 p-3">
                          <p className="text-[11px] text-muted-foreground">
                            No match for that phone.
                          </p>
                          {canManageCustomers ? (
                            <>
                              <input
                                className={fieldClass("h-11 w-full")}
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
                                className="h-11 w-full rounded-xl text-sm font-semibold"
                                disabled={
                                  !online ||
                                  customerRegisterBusy ||
                                  !customerRegisterName.trim()
                                }
                                onClick={onRegisterCustomer}
                              >
                                {customerRegisterBusy
                                  ? "Saving…"
                                  : "Register & use tab"}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      {selectedCustomer ? (
                        <p className="rounded-xl bg-muted/40 px-3 py-2 text-[13px]">
                          <span className="font-semibold">
                            {selectedCustomer.name}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            · wallet{" "}
                            {Number(
                              selectedCustomer.credit.walletBalance,
                            ).toFixed(2)}{" "}
                            {currency}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                {lines.length > 0 ? (
                  <section className="overflow-hidden rounded-2xl border border-border/50 bg-card/70">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left"
                      onClick={() => setLinesOpen((v) => !v)}
                      aria-expanded={linesOpen}
                    >
                      <span className="flex items-center gap-2">
                        <ShoppingBag
                          className="size-4 text-[var(--pos-primary)]"
                          aria-hidden
                        />
                        <span className="text-[13px] font-semibold">
                          Review items
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                          {lines.length}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground transition-transform duration-200",
                          linesOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </button>
                    {linesOpen ? (
                      <ul className="divide-y divide-border/40 border-t border-border/40">
                        {lines.map((line) => {
                          const thumb = posTileThumbUrl(
                            line.item.name,
                            itemListThumbnailUrl(line.item),
                          );
                          const subtotal = lineSubtotal(line);
                          const qNum = Number(line.quantity) || 0;
                          const full = cashierItemPrimaryLabel(line.item);
                          const { primary, option } =
                            cashierItemTitleParts(line.item);
                          const unit = Number(line.unitPrice);
                          return (
                            <li
                              key={line.key}
                              className="flex items-center gap-2 px-3 py-2"
                            >
                              <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                                {thumb ? (
                                  <Image
                                    src={thumb}
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="size-full object-contain p-0.5"
                                    unoptimized
                                  />
                                ) : (
                                  <span
                                    className="flex size-full items-center justify-center text-[11px] font-bold text-muted-foreground/50"
                                    aria-hidden
                                  >
                                    {primary.trim().charAt(0).toUpperCase() ||
                                      "?"}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1" title={full}>
                                <p className="truncate text-[12px] font-semibold leading-tight">
                                  {primary}
                                  {option ? (
                                    <span className="font-medium text-muted-foreground">
                                      {" "}
                                      · {option}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-[10px] tabular-nums text-muted-foreground">
                                  {Number.isFinite(unit)
                                    ? unit.toFixed(2)
                                    : line.unitPrice}{" "}
                                  × {qNum}
                                </p>
                              </div>
                              <div className="inline-flex shrink-0 items-center rounded-lg border border-border/55 bg-muted/10">
                                <button
                                  type="button"
                                  className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
                                  aria-label={
                                    qNum <= 1
                                      ? `Remove ${full}`
                                      : "Decrease quantity"
                                  }
                                  onClick={() => {
                                    if (qNum <= 1) {
                                      removeLine(line.key);
                                      return;
                                    }
                                    updateLine(
                                      line.key,
                                      "quantity",
                                      String(qNum - 1),
                                    );
                                  }}
                                >
                                  <Minus className="size-3.5" />
                                </button>
                                <span className="min-w-[1.25rem] text-center text-xs font-bold tabular-nums">
                                  {line.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
                                  aria-label="Increase quantity"
                                  onClick={() =>
                                    updateLine(
                                      line.key,
                                      "quantity",
                                      String(qNum + 1),
                                    )
                                  }
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              </div>
                              <span className="w-12 shrink-0 text-right text-[12px] font-bold tabular-nums">
                                {subtotal.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                                aria-label={`Remove ${full}`}
                                onClick={() => removeLine(line.key)}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </section>
                ) : (
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/55 py-10 text-center">
                    <ShoppingBag
                      className="size-6 text-muted-foreground/40"
                      aria-hidden
                    />
                    <p className="text-sm text-muted-foreground">
                      Tap products to build the cart
                    </p>
                  </div>
                )}

                {outboxCount > 0 ? (
                  <p className="rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
                    {outboxCount} sale(s) waiting to sync.{" "}
                    <button
                      type="button"
                      className="font-semibold underline-offset-2 hover:underline disabled:opacity-50"
                      disabled={outboxBusy || !online}
                      onClick={onRetryOutbox}
                    >
                      {outboxBusy ? "Syncing…" : "Retry"}
                    </button>
                  </p>
                ) : null}
                {notice ? (
                  <DashboardFeedback kind="success" text={notice} />
                ) : null}
                {error ? <DashboardFeedback kind="error" text={error} /> : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-border/40 bg-background/95 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
              {!branchSelected ? (
                <p className="mb-2 rounded-xl border border-amber-200/50 bg-amber-50/90 px-3 py-2 text-[12px] text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                  Pick a branch in the top nav to check out.
                </p>
              ) : null}
              {completeBlockedHint ? (
                <p className="mb-2 rounded-xl bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
                  {completeBlockedHint}
                </p>
              ) : canCompleteSale ? (
                <p className="mb-2 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  Ready to record this sale
                </p>
              ) : null}
              <Button
                type="button"
                className={cn(
                  "h-14 w-full rounded-2xl text-base font-bold tracking-tight shadow-lg transition-all duration-200",
                  "disabled:opacity-35 disabled:shadow-none",
                  canCompleteSale && "hover:scale-[1.01] active:scale-[0.99]",
                )}
                style={{
                  backgroundColor: "var(--pos-primary)",
                  color: "var(--pos-primary-ink)",
                  boxShadow: canCompleteSale
                    ? "0 14px 36px -14px color-mix(in srgb, var(--pos-primary) 65%, transparent)"
                    : undefined,
                }}
                disabled={
                  loading ||
                  lines.length === 0 ||
                  !branchSelected ||
                  !canCompleteSale
                }
                onClick={onComplete}
              >
                {loading
                  ? "Recording…"
                  : `Complete · ${grandTotal.toFixed(2)} ${currency.trim()}`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
