"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  type CustomerRecord,
  type ItemSummaryRecord,
  type SalePaymentMethod,
  type SaleRecord,
} from "@/lib/api";
import {
  cashierItemPrimaryLabel,
  cashierItemTitleParts,
} from "@/lib/cashier-item-display";
import { CashierCurrencySuffix } from "./cashier-currency-inline";
import { PosSaleCompletePanel } from "./pos-sale-complete-panel";
import { isValidCustomerPhone, customerPhoneValidationMessage, storedCustomerPhoneIssue } from "@/lib/customer-phone";
import {
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
  /** Amount to collect (equals the cart total). */
  payableTotal: number;
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
  /** Show Kiosk Pay tender only when the merchant has activated Kiosk Pay. */
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
  customerRegisterPhone: string;
  setCustomerRegisterPhone: (s: string) => void;
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
  /** When true, cash and M-Pesa sales show an optional add/select-customer step (tenant setting, off by default). */
  captureCustomerForCashAndMpesa?: boolean;
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
  /** Abandon the in-progress cart (with confirm). */
  onClearSale?: () => void;
  /** Show Clear sale in checkout (tenant setting). */
  allowClearSale?: boolean;
  /** Branch CUPS / network printer for raw ESC/POS + cut. */
  receiptPrinter?: LocalReceiptPrinterTarget | null;
};

function PayMethodChip({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left transition-all duration-150",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-transparent text-[var(--pos-primary-ink)] shadow-sm"
          : "border-border/45 bg-background/90 text-foreground hover:border-border hover:bg-card",
      )}
      style={
        active
          ? {
              backgroundColor: "var(--pos-primary)",
              boxShadow:
                "0 6px 18px -10px color-mix(in srgb, var(--pos-primary) 50%, transparent)",
            }
          : undefined
      }
    >
      <span
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-md",
          active
            ? "bg-[color-mix(in_srgb,var(--pos-primary-ink)_14%,transparent)]"
            : "bg-muted/55 text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="text-[12px] font-semibold leading-none tracking-tight">
        {label}
      </span>
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
    removeLine,
    payMethod,
    setPayMethod,
    kioskPayAvailable = false,
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
    customerRegisterPhone,
    setCustomerRegisterPhone,
    customerSearchBusy,
    customerRegisterBusy,
    phoneVerificationSent,
    phoneVerificationCode,
    setPhoneVerificationCode,
    phoneVerificationChannel,
    phoneVerificationCooldownUntil,
    requirePhoneVerificationForNewTabCustomers = true,
    allowSearchCustomersByName = false,
    captureCustomerForCashAndMpesa = false,
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
    onClearSale,
    allowClearSale = true,
    receiptPrinter,
  } = props;

  const [linesOpen, setLinesOpen] = useState(false);
  const saleComplete = lastSale != null && lastReceipt != null;

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
  const creditRegisterContext =
    payMethod === "customer_credit" || creditChangeToWallet;
  /** Optional customer capture on cash / M-Pesa sales (tenant setting, off by default). */
  const captureCustomerSimple =
    captureCustomerForCashAndMpesa &&
    canLookupCustomers &&
    !splitPay &&
    !creditChangeToWallet &&
    (payMethod === "cash" ||
      payMethod === "mpesa_manual" ||
      payMethod === "kiosk_pay");
  const registerNeedsOtp =
    requirePhoneVerificationForNewTabCustomers && creditRegisterContext;
  const selectedPhone = selectedCustomer
    ? customerPrimaryPhone(selectedCustomer.phones)
    : null;
  const showCustomerPicker =
    (canLookupCustomers &&
      ((!splitPay && payMethodNeedsCustomer(payMethod)) ||
        creditChangeToWallet ||
        splitPay)) ||
    payMethod === "remote_bill" ||
    captureCustomerSimple;

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

  const cashTenderStrRef = useRef(cashTenderStr);
  cashTenderStrRef.current = cashTenderStr;
  const lastAutoTenderRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || saleComplete) {
      lastAutoTenderRef.current = null;
      return;
    }
    if (splitPay || payMethod !== "cash") return;
    if (payableTotal <= 0) return;

    const next = payableTotal.toFixed(2);
    const current = cashTenderStrRef.current.trim();
    const lastAuto = lastAutoTenderRef.current;
    // Keep a cashier-typed tender (e.g. 200) — do not snap back to the bill.
    if (current !== "" && lastAuto != null && current !== lastAuto) {
      return;
    }
    lastAutoTenderRef.current = next;
    if (current !== next) {
      setCashTenderStr(next);
    }
    setCreditChangeToWallet(false);
  }, [
    open,
    saleComplete,
    splitPay,
    payMethod,
    payableTotal,
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
      if (selectedCustomer.credit.creditSuspended) {
        return "This tab is suspended. They cannot take more credit.";
      }
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
              className="relative shrink-0 border-b border-border/35 px-3.5 py-2.5"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--pos-primary) 12%, transparent) 0%, transparent 65%)",
              }}
            >
              <DialogHeader className="relative min-w-0 pr-7">
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Checkout
                  </DialogTitle>
                  {lines.length > 0 ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                      onClick={() => setLinesOpen((v) => !v)}
                      aria-expanded={linesOpen}
                    >
                      <ShoppingBag className="size-3" aria-hidden />
                      {lines.length} item{lines.length === 1 ? "" : "s"}
                      <ChevronDown
                        className={cn(
                          "size-3 transition-transform duration-200",
                          linesOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </button>
                  ) : null}
                </div>
                <DialogDescription className="sr-only">
                  Pay for this cart and complete the sale
                </DialogDescription>
              </DialogHeader>
              <div className="relative mt-1 flex items-end justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <span className="text-[2rem] font-bold leading-none tracking-tight tabular-nums text-foreground">
                    {grandTotal.toFixed(2)}
                  </span>
                  <CashierCurrencySuffix
                    code={currency}
                    className="!text-[11px] tracking-[0.12em] text-muted-foreground/70"
                  />
                </div>
                {cashReady && changeDueAmount > 0 ? (
                  <p className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">
                    {creditChangeToWallet
                      ? `+${cashChange} wallet`
                      : `Change ${cashChange}`}
                  </p>
                ) : cashReady ? (
                  <p className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--pos-primary)]">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                    Exact
                  </p>
                ) : null}
              </div>
              {linesOpen && lines.length > 0 ? (
                <ul className="mt-2 max-h-28 space-y-0.5 overflow-y-auto rounded-xl border border-border/40 bg-background/80 p-1">
                  {lines.map((line) => {
                    const subtotal = lineSubtotal(line);
                    const full = cashierItemPrimaryLabel(line.item);
                    const { primary, option } = cashierItemTitleParts(line.item);
                    return (
                      <li
                        key={line.key}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {primary}
                          {option ? (
                            <span className="text-muted-foreground"> · {option}</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {subtotal.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                          aria-label={`Remove ${full}`}
                          onClick={() => removeLine(line.key)}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-2.5">
              <div className="space-y-2.5">
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Payment
                    </h3>
                    {!IS_DESKTOP ? (
                      <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground">
                        <input
                          type="checkbox"
                          className="size-3 rounded border-border/60 accent-[var(--pos-primary)]"
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
                    <p className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-medium text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                      Listening for M-Pesa till payment… Sale completes when paid.
                    </p>
                  ) : null}

                  {!splitPay ? (
                    <div className="flex flex-wrap gap-1.5">
                      <PayMethodChip
                        active={payMethod === "cash"}
                        onClick={() => setPayMethod("cash")}
                        icon={<Banknote className="size-3" aria-hidden />}
                        label="Cash"
                      />
                      {!IS_DESKTOP ? (
                        <PayMethodChip
                          active={payMethod === "mpesa_manual"}
                          onClick={() => setPayMethod("mpesa_manual")}
                          icon={<Smartphone className="size-3" aria-hidden />}
                          label="M-Pesa"
                        />
                      ) : null}
                      {!IS_DESKTOP && kioskPayAvailable ? (
                        <PayMethodChip
                          active={payMethod === "kiosk_pay"}
                          onClick={() => setPayMethod("kiosk_pay")}
                          icon={<Store className="size-3" aria-hidden />}
                          label="Kiosk"
                        />
                      ) : null}
                      {canCreateRemoteBill ? (
                        <PayMethodChip
                          active={payMethod === "remote_bill"}
                          disabled={!online}
                          onClick={() => {
                            setSplitPay(false);
                            setCreditChangeToWallet(false);
                            setPayMethod("remote_bill");
                          }}
                          icon={<Send className="size-3" aria-hidden />}
                          label="Send bill"
                        />
                      ) : null}
                      {canLookupCustomers ? (
                        <PayMethodChip
                          active={payMethod === "customer_credit"}
                          disabled={Boolean(
                            selectedCustomer?.credit.creditSuspended,
                          )}
                          onClick={() => {
                            setSplitPay(false);
                            setCreditChangeToWallet(false);
                            setPayMethod("customer_credit");
                          }}
                          icon={<UserRound className="size-3" aria-hidden />}
                          label={
                            selectedCustomer?.credit.creditSuspended
                              ? "Tab suspended"
                              : "Tab"
                          }
                        />
                      ) : null}
                      {canLookupCustomers ? (
                        <PayMethodChip
                          active={payMethod === "customer_wallet"}
                          disabled={!online}
                          onClick={() => {
                            setSplitPay(false);
                            setCreditChangeToWallet(false);
                            setPayMethod("customer_wallet");
                          }}
                          icon={<Wallet className="size-3" aria-hidden />}
                          label="Wallet"
                        />
                      ) : null}
                      {canLookupCustomers ? (
                        <PayMethodChip
                          active={payMethod === "loyalty_redeem"}
                          disabled={!online}
                          onClick={() => {
                            setSplitPay(false);
                            setCreditChangeToWallet(false);
                            setPayMethod("loyalty_redeem");
                          }}
                          icon={<Gift className="size-3" aria-hidden />}
                          label="Loyalty"
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {showCustomerPicker ? (
                    <div className="space-y-2 rounded-xl border border-border/45 bg-card/80 p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {creditChangeToWallet
                          ? "Credit change to"
                          : payMethod === "remote_bill"
                            ? "Send bill to"
                            : splitPay
                              ? "Wallet customer"
                              : captureCustomerSimple
                                ? "Customer (optional)"
                                : "Customer"}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <input
                          className={fieldClass("h-9 min-w-0 flex-1 text-[13px]")}
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
                            (creditRegisterContext || captureCustomerSimple)
                              ? "Name or phone…"
                              : "Phone 2547… or 07…"
                          }
                          disabled={!online}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 shrink-0 rounded-lg px-2.5 text-xs font-semibold"
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
                        <p className="text-[10px] text-destructive">
                          {customerPhoneValidationMessage(customerPhoneQuery) ??
                            "Enter a valid phone number."}
                        </p>
                      ) : null}
                      {customerHits.length > 0 ? (
                        <ul className="max-h-24 space-y-0.5 overflow-y-auto">
                          {customerHits.map((c) => {
                            const hitPhone = customerPrimaryPhone(c.phones);
                            const phoneIssue = storedCustomerPhoneIssue(hitPhone);
                            return (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  className={cn(
                                    "w-full rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors",
                                    selectedCustomer?.id === c.id
                                      ? "bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] font-semibold"
                                      : "hover:bg-muted/50",
                                    phoneIssue && "ring-1 ring-destructive/40",
                                  )}
                                  onClick={() => setSelectedCustomer(c)}
                                >
                                  {c.name}
                                  <span
                                    className={cn(
                                      "ml-1",
                                      phoneIssue
                                        ? "text-destructive"
                                        : "text-muted-foreground",
                                    )}
                                  >
                                    {hitPhone}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                      {customerNoPhoneMatch &&
                      !selectedCustomer &&
                      customerPhoneQuery.trim() &&
                      !isValidCustomerPhone(customerPhoneQuery) &&
                      !captureCustomerSimple &&
                      (!creditRegisterContext || allowSearchCustomersByName) ? (
                        <p className="text-[10px] text-muted-foreground">
                          No match — try a phone number to register.
                        </p>
                      ) : null}
                      {((creditRegisterContext &&
                        isValidCustomerPhone(customerPhoneQuery)) ||
                        captureCustomerSimple) &&
                      customerNoPhoneMatch &&
                      !selectedCustomer &&
                      customerPhoneQuery.trim() ? (
                        <div className="space-y-2 rounded-lg border border-[color-mix(in_srgb,var(--pos-primary)_25%,var(--border))] bg-[color-mix(in_srgb,var(--pos-primary)_6%,transparent)] p-2.5">
                          <p className="text-[11px] font-semibold text-foreground">
                            {captureCustomerSimple
                              ? "Add new customer"
                              : "Register new number"}
                          </p>
                          {canManageCustomers ? (
                            <>
                              <input
                                className={fieldClass("h-9 w-full text-[13px]")}
                                value={customerRegisterName}
                                onChange={(e) =>
                                  setCustomerRegisterName(e.target.value)
                                }
                                placeholder="Full name"
                                disabled={
                                  !online ||
                                  customerRegisterBusy ||
                                  (registerNeedsOtp && phoneVerificationSent)
                                }
                              />
                              {captureCustomerSimple ? (
                                <input
                                  className={fieldClass("h-9 w-full text-[13px]")}
                                  value={customerRegisterPhone}
                                  onChange={(e) =>
                                    setCustomerRegisterPhone(e.target.value)
                                  }
                                  inputMode="tel"
                                  placeholder="Phone (optional)"
                                  disabled={!online || customerRegisterBusy}
                                />
                              ) : null}
                              {registerNeedsOtp && phoneVerificationSent ? (
                                <input
                                  className={fieldClass(
                                    "h-10 w-full text-center text-lg font-semibold tracking-[0.3em]",
                                  )}
                                  value={phoneVerificationCode}
                                  onChange={(e) =>
                                    setPhoneVerificationCode(
                                      e.target.value.replace(/\D/g, "").slice(0, 4),
                                    )
                                  }
                                  inputMode="numeric"
                                  placeholder="••••"
                                  aria-label="4-digit verification code"
                                  disabled={!online || customerRegisterBusy}
                                />
                              ) : null}
                              <Button
                                type="button"
                                className="h-9 w-full rounded-lg text-xs font-semibold"
                                disabled={
                                  !online ||
                                  customerRegisterBusy ||
                                  !customerRegisterName.trim() ||
                                  (registerNeedsOtp &&
                                    phoneVerificationSent &&
                                    phoneVerificationCode.length !== 4) ||
                                  (registerNeedsOtp &&
                                    !phoneVerificationSent &&
                                    Date.now() < phoneVerificationCooldownUntil) ||
                                  (customerRegisterPhone.trim().length > 0 &&
                                    !isValidCustomerPhone(customerRegisterPhone))
                                }
                                onClick={
                                  registerNeedsOtp && !phoneVerificationSent
                                    ? onSendPhoneVerification
                                    : onRegisterCustomer
                                }
                              >
                                {customerRegisterBusy
                                  ? "Working…"
                                  : registerNeedsOtp && !phoneVerificationSent
                                    ? "Send code"
                                    : captureCustomerSimple
                                      ? "Add customer"
                                      : "Register"}
                              </Button>
                            </>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">
                              No permission to register customers.
                            </p>
                          )}
                        </div>
                      ) : null}
                      {selectedCustomer ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-[12px]">
                          <p className="min-w-0 truncate font-semibold">
                            {selectedCustomer.name}
                            {selectedPhone ? (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                · {selectedPhone}
                              </span>
                            ) : null}
                          </p>
                          {captureCustomerSimple ? (
                            <button
                              type="button"
                              onClick={() => setSelectedCustomer(null)}
                              className="shrink-0 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {!splitPay && payMethod === "cash" ? (
                    <div className="space-y-2 rounded-xl border border-border/45 bg-card/80 p-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`Amount received in ${currency}`}
                          className={fieldClass(
                            "h-10 min-w-0 flex-1 text-right text-xl font-bold tabular-nums",
                          )}
                          value={cashTenderStr}
                          onChange={(e) => setCashTenderStr(e.target.value)}
                          placeholder="0.00"
                        />
                        <button
                          type="button"
                          className="shrink-0 rounded-lg border border-border/50 bg-background px-2.5 py-2 text-[11px] font-semibold text-[var(--pos-primary)] hover:bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)]"
                          onClick={() => {
                            const next = payableTotal.toFixed(2);
                            lastAutoTenderRef.current = next;
                            setCashTenderStr(next);
                          }}
                        >
                          Exact
                        </button>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-0.5">
                        {CASH_QUICK_AMOUNTS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setCashFromPicker(n)}
                            className="shrink-0 rounded-lg border border-border/50 bg-background px-2 py-1 text-[11px] font-semibold tabular-nums transition hover:border-[var(--pos-primary)] hover:text-[var(--pos-primary)]"
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      {!cashReady ? (
                        <p className="text-[11px] text-muted-foreground">
                          Enter amount received or tap Exact
                        </p>
                      ) : changeDueAmount > 0 ? (
                        <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          {creditChangeToWallet
                            ? selectedCustomer &&
                                Number(selectedCustomer.credit?.balanceOwed) > 0
                              ? `Apply ${cashChange} to tab, rest to wallet`
                              : `Park ${cashChange} ${currency} on wallet`
                            : `Give back ${cashChange} ${currency}`}
                        </p>
                      ) : null}
                      {cashReady && changeDueAmount > 0 && canLookupCustomers ? (
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px]",
                            creditChangeToWallet
                              ? "border-[color-mix(in_srgb,var(--pos-primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--pos-primary)_7%,transparent)]"
                              : "border-border/50 bg-background",
                            !online && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-3 rounded border-border/60 accent-[var(--pos-primary)]"
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
                          <span className="font-medium">
                            Credit change to wallet
                          </span>
                        </label>
                      ) : null}
                    </div>
                  ) : null}

                  {!splitPay && isStkTender(payMethod) ? (
                    <div className="space-y-2 rounded-xl border border-border/45 bg-card/80 p-2.5">
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
                    <div className="space-y-2 rounded-xl border border-border/45 bg-card/80 p-2.5">
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
                </section>

                {lines.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/55 py-6 text-center">
                    <ShoppingBag
                      className="size-5 text-muted-foreground/40"
                      aria-hidden
                    />
                    <p className="text-xs text-muted-foreground">
                      Tap products to build the cart
                    </p>
                  </div>
                ) : null}

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

            <div className="shrink-0 border-t border-border/40 bg-background/95 px-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
              {!branchSelected ? (
                <p className="mb-1.5 rounded-lg border border-amber-200/50 bg-amber-50/90 px-2.5 py-1.5 text-[11px] text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                  Pick a branch in the top nav to check out.
                </p>
              ) : null}
              {completeBlockedHint ? (
                <p className="mb-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  {completeBlockedHint}
                </p>
              ) : canCompleteSale ? (
                <p className="mb-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                  {payMethod === "remote_bill"
                    ? "Ready to send bill"
                    : "Ready to complete"}
                </p>
              ) : null}
              {allowClearSale && onClearSale && lines.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mb-1.5 h-9 w-full rounded-xl border-destructive/35 text-xs font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive"
                  disabled={loading}
                  onClick={onClearSale}
                >
                  Clear sale
                </Button>
              ) : null}
              <Button
                type="button"
                className={cn(
                  "h-12 w-full rounded-xl text-sm font-bold tracking-tight shadow-md transition-all duration-200",
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
