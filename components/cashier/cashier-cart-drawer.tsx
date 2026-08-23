"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import {
  Banknote,
  Check,
  ChevronDown,
  Gift,
  Send,
  ShoppingBag,
  Smartphone,
  Trash2,
  UserRound,
  Store,
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
import { isAirtimeCartLine } from "@/lib/airtime-cart-line";
import { CashierCurrencySuffix } from "./cashier-currency-inline";
import {
  CashierQtyControl,
  formatCartQtyLabel,
} from "./cashier-qty-control";
import { CashierWeighedToggle } from "./cashier-weighed-toggle";
import { PosSaleCompletePanel } from "./pos-sale-complete-panel";
import { isValidCustomerPhone, customerPhoneValidationMessage, storedCustomerPhoneIssue } from "@/lib/customer-phone";
import {
  CustomerPhoneFlag,
  customerPrimaryPhone,
} from "@/components/credits/customer-phone-flag";
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
  kind?: "airtime";
};

function payMethodNeedsCustomer(
  method: SalePaymentMethod | "remote_bill" | "kiosk_pay",
): boolean {
  return (
    method === "customer_credit" ||
    method === "customer_wallet" ||
    method === "loyalty_redeem" ||
    method === "remote_bill"
  );
}

function isStkTender(
  method: SalePaymentMethod | "remote_bill" | "kiosk_pay",
): boolean {
  return method === "mpesa_manual" || method === "kiosk_pay";
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
  /** Amount to collect when round-to-10 is on (>= grandTotal; equals it otherwise). */
  payableTotal: number;
  /** Round-to-10 toggle (default on). */
  roundTo10: boolean;
  setRoundTo10: (b: boolean) => void;
  /** True when rounding may apply to this cart (cash/mpesa, no split/airtime/grocery). */
  roundingEligible: boolean;
  removeLine: (key: string) => void;
  updateLine: (
    key: string,
    field: "quantity" | "unitPrice",
    value: string,
  ) => void;
  allowWeighedToggle?: boolean;
  weighedToggleBusyItemId?: string | null;
  onToggleWeighed?: (lineKey: string) => void;

  payMethod: SalePaymentMethod | "remote_bill" | "kiosk_pay";
  setPayMethod: (m: SalePaymentMethod | "remote_bill" | "kiosk_pay") => void;
  /** Show Kiosk Pay tender (platform custody STK). Kept for status hints; tile always shows on web. */
  kioskPayAvailable?: boolean;
  /** Optional setup hint when Kiosk Pay STK is not fully ready. */
  kioskPayHint?: string | null;
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
  walletSplitStr: string;
  setWalletSplitStr: (s: string) => void;
  cashTenderStr: string;
  setCashTenderStr: (s: string) => void;
  creditChangeToWallet: boolean;
  setCreditChangeToWallet: (b: boolean) => void;

  canLookupCustomers: boolean;
  canManageCustomers: boolean;
  /** Create remote grocery invoices (Send bill). */
  canCreateRemoteBill?: boolean;
  customerPhoneQuery: string;
  setCustomerPhoneQuery: (s: string) => void;
  customerHits: CustomerRecord[];
  customerNoPhoneMatch: boolean;
  customerRegisterName: string;
  setCustomerRegisterName: (s: string) => void;
  customerSearchBusy: boolean;
  customerRegisterBusy: boolean;
  phoneVerificationSent: boolean;
  phoneVerificationCode: string;
  setPhoneVerificationCode: (s: string) => void;
  phoneVerificationChannel: string;
  phoneVerificationCooldownUntil: number;
  /** When false, cashiers may register a new customer without OTP. */
  requirePhoneVerificationForNewTabCustomers?: boolean;
  /** When true, Tab Find accepts name or phone. */
  allowSearchCustomersByName?: boolean;
  onSearchCustomers: () => void;
  onSendPhoneVerification: () => void;
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
  /** Gateway-verified / locked M-Pesa amount (shown on confirm). */
  stkLockedAmount?: number | null;
  onStkPush: (phoneNumber: string) => void;
  /** Abandon in-flight STK / till listen. */
  onCancelInFlightMpesa?: () => void;
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
    payableTotal,
    roundTo10,
    setRoundTo10,
    roundingEligible,
    removeLine,
    updateLine,
    allowWeighedToggle = false,
    weighedToggleBusyItemId = null,
    onToggleWeighed,
    payMethod,
    setPayMethod,
    kioskPayHint = null,
    mpesaRef,
    setSplitPay,
    splitPay,
    cashSplitStr,
    setCashSplitStr,
    mpesaSplitStr,
    setMpesaSplitStr,
    splitMpesaRef,
    setSplitMpesaRef,
    walletSplitStr,
    setWalletSplitStr,
    cashTenderStr,
    setCashTenderStr,
    creditChangeToWallet,
    setCreditChangeToWallet,
    canLookupCustomers,
    canManageCustomers,
    canCreateRemoteBill = false,
    customerPhoneQuery,
    setCustomerPhoneQuery,
    customerHits,
    customerNoPhoneMatch,
    customerRegisterName,
    setCustomerRegisterName,
    customerSearchBusy,
    customerRegisterBusy,
    phoneVerificationSent,
    phoneVerificationCode,
    setPhoneVerificationCode,
    phoneVerificationChannel,
    phoneVerificationCooldownUntil,
    requirePhoneVerificationForNewTabCustomers = true,
    allowSearchCustomersByName = false,
    onSearchCustomers,
    onSendPhoneVerification,
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
    stkLockedAmount = null,
    onStkPush,
    onCancelInFlightMpesa,
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

  const walletBalance = selectedCustomer
    ? Number(selectedCustomer.credit.walletBalance)
    : NaN;
  const walletAvail =
    Number.isFinite(walletBalance) && walletBalance > 0 ? walletBalance : 0;
  const walletSplitNum = Number(walletSplitStr.trim());
  const walletSplitApplied =
    Number.isFinite(walletSplitNum) && walletSplitNum > 0 ? walletSplitNum : 0;
  const walletOverAvail =
    splitPay &&
    walletSplitApplied > 0 &&
    (!selectedCustomer || walletSplitApplied > walletAvail + 0.001);
  const splitUsesWallet = splitPay && walletSplitApplied > 0;
  const customerNeeded =
    (!splitPay && payMethodNeedsCustomer(payMethod)) ||
    creditChangeToWallet ||
    splitUsesWallet;
  const showCustomerPicker =
    (canLookupCustomers &&
      ((!splitPay && payMethodNeedsCustomer(payMethod)) ||
        creditChangeToWallet ||
        splitPay)) ||
    payMethod === "remote_bill";

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
  const changeDueAmount =
    cashReady && cashChange != null ? Number(cashChange) : 0;

  useEffect(() => {
    if (!open || saleComplete) return;
    if (splitPay || payMethod !== "cash") return;
    if (payableTotal <= 0) return;
    setCashTenderStr(payableTotal.toFixed(2));
    setCreditChangeToWallet(false);
  }, [
    open,
    saleComplete,
    splitPay,
    payMethod,
    payableTotal,
    roundTo10,
    setCashTenderStr,
    setCreditChangeToWallet,
  ]);

  // Keep wallet split within the selected customer's available balance.
  useEffect(() => {
    if (!open || saleComplete || !splitPay) return;
    if (!selectedCustomer) {
      if (walletSplitStr.trim()) {
        setWalletSplitStr("");
      }
      return;
    }
    const bal = Number(selectedCustomer.credit.walletBalance);
    const avail = Number.isFinite(bal) && bal > 0 ? bal : 0;
    const current = Number(walletSplitStr.trim());
    if (avail <= 0) {
      if (walletSplitStr.trim() && walletSplitStr.trim() !== "0") {
        setWalletSplitStr("");
      }
      const c = Number(cashSplitStr.trim()) || 0;
      const m = Number(mpesaSplitStr.trim()) || 0;
      if (c <= 0 && m <= 0) {
        setCashSplitStr(grandTotal.toFixed(2));
      }
      return;
    }
    const maxApply = Math.min(avail, grandTotal);
    if (!Number.isFinite(current) || current <= 0) {
      setWalletSplitStr(maxApply.toFixed(2));
      const rem = Math.round((grandTotal - maxApply) * 100) / 100;
      const m = Number(mpesaSplitStr.trim());
      if (!Number.isFinite(m) || m <= 0) {
        setCashSplitStr(rem > 0 ? rem.toFixed(2) : "0");
      }
      return;
    }
    if (current > maxApply + 0.001) {
      setWalletSplitStr(maxApply.toFixed(2));
      const rem = Math.round((grandTotal - maxApply) * 100) / 100;
      const m = Number(mpesaSplitStr.trim());
      if (!Number.isFinite(m) || m <= 0) {
        setCashSplitStr(rem > 0 ? rem.toFixed(2) : "0");
      }
    }
  }, [
    open,
    saleComplete,
    splitPay,
    selectedCustomer,
    grandTotal,
    walletSplitStr,
    cashSplitStr,
    mpesaSplitStr,
    setWalletSplitStr,
    setCashSplitStr,
  ]);

  useEffect(() => {
    if (open) setLinesOpen(false);
  }, [open]);

  const completeBlockedHint = (() => {
    if (loading || lines.length === 0 || !branchSelected || canCompleteSale) {
      return null;
    }
    if (splitPay) {
      if (walletOverAvail) {
        if (!selectedCustomer) {
          return "Find a customer before applying wallet.";
        }
        return `Wallet only has ${walletAvail.toFixed(2)} ${currency}.`;
      }
      if (splitUsesWallet && !selectedCustomer) {
        return "Find a customer to apply wallet.";
      }
      return "Split amounts must add up to the total.";
    }
    if (payMethod === "cash") {
      if (creditChangeToWallet && !selectedCustomer) {
        return "Find a customer to credit change to wallet.";
      }
      return "Cash received is still short of the total.";
    }
    if (payMethod === "remote_bill") {
      if (!isValidCustomerPhone(customerPhoneQuery)) {
        return "Enter a valid customer phone to send the bill.";
      }
      return "Finish payment details to complete.";
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
              {cashReady && changeDueAmount > 0 ? (
                <p className="relative mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                  {creditChangeToWallet
                    ? `Credit ${cashChange} ${currency} to wallet`
                    : `Change due ${cashChange} ${currency}`}
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
                          disabled={
                            payMethod === "customer_credit" ||
                            payMethod === "loyalty_redeem" ||
                            payMethod === "remote_bill" ||
                            creditChangeToWallet
                          }
                          onChange={(e) => {
                            const next = e.target.checked;
                            if (
                              next &&
                              (payMethod === "customer_credit" ||
                                payMethod === "loyalty_redeem" ||
                                payMethod === "remote_bill")
                            ) {
                              return;
                            }
                            if (next && payMethod === "customer_wallet") {
                              // Keep wallet as part of the split mix.
                            } else if (next && payMethodNeedsCustomer(payMethod)) {
                              setPayMethod("cash");
                            }
                            if (next) {
                              setCreditChangeToWallet(false);
                            }
                            setSplitPay(next);
                          }}
                        />
                        Split
                      </label>
                    ) : null}
                  </div>

                  {!splitPay &&
                  stkPushStatus === "awaiting_till" &&
                  !isStkTender(payMethod) ? (
                    <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] font-medium text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                      Listening for M-Pesa till payment… You can keep adding
                      items. If the customer pays Buy Goods for this total, the
                      sale completes automatically.
                    </p>
                  ) : null}

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
                          hint="Your till STK"
                        />
                      ) : null}
                      {!IS_DESKTOP ? (
                        <PayMethodTile
                          active={payMethod === "kiosk_pay"}
                          onClick={() => setPayMethod("kiosk_pay")}
                          icon={<Store className="size-3.5" aria-hidden />}
                          label="Kiosk Pay"
                          hint="Platform STK"
                        />
                      ) : null}
                      {canCreateRemoteBill ? (
                        <PayMethodTile
                          active={payMethod === "remote_bill"}
                          disabled={!online}
                          onClick={() => {
                            setSplitPay(false);
                            setCreditChangeToWallet(false);
                            setPayMethod("remote_bill");
                          }}
                          icon={<Send className="size-3.5" aria-hidden />}
                          label="Send bill"
                          hint="Delivery / remote"
                        />
                      ) : null}
                      {canLookupCustomers ? (
                        <PayMethodTile
                          active={payMethod === "customer_credit"}
                          onClick={() => {
                            setSplitPay(false);
                            setCreditChangeToWallet(false);
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
                            setCreditChangeToWallet(false);
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
                            setCreditChangeToWallet(false);
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
                        <div className="flex items-center gap-1">
                          {roundingEligible ? (
                            <button
                              type="button"
                              className={cn(
                                "rounded-lg px-2 py-1 text-[11px] font-semibold transition",
                                roundTo10
                                  ? "bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-[var(--pos-primary)]"
                                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                              )}
                              onClick={() => setRoundTo10(!roundTo10)}
                              aria-pressed={roundTo10}
                              title="Round the amount to the nearest 10"
                            >
                              {roundTo10 ? "Round to 10 · on" : "Round to 10"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--pos-primary)] hover:bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)]"
                            onClick={() =>
                              setCashTenderStr(payableTotal.toFixed(2))
                            }
                          >
                            Exact total
                          </button>
                        </div>
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
                      {roundingEligible &&
                      roundTo10 &&
                      payableTotal > grandTotal + 0.001 ? (
                        <p className="rounded-lg bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--pos-primary)]">
                          Rounded up from {grandTotal.toFixed(2)} — ask for{" "}
                          {payableTotal.toFixed(2)}
                        </p>
                      ) : null}
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
                            : creditChangeToWallet
                              ? selectedCustomer &&
                                  Number(selectedCustomer.credit?.balanceOwed) >
                                    0
                                ? `Apply ${cashChange} ${currency} to tab first, rest to wallet`
                                : `Park ${cashChange} ${currency} on their wallet`
                              : `Give back ${cashChange} ${currency}`
                          : "Tap Exact total, or pick a note amount"}
                      </p>
                      {cashReady && changeDueAmount > 0 && canLookupCustomers ? (
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[12px]",
                            creditChangeToWallet
                              ? "border-[color-mix(in_srgb,var(--pos-primary)_40%,var(--border))] bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)]"
                              : "border-border/55 bg-background",
                            !online && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 size-3.5 rounded border-border/60 accent-[var(--pos-primary)]"
                            checked={creditChangeToWallet}
                            disabled={!online}
                            onChange={(e) => {
                              const next = e.target.checked;
                              setCreditChangeToWallet(next);
                              if (next) {
                                setSplitPay(false);
                              }
                            }}
                          />
                          <span className="min-w-0">
                            <span className="font-semibold text-foreground">
                              Credit change to wallet
                            </span>
                            <span className="mt-0.5 block text-muted-foreground">
                              Keep the note — park {cashChange} {currency} on
                              their phone. If they owe on tab, that is paid
                              first; the rest goes to wallet.
                            </span>
                          </span>
                        </label>
                      ) : null}
                    </div>
                  ) : null}

                  {!splitPay && isStkTender(payMethod) ? (
                    <div className="space-y-2.5 rounded-2xl border border-border/50 bg-card/90 p-3 shadow-sm">
                      {stkPushStatus === "idle" ||
                      stkPushStatus === "failed" ||
                      stkPushStatus === "awaiting_till" ? (
                        <>
                          {stkPushStatus === "awaiting_till" &&
                          payMethod === "mpesa_manual" ? (
                            <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] font-medium text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                              Listening for till payment… Customer can pay Buy
                              Goods now (or send an STK prompt below).
                            </p>
                          ) : null}
                          {payMethod === "kiosk_pay" ? (
                            <p className="text-[11px] text-muted-foreground">
                              {kioskPayHint?.trim()
                                ? kioskPayHint
                                : "Payment settles to your Kiosk Pay balance (provider fees only). Withdraw from Payments → Kiosk Pay."}
                            </p>
                          ) : null}
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
                        <div className="space-y-2">
                          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-center text-[12px] font-medium text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                            Sending M-Pesa prompt… (may take a few seconds if clearing a previous one)
                          </p>
                          {onCancelInFlightMpesa ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-10 w-full rounded-xl text-sm font-semibold text-muted-foreground"
                              onClick={onCancelInFlightMpesa}
                            >
                              Cancel M-Pesa
                            </Button>
                          ) : null}
                        </div>
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
                          {onCancelInFlightMpesa ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-10 w-full rounded-xl text-sm font-semibold text-muted-foreground"
                              onClick={onCancelInFlightMpesa}
                            >
                              Cancel M-Pesa
                            </Button>
                          ) : null}
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
                                {currency}{" "}
                                {(stkLockedAmount != null && stkLockedAmount > 0
                                  ? stkLockedAmount
                                  : grandTotal
                                ).toFixed(2)}{" "}
                                — completing sale…
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
                      {canLookupCustomers ? (
                        <div className="space-y-1.5">
                          {!selectedCustomer ? (
                            <p className="text-[11px] text-muted-foreground">
                              Find the customer below to apply wallet credit.
                            </p>
                          ) : walletAvail <= 0 ? (
                            <p className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                              No wallet balance — collect cash or M-Pesa.
                            </p>
                          ) : (
                            <label className="space-y-1">
                              <span className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
                                <span>Wallet ({currency})</span>
                                <span className="tabular-nums">
                                  avail {walletAvail.toFixed(2)}
                                </span>
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                className={fieldClass(
                                  "h-11 w-full text-right font-semibold tabular-nums",
                                )}
                                value={walletSplitStr}
                                disabled={!online}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw.trim() === "" || raw.trim() === ".") {
                                    setWalletSplitStr(raw);
                                    return;
                                  }
                                  const w = Number(raw.trim());
                                  if (!Number.isFinite(w) || w < 0) {
                                    setWalletSplitStr(raw);
                                    return;
                                  }
                                  const capped = Math.min(
                                    w,
                                    walletAvail,
                                    grandTotal,
                                  );
                                  setWalletSplitStr(
                                    capped < w ? capped.toFixed(2) : raw,
                                  );
                                  const rem =
                                    Math.round((grandTotal - capped) * 100) /
                                    100;
                                  const m = Number(mpesaSplitStr.trim());
                                  if (!Number.isFinite(m) || m <= 0) {
                                    setCashSplitStr(
                                      rem > 0 ? rem.toFixed(2) : "0",
                                    );
                                  }
                                }}
                                onBlur={() => {
                                  const w = Number(walletSplitStr.trim());
                                  if (!Number.isFinite(w) || w <= 0) {
                                    setWalletSplitStr("");
                                    return;
                                  }
                                  const capped = Math.min(
                                    w,
                                    walletAvail,
                                    grandTotal,
                                  );
                                  setWalletSplitStr(
                                    capped > 0 ? capped.toFixed(2) : "",
                                  );
                                }}
                                placeholder="0.00"
                              />
                            </label>
                          )}
                        </div>
                      ) : null}
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
                      {(() => {
                        const w =
                          selectedCustomer && walletAvail > 0
                            ? Math.min(
                                Number(walletSplitStr.trim()) || 0,
                                walletAvail,
                              )
                            : 0;
                        const c = Number(cashSplitStr.trim()) || 0;
                        const m = Number(mpesaSplitStr.trim()) || 0;
                        const sum = Math.round((w + c + m) * 100) / 100;
                        const rem =
                          Math.round((grandTotal - sum) * 100) / 100;
                        if (walletOverAvail) {
                          return (
                            <p className="text-[12px] font-medium text-destructive">
                              {!selectedCustomer
                                ? "Find a customer before applying wallet"
                                : `Wallet only has ${walletAvail.toFixed(2)} ${currency}`}
                            </p>
                          );
                        }
                        const creditRemainder = selectedCustomer && rem > 0.001 && sum > 0;
                        return (
                          <p
                            className={cn(
                              "text-[12px] font-medium",
                              Math.abs(rem) <= 0.001 || creditRemainder
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-muted-foreground",
                            )}
                          >
                            {Math.abs(rem) <= 0.001
                              ? w > 0
                                ? `Wallet ${w.toFixed(2)} · collect ${(c + m).toFixed(2)} ${currency}`
                                : "Split covers the total"
                              : creditRemainder
                                ? `${rem.toFixed(2)} ${currency} to ${selectedCustomer.name}'s tab`
                                : rem > 0
                                  ? `Still need ${rem.toFixed(2)} ${currency}`
                                  : `Over by ${Math.abs(rem).toFixed(2)} ${currency}`}
                          </p>
                        );
                      })()}
                    </div>
                  ) : null}

                  {showCustomerPicker ? (
                    <div className="space-y-2.5 rounded-2xl border border-border/50 bg-card/90 p-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {creditChangeToWallet
                          ? "Credit change to"
                          : payMethod === "remote_bill"
                            ? "Send bill to"
                            : splitPay
                              ? "Wallet customer"
                              : "Customer"}
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
                          placeholder={
                            allowSearchCustomersByName &&
                            (payMethod === "customer_credit" ||
                              creditChangeToWallet)
                              ? "Name or phone…"
                              : "Phone 2547… or 07…"
                          }
                          disabled={!online}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-11 rounded-xl px-3 text-sm font-semibold"
                          disabled={
                            !online ||
                            customerSearchBusy ||
                            !customerPhoneQuery.trim() ||
                            ((payMethod === "customer_credit" ||
                              creditChangeToWallet) &&
                              !allowSearchCustomersByName &&
                              !isValidCustomerPhone(customerPhoneQuery))
                          }
                          onClick={onSearchCustomers}
                        >
                          {customerSearchBusy ? "…" : "Find"}
                        </Button>
                      </div>
                      {(payMethod === "customer_credit" ||
                        creditChangeToWallet) &&
                      !allowSearchCustomersByName &&
                      customerPhoneQuery.trim() &&
                      !isValidCustomerPhone(customerPhoneQuery) ? (
                        <p className="text-[11px] text-destructive">
                          {customerPhoneValidationMessage(customerPhoneQuery) ??
                            "Enter a valid phone number."}
                        </p>
                      ) : null}
                      {customerHits.length > 0 ? (
                        <ul className="max-h-36 space-y-1 overflow-y-auto">
                          {customerHits.map((c) => {
                            const hitPhone = customerPrimaryPhone(c.phones);
                            const phoneIssue = storedCustomerPhoneIssue(hitPhone);
                            return (
                            <li key={c.id}>
                              <button
                                type="button"
                                className={cn(
                                  "w-full rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors",
                                  selectedCustomer?.id === c.id
                                    ? "bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] font-semibold"
                                    : "hover:bg-muted/50",
                                  phoneIssue &&
                                    "ring-1 ring-destructive/40",
                                )}
                                onClick={() => setSelectedCustomer(c)}
                              >
                                {c.name}
                                <span
                                  className={cn(
                                    "ml-1.5",
                                    phoneIssue
                                      ? "text-destructive"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {hitPhone}
                                </span>
                                {phoneIssue ? (
                                  <CustomerPhoneFlag
                                    phone={hitPhone}
                                    compact
                                    className="mt-0.5 block"
                                  />
                                ) : null}
                                {c.credit ? (
                                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                                    {Number(c.credit.balanceOwed) > 0
                                      ? `Tab owed ${Number(c.credit.balanceOwed).toFixed(2)}`
                                      : "Tab clear"}
                                    {" · "}
                                    Wallet{" "}
                                    {Number(c.credit.walletBalance ?? 0).toFixed(
                                      2,
                                    )}
                                  </span>
                                ) : null}
                              </button>
                            </li>
                            );
                          })}
                        </ul>
                      ) : null}
                      {(payMethod === "customer_credit" ||
                        creditChangeToWallet) &&
                      customerNoPhoneMatch &&
                      !selectedCustomer &&
                      isValidCustomerPhone(customerPhoneQuery) ? (
                        <div className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--pos-primary)_28%,var(--border))] bg-[color-mix(in_srgb,var(--pos-primary)_7%,transparent)] p-3.5">
                          <div className="space-y-1">
                            <p className="text-[13px] font-semibold tracking-tight text-foreground">
                              {requirePhoneVerificationForNewTabCustomers
                                ? creditChangeToWallet
                                  ? "New number — verify before wallet credit"
                                  : "New number — verify before credit"
                                : creditChangeToWallet
                                  ? "New number — register before wallet credit"
                                  : "New number — register before credit"}
                            </p>
                            <p className="text-[12px] leading-snug text-muted-foreground">
                              {requirePhoneVerificationForNewTabCustomers
                                ? creditChangeToWallet
                                  ? "A 4-digit code will be sent by SMS and WhatsApp. The customer must read it aloud so you can confirm the number before parking change on their wallet."
                                  : "A 4-digit code will be sent by SMS and WhatsApp. The customer must read it aloud so you can confirm the number before opening a tab."
                                : creditChangeToWallet
                                  ? "Enter the customer's name to register this number and park change on their wallet."
                                  : "Enter the customer's name to register this number and open a tab."}
                            </p>
                          </div>
                          {canManageCustomers ? (
                            <>
                              <label className="block space-y-1.5">
                                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Customer name
                                </span>
                                <input
                                  className={fieldClass("h-11 w-full")}
                                  value={customerRegisterName}
                                  onChange={(e) =>
                                    setCustomerRegisterName(e.target.value)
                                  }
                                  placeholder="Full name"
                                  disabled={
                                    !online ||
                                    customerRegisterBusy ||
                                    (requirePhoneVerificationForNewTabCustomers &&
                                      phoneVerificationSent)
                                  }
                                />
                              </label>
                              {requirePhoneVerificationForNewTabCustomers ? (
                                !phoneVerificationSent ? (
                                  <Button
                                    type="button"
                                    className="h-11 w-full rounded-xl text-sm font-semibold"
                                    disabled={
                                      !online ||
                                      customerRegisterBusy ||
                                      !customerRegisterName.trim() ||
                                      Date.now() < phoneVerificationCooldownUntil
                                    }
                                    onClick={onSendPhoneVerification}
                                  >
                                    {customerRegisterBusy
                                      ? "Sending code…"
                                      : "Send code to phone"}
                                  </Button>
                                ) : (
                                  <div className="space-y-2.5 rounded-lg bg-background/70 px-3 py-3 ring-1 ring-border/70">
                                    <div className="space-y-0.5">
                                      <p className="text-[13px] font-semibold text-foreground">
                                        Ask the customer for their code
                                      </p>
                                      <p className="text-[12px] leading-snug text-muted-foreground">
                                      Sent
                                      {phoneVerificationChannel === "whatsapp+sms"
                                        ? " via SMS and WhatsApp"
                                        : phoneVerificationChannel === "whatsapp"
                                          ? " via WhatsApp"
                                          : phoneVerificationChannel === "sms"
                                            ? " via SMS"
                                            : phoneVerificationChannel
                                              ? ` via ${phoneVerificationChannel}`
                                              : " to their phone"}
                                      . Type the 4 digits they show or read to
                                      you.
                                      </p>
                                    </div>
                                    <input
                                      className={fieldClass(
                                        "h-14 w-full text-center text-2xl font-semibold tracking-[0.35em]",
                                      )}
                                      value={phoneVerificationCode}
                                      onChange={(e) =>
                                        setPhoneVerificationCode(
                                          e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 4),
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          onRegisterCustomer();
                                        }
                                      }}
                                      inputMode="numeric"
                                      autoComplete="one-time-code"
                                      placeholder="••••"
                                      aria-label="4-digit verification code"
                                      disabled={!online || customerRegisterBusy}
                                    />
                                    <Button
                                      type="button"
                                      className="h-11 w-full rounded-xl text-sm font-semibold"
                                      disabled={
                                        !online ||
                                        customerRegisterBusy ||
                                        !customerRegisterName.trim() ||
                                        phoneVerificationCode.length !== 4
                                      }
                                      onClick={onRegisterCustomer}
                                    >
                                      {customerRegisterBusy
                                        ? "Verifying…"
                                        : creditChangeToWallet
                                          ? "Verify & credit wallet"
                                          : "Verify & open tab"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="h-9 w-full rounded-xl text-xs text-muted-foreground"
                                      disabled={
                                        !online ||
                                        customerRegisterBusy ||
                                        Date.now() <
                                          phoneVerificationCooldownUntil
                                      }
                                      onClick={onSendPhoneVerification}
                                    >
                                      {Date.now() < phoneVerificationCooldownUntil
                                        ? "Resend available soon"
                                        : "Resend code"}
                                    </Button>
                                  </div>
                                )
                              ) : (
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
                                    ? "Registering…"
                                    : creditChangeToWallet
                                      ? "Register & credit wallet"
                                      : "Register & open tab"}
                                </Button>
                              )}
                            </>
                          ) : (
                            <p className="text-[12px] text-muted-foreground">
                              You need permission to register customers.
                            </p>
                          )}
                        </div>
                      ) : null}
                      {selectedCustomer ? (
                        <div className="rounded-xl bg-muted/40 px-3 py-2 text-[13px]">
                          <p>
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
                          {(() => {
                            const selectedPhone = customerPrimaryPhone(
                              selectedCustomer.phones,
                            );
                            if (!selectedPhone) {
                              return (
                                <p className="mt-1 text-[11px] font-medium text-destructive">
                                  No phone on file — add one before sending
                                  reminders or STK.
                                </p>
                              );
                            }
                            if (!storedCustomerPhoneIssue(selectedPhone)) {
                              return (
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {selectedPhone}
                                </p>
                              );
                            }
                            return (
                              <div className="mt-1">
                                <p className="text-[11px] font-medium text-destructive">
                                  {selectedPhone}
                                </p>
                                <CustomerPhoneFlag phone={selectedPhone} />
                              </div>
                            );
                          })()}
                        </div>
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
                          const full = cashierItemPrimaryLabel(line.item);
                          const { primary, option } =
                            cashierItemTitleParts(line.item);
                          const unit = Number(line.unitPrice);
                          const airtime = isAirtimeCartLine(line);
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
                                <div className="flex min-w-0 items-start gap-1.5">
                                  <p className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-tight">
                                    {primary}
                                    {option ? (
                                      <span className="font-medium text-muted-foreground">
                                        {" "}
                                        · {option}
                                      </span>
                                    ) : null}
                                  </p>
                                  {!airtime &&
                                  allowWeighedToggle &&
                                  onToggleWeighed ? (
                                    <CashierWeighedToggle
                                      weighed={line.item.isWeighed === true}
                                      busy={
                                        weighedToggleBusyItemId === line.itemId
                                      }
                                      itemLabel={full}
                                      onToggle={() =>
                                        onToggleWeighed(line.key)
                                      }
                                    />
                                  ) : null}
                                </div>
                                <p className="text-[10px] tabular-nums text-muted-foreground">
                                  {Number.isFinite(unit)
                                    ? unit.toFixed(2)
                                    : line.unitPrice}{" "}
                                  ×{" "}
                                  {airtime
                                    ? "1"
                                    : formatCartQtyLabel(line.quantity)}
                                  {!airtime && line.item.isWeighed === true
                                    ? " kg"
                                    : ""}
                                </p>
                              </div>
                              {airtime ? null : (
                                <CashierQtyControl
                                  quantity={line.quantity}
                                  itemLabel={full}
                                  size="sm"
                                  allowFractions={line.item.isWeighed === true}
                                  unitPrice={line.unitPrice}
                                  currency={currency}
                                  onChange={(next) =>
                                    updateLine(line.key, "quantity", next)
                                  }
                                  onUnitPriceChange={(next) =>
                                    updateLine(line.key, "unitPrice", next)
                                  }
                                  onRemove={() => removeLine(line.key)}
                                />
                              )}
                              <span className="w-12 shrink-0 text-right text-[12px] font-bold tabular-nums">
                                {subtotal.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-40"
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
                  {payMethod === "remote_bill"
                    ? "Ready to send bill + M-Pesa prompt"
                    : "Ready to record this sale"}
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
                  ? payMethod === "remote_bill"
                    ? "Sending…"
                    : "Recording…"
                  : payMethod === "remote_bill"
                    ? `Send bill · ${grandTotal.toFixed(2)} ${currency.trim()}`
                    : `Complete · ${grandTotal.toFixed(2)} ${currency.trim()}`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
