"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Loader2,
  Moon,
  Smartphone,
  Store,
  Sun,
  Wallet,
} from "lucide-react";

import { looksLikeKenyanMobilePath, toKenyanLocal07 } from "@/lib/kenyan-phone";
import {
  fetchPublicCustomerTab,
  fetchPublicTabStkStatus,
  initiatePublicTabStk,
  initiatePublicWalletStk,
  submitPublicTabManualPayment,
  type PublicCustomerTab,
  type PublicTabPurchaseRow,
} from "@/lib/public-customer-tab";
import { buildStorefrontThemeVars } from "@/lib/storefront-theme";
import { cn } from "@/lib/utils";
import {
  formatMoneyCompact,
  resolveCurrencyCode,
} from "@/lib/money";

type Branding = {
  shopName: string;
  primaryHex: string | null;
  accentHex: string | null;
  logoUrl: string | null;
};

type Props = {
  phoneSegment: string;
  branding: Branding;
};

type PayMode = "stk" | "manual";
type PortalTheme = "light" | "dark";

const THEME_STORAGE_KEY = "palmart-customer-tab-theme";

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmtMoney(amount: unknown, currency: string): string {
  return formatMoneyCompact(toNum(amount), resolveCurrencyCode(currency));
}

function fmtQty(v: unknown): string {
  const n = toNum(v);
  if (!Number.isFinite(n)) return "";
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("en", { maximumFractionDigits: 3 });
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fmtShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtRelativeVisit(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfVisit = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
    );
    const diffDays = Math.round(
      (startOfToday.getTime() - startOfVisit.getTime()) / 86_400_000,
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return fmtShortDate(iso);
  } catch {
    return iso;
  }
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("07")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

function shopPayLabel(shopName: string): string {
  const first = shopName.trim().split(/\s+/)[0];
  return first || "shop";
}

function readPortalTheme(): PortalTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "dark" || raw === "light") return raw;
  } catch {
    /* ignore */
  }
  return "light";
}

function persistPortalTheme(theme: PortalTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

/** Keeps fixed sheets above the on-screen keyboard on mobile browsers. */
function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      setInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(Math.max(0, Math.round(gap)));
    };

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [active]);

  return inset;
}

function scrollFieldIntoView(el: HTMLElement | null) {
  if (!el) return;
  window.requestAnimationFrame(() => {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

type TabStats = {
  purchaseCount: number;
  totalCredit: number;
  monthCount: number;
  monthAmount: number;
  lastPurchaseAt: string | null;
  avgPurchase: number;
};

function computeTabStats(purchases: PublicTabPurchaseRow[]): TabStats {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let totalCredit = 0;
  let monthCount = 0;
  let monthAmount = 0;
  let lastPurchaseAt: string | null = null;

  for (const purchase of purchases) {
    const amount = toNum(purchase.grandTotal) || toNum(purchase.creditAmount);
    totalCredit += amount;

    const soldAt = new Date(purchase.soldAt);
    if (!Number.isNaN(soldAt.getTime()) && soldAt >= monthStart) {
      monthCount += 1;
      monthAmount += amount;
    }

    if (
      !lastPurchaseAt ||
      soldAt.getTime() > new Date(lastPurchaseAt).getTime()
    ) {
      lastPurchaseAt = purchase.soldAt;
    }
  }

  return {
    purchaseCount: purchases.length,
    totalCredit,
    monthCount,
    monthAmount,
    lastPurchaseAt,
    avgPurchase: purchases.length > 0 ? totalCredit / purchases.length : 0,
  };
}

function portalSurfaceStyle(
  theme: PortalTheme,
  primary: string,
  storefrontVars: CSSProperties | undefined,
): CSSProperties {
  const isDark = theme === "dark";
  return {
    ...storefrontVars,
    ["--tab-bg" as string]: isDark ? "#0a0a0a" : "#e8e8e8",
    ["--tab-fg" as string]: isDark ? "#fafafa" : "#0a0a0a",
    ["--tab-muted" as string]: isDark ? "#a3a3a3" : "#525252",
    ["--tab-card" as string]: isDark ? "#141414" : "#ffffff",
    ["--tab-border" as string]: isDark ? "#2a2a2a" : "#cfcfcf",
    ["--tab-input" as string]: isDark ? "#0f0f0f" : "#ffffff",
    ["--tab-chip" as string]: isDark ? "#1a1a1a" : "#f5f5f5",
    ["--tab-cta-bg" as string]: isDark ? "#fafafa" : primary,
    ["--tab-cta-fg" as string]: isDark ? "#0a0a0a" : "#ffffff",
    ["--tab-success-fg" as string]: isDark ? "#86efac" : "#166534",
    ["--tab-success-bg" as string]: isDark ? "#052e16" : "#ecfdf5",
    ["--tab-error-fg" as string]: isDark ? "#fca5a5" : "#b91c1c",
    ["--tab-error-bg" as string]: isDark ? "#450a0a" : "#fef2f2",
    ["--tab-focus" as string]: primary,
    ["--primary" as string]: primary,
    backgroundColor: "var(--tab-bg)",
    color: "var(--tab-fg)",
    fontFeatureSettings: '"tnum" 1',
  };
}

const fieldClass =
  "w-full border border-[var(--tab-border)] bg-[var(--tab-input)] px-3 py-3 text-[17px] font-semibold tabular-nums outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-[var(--tab-focus)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_28%,transparent)] disabled:opacity-50";

const btnPrimaryClass =
  "flex w-full items-center justify-center gap-2 py-3.5 text-[15px] font-semibold transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tab-card)] active:opacity-85 disabled:cursor-not-allowed disabled:opacity-45";

const btnSecondaryClass =
  "flex w-full items-center justify-center gap-2 border border-[var(--tab-border)] py-3 text-[14px] font-medium text-[var(--tab-muted)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_28%,transparent)] active:bg-[var(--tab-bg)] disabled:opacity-45";

function PortalSkeleton() {
  return (
    <div className="flex flex-1 flex-col animate-pulse">
      <div className="border-b border-[var(--tab-border)] bg-[var(--tab-card)] px-4 py-8">
        <div className="h-3 w-28 bg-[var(--tab-border)]" />
        <div className="mt-4 h-10 w-48 bg-[var(--tab-border)]" />
        <div className="mt-5 h-3 w-40 bg-[var(--tab-border)]" />
      </div>
      <div className="border-b border-[var(--tab-border)] px-4 py-4">
        <div className="h-3 w-full max-w-xs bg-[var(--tab-border)]" />
      </div>
      <div className="mt-4 space-y-0 divide-y divide-[var(--tab-border)] border-y border-[var(--tab-border)] bg-[var(--tab-card)]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3.5">
            <div className="space-y-2">
              <div className="h-3.5 w-36 bg-[var(--tab-border)]" />
              <div className="h-2.5 w-24 bg-[var(--tab-border)]" />
            </div>
            <div className="h-3.5 w-16 bg-[var(--tab-border)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SheetHandle() {
  return (
    <div className="flex shrink-0 justify-center border-b border-[var(--tab-border)] py-2.5" aria-hidden>
      <div className="h-1 w-10 bg-[var(--tab-border)]" />
    </div>
  );
}

function PurchaseRow({
  row,
  currency,
}: {
  row: PublicTabPurchaseRow;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const lines = row.lines ?? [];
  const headline =
    lines.length === 0
      ? "Purchase"
      : lines.length === 1
        ? lines[0].itemName?.trim() || "Item"
        : `${lines[0].itemName?.trim() || "Item"} +${lines.length - 1}`;
  const walletCredited = toNum(row.walletCredited);
  const tabCharged = toNum(row.creditAmount);
  const displayAmount = toNum(row.grandTotal) || tabCharged;

  return (
    <li className="overflow-hidden border-b border-[var(--tab-border)] last:border-b-0 bg-[var(--tab-bg)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_35%,transparent)] active:bg-[var(--tab-bg)]"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[14px] font-semibold">{headline}</p>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-[var(--tab-muted)] transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--tab-muted)]">
            {fmtDate(row.soldAt)}
            {row.receiptNo != null ? <span> · #{row.receiptNo}</span> : null}
            {walletCredited > 0 ? (
              <span>
                {" "}
                · +{fmtMoney(walletCredited, currency)} wallet
              </span>
            ) : null}
            {tabCharged > 0 && walletCredited <= 0 ? (
              <span> · on tab</span>
            ) : null}
          </p>
        </div>
        <p className="shrink-0 text-[14px] font-semibold tabular-nums">
          {fmtMoney(displayAmount, currency)}
        </p>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          {lines.length > 0 ? (
            <ul className="space-y-2 border-t border-[var(--tab-border)] px-3.5 py-3">
              {lines.map((line, i) => (
                <li
                  key={`${row.saleId}-${i}`}
                  className="flex items-baseline justify-between gap-3 text-[13px]"
                >
                  <span className="min-w-0 text-[var(--tab-muted)]">
                    <span className="text-[var(--tab-fg)]">
                      {line.itemName?.trim() || "Item"}
                    </span>
                    {toNum(line.quantity) !== 1 ? (
                      <span className="ml-1.5 tabular-nums opacity-70">
                        ×{fmtQty(line.quantity)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--tab-muted)]">
                    {fmtMoney(line.lineTotal, currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function QuickAmountChips({
  owed,
  currency,
  amountNum,
  disabled,
  onPick,
}: {
  owed: number;
  currency: string;
  amountNum: number;
  disabled: boolean;
  onPick: (n: number) => void;
}) {
  const chips = [500, 1000, 2000].filter((n) => n < owed);

  if (chips.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {chips.map((n) => {
        const active = Math.abs(amountNum - n) < 0.01;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onPick(n)}
            className={cn(
              "border px-2 py-3 text-[13px] font-semibold tabular-nums transition active:scale-[0.98] disabled:opacity-40",
              active
                ? "border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                : "border-[var(--tab-border)] bg-[var(--tab-chip)] text-[var(--tab-fg)]",
            )}
          >
            {fmtMoney(n, currency)}
          </button>
        );
      })}
    </div>
  );
}

type PaySheetProps = {
  open: boolean;
  onClose: () => void;
  shopLabel: string;
  currency: string;
  owed: number;
  amount: string;
  setAmount: (v: string) => void;
  amountNum: number;
  amountValid: boolean;
  payPhone: string;
  setPayPhone: (v: string) => void;
  phoneOk: boolean;
  payMode: PayMode;
  setPayMode: (m: PayMode) => void;
  reference: string;
  setReference: (v: string) => void;
  payDisabled: boolean;
  manualPayDisabled: boolean;
  busy: boolean;
  promptSent: boolean;
  paid: boolean;
  manualSubmitted: boolean;
  manualCleared: boolean;
  statusMsg: string | null;
  error: string | null;
  onPay: () => void;
  onSubmitManual: () => void;
  onPickAmount: (n: number) => void;
  keyboardInset: number;
  fieldIdPrefix: string;
};

function PaySheet({
  open,
  onClose,
  shopLabel,
  currency,
  owed,
  amount,
  setAmount,
  amountNum,
  amountValid,
  payPhone,
  setPayPhone,
  phoneOk,
  payMode,
  setPayMode,
  reference,
  setReference,
  payDisabled,
  manualPayDisabled,
  busy,
  promptSent,
  paid,
  manualSubmitted,
  manualCleared,
  statusMsg,
  error,
  onPay,
  onSubmitManual,
  onPickAmount,
  keyboardInset,
  fieldIdPrefix,
}: PaySheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const amountId = `${fieldIdPrefix}-sheet-amount`;
  const phoneId = `${fieldIdPrefix}-sheet-phone`;
  const refId = `${fieldIdPrefix}-sheet-ref`;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${fieldIdPrefix}-pay-title`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close payment"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="relative flex max-h-[96dvh] w-full flex-col border-t-2 border-[var(--tab-border)] bg-[var(--tab-card)] motion-safe:animate-in motion-safe:slide-in-from-bottom-full motion-safe:duration-200 motion-safe:ease-out"
        style={{ paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom))` }}
      >
        <SheetHandle />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--tab-border)] px-4 py-4">
          <div className="min-w-0">
            <h2
              id={`${fieldIdPrefix}-pay-title`}
              className="text-[1.125rem] font-semibold leading-snug tracking-[-0.02em]"
            >
              Pay {shopLabel}
            </h2>
            <p className="mt-1 text-[14px] text-[var(--tab-muted)]">
              Outstanding{" "}
              <span className="font-semibold tabular-nums text-[var(--tab-fg)]">
                {fmtMoney(owed, currency)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center border border-[var(--tab-border)] text-[var(--tab-muted)] active:bg-[var(--tab-bg)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <QuickAmountChips
            owed={owed}
            currency={currency}
            amountNum={amountNum}
            disabled={payMode === "stk" ? payDisabled : manualPayDisabled}
            onPick={onPickAmount}
          />

          <div className="mt-4">
            <label
              htmlFor={amountId}
              className="mb-1.5 block text-[13px] font-medium text-[var(--tab-fg)]"
            >
              {payMode === "manual" ? "Amount you paid" : "Amount to pay"}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[var(--tab-muted)]">
                {resolveCurrencyCode(currency) === "KES"
                  ? "Ksh"
                  : resolveCurrencyCode(currency)}
              </span>
              <input
                id={amountId}
                type="number"
                inputMode="decimal"
                min={1}
                step="1"
                max={owed}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={payMode === "stk" ? payDisabled : manualPayDisabled}
                onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                className={cn(fieldClass, "pl-12 pr-3 text-[22px] font-bold")}
              />
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor={phoneId}
              className="mb-1.5 block text-[13px] font-medium text-[var(--tab-fg)]"
            >
              M-Pesa number
            </label>
            <p className="mb-2 text-[13px] leading-snug text-[var(--tab-muted)]">
              The payment prompt will be sent to this phone. Confirm or change it before you pay.
            </p>
            <input
              ref={phoneInputRef}
              id={phoneId}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
              value={payPhone}
              onChange={(e) => setPayPhone(e.target.value)}
              disabled={payMode === "stk" ? payDisabled : manualPayDisabled}
              onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
              className={cn(
                fieldClass,
                "text-[19px] font-bold tracking-wide",
                !phoneOk && payPhone.trim()
                  ? "border-[var(--tab-error-fg)] focus-visible:border-[var(--tab-error-fg)] focus-visible:ring-[color-mix(in_oklab,var(--tab-error-fg)_25%,transparent)]"
                  : "",
              )}
            />
            {!phoneOk && payPhone.trim() ? (
              <p className="mt-2 text-[13px] font-medium text-[var(--tab-error-fg)]">
                Enter a valid Kenyan mobile number (07… or 01…).
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-[var(--tab-muted)]">
                {formatPhoneDisplay(payPhone) || "No number entered"}
              </p>
            )}
          </div>

          {payMode === "manual" ? (
            <div className="mt-4">
              <label
                htmlFor={refId}
                className="mb-1.5 block text-[13px] font-medium text-[var(--tab-fg)]"
              >
                M-Pesa confirmation code{" "}
                <span className="font-normal text-[var(--tab-muted)]">(optional)</span>
              </label>
              <input
                id={refId}
                type="text"
                inputMode="text"
                autoComplete="off"
                placeholder="e.g. QGH1ABC234"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={manualPayDisabled}
                onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                className={cn(fieldClass, "text-[15px] uppercase tracking-wide")}
              />
            </div>
          ) : null}

          {error ? (
            <p
              className="mt-4 border border-[var(--tab-error-fg)] bg-[var(--tab-error-bg)] px-3 py-2.5 text-[13px] font-medium text-[var(--tab-error-fg)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {promptSent && payMode === "stk" && statusMsg ? (
            <p className="mt-4 border border-[var(--tab-border)] bg-[var(--tab-bg)] px-3 py-2.5 text-[13px] font-medium text-[var(--tab-fg)]">
              {statusMsg}
            </p>
          ) : null}

          {paid ? (
            <p className="mt-4 flex items-center gap-2 border border-[var(--tab-success-fg)] bg-[var(--tab-success-bg)] px-3 py-2.5 text-[13px] font-medium text-[var(--tab-success-fg)]">
              <CheckCircle2 className="size-4 shrink-0" />
              {statusMsg}
            </p>
          ) : null}

          {manualSubmitted ? (
            <p className="mt-4 border border-[var(--tab-border)] bg-[var(--tab-bg)] px-3 py-2.5 text-[13px] text-[var(--tab-muted)]">
              The shop will review your payment and update your balance.
            </p>
          ) : null}

          {manualCleared ? (
            <p className="mt-4 border border-[var(--tab-success-fg)] bg-[var(--tab-success-bg)] px-3 py-2.5 text-[13px] font-medium text-[var(--tab-success-fg)]">
              Payment cleared — balance updated.
            </p>
          ) : null}
        </div>

        <div className="shrink-0 space-y-2 border-t border-[var(--tab-border)] bg-[var(--tab-card)] px-4 py-3">
          {payMode === "stk" ? (
            <>
              <button
                type="button"
                disabled={payDisabled || !amountValid || !phoneOk}
                onClick={onPay}
                className={btnPrimaryClass}
                style={{
                  backgroundColor: "var(--tab-cta-bg)",
                  color: "var(--tab-cta-fg)",
                }}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending prompt…
                  </>
                ) : promptSent ? (
                  <>
                    <Smartphone className="size-4" />
                    Enter PIN on your phone
                  </>
                ) : (
                  <>
                    <Smartphone className="size-4" />
                    {amountValid
                      ? `Pay ${fmtMoney(amountNum, currency)} with M-Pesa`
                      : "Pay with M-Pesa"}
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={busy || promptSent || manualSubmitted}
                onClick={() => setPayMode("manual")}
                className={btnSecondaryClass}
              >
                <FileCheck2 className="size-4" />
                I already paid — report it
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={manualPayDisabled || !amountValid || manualSubmitted}
                onClick={onSubmitManual}
                className={btnPrimaryClass}
                style={{
                  backgroundColor: "var(--tab-cta-bg)",
                  color: "var(--tab-cta-fg)",
                }}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting…
                  </>
                ) : manualSubmitted ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    Submitted for review
                  </>
                ) : (
                  <>
                    <FileCheck2 className="size-4" />
                    {amountValid
                      ? `Submit ${fmtMoney(amountNum, currency)}`
                      : "Submit payment"}
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={busy || manualSubmitted}
                onClick={() => setPayMode("stk")}
                className={btnSecondaryClass}
              >
                <Smartphone className="size-4" />
                Pay with M-Pesa instead
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function CustomerTabPortal({ phoneSegment, branding }: Props) {
  const fieldIdPrefix = useId().replace(/:/g, "");
  const phone = useMemo(
    () => toKenyanLocal07(phoneSegment) ?? phoneSegment.trim(),
    [phoneSegment],
  );

  const [tab, setTab] = useState<PublicCustomerTab | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState("");
  const [payPhone, setPayPhone] = useState(phone);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>("stk");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [manualSubmitted, setManualSubmitted] = useState(false);
  const [manualBalanceAtSubmit, setManualBalanceAtSubmit] = useState<
    number | null
  >(null);
  const [manualCleared, setManualCleared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promptSent, setPromptSent] = useState(false);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [portalTheme, setPortalTheme] = useState<PortalTheme>("light");
  const walletSectionRef = useRef<HTMLElement | null>(null);
  const [walletAmount, setWalletAmount] = useState("500");
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletPromptSent, setWalletPromptSent] = useState(false);
  const [walletIntentId, setWalletIntentId] = useState<string | null>(null);
  const [walletStatusMsg, setWalletStatusMsg] = useState<string | null>(null);
  const [walletPaid, setWalletPaid] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletSheetOpen, setWalletSheetOpen] = useState(false);

  const payKeyboardInset = useKeyboardInset(paySheetOpen);
  const walletKeyboardInset = useKeyboardInset(walletSheetOpen);

  useEffect(() => {
    setMounted(true);
    setPortalTheme(readPortalTheme());
  }, []);

  const primary = branding.primaryHex || "#0b6e4f";
  const accent = branding.accentHex;
  const shopName = branding.shopName || "Shop";

  const storefrontVars = useMemo(
    () => buildStorefrontThemeVars(primary, accent),
    [primary, accent],
  );

  const surfaceStyle = useMemo(
    () => portalSurfaceStyle(portalTheme, primary, storefrontVars),
    [portalTheme, primary, storefrontVars],
  );

  const toggleTheme = useCallback(() => {
    setPortalTheme((current) => {
      const next: PortalTheme = current === "dark" ? "light" : "dark";
      persistPortalTheme(next);
      return next;
    });
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await fetchPublicCustomerTab(phone);
    if (!data) {
      setNotFound(true);
      setTab(null);
    } else {
      setNotFound(false);
      setTab(data);
      const nextOwed = toNum(data.balanceOwed);
      setAmount(nextOwed > 0 ? String(Math.round(nextOwed)) : "");
      const display =
        toKenyanLocal07(data.phoneDisplay) || data.phoneDisplay || phone;
      setPayPhone(display);
    }
    setLoading(false);
  }, [phone]);

  const silentReload = useCallback(async () => {
    const data = await fetchPublicCustomerTab(phone);
    if (!data) {
      return;
    }
    setNotFound(false);
    setTab(data);
    const nextOwed = toNum(data.balanceOwed);
    setAmount(nextOwed > 0 ? String(Math.round(nextOwed)) : "");
    const display =
      toKenyanLocal07(data.phoneDisplay) || data.phoneDisplay || phone;
    setPayPhone(display);
  }, [phone]);

  const applyTabSnapshot = useCallback(
    (balanceOwed: unknown, walletBalance?: unknown | null) => {
      setTab((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          balanceOwed: balanceOwed ?? prev.balanceOwed,
          walletBalance:
            walletBalance != null ? walletBalance : prev.walletBalance,
        };
      });
      const nextOwed = toNum(balanceOwed);
      setAmount(nextOwed > 0 ? String(Math.round(nextOwed)) : "");
    },
    [],
  );

  const refreshAfterPayment = useCallback(async () => {
    await silentReload();
    for (const delayMs of [1500, 3500]) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      await silentReload();
    }
  }, [silentReload]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!intentId || !promptSent || paid) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const st = await fetchPublicTabStkStatus(phone, intentId);
        if (cancelled) return;
        if (st.status === "fulfilled") {
          applyTabSnapshot(st.balanceOwed, st.walletBalance);
          setPaid(true);
          setStatusMsg("Payment received — asante!");
          setPromptSent(false);
          setIntentId(null);
          void refreshAfterPayment();
          return;
        }
        if (st.status === "failed") {
          setStatusMsg("Payment didn’t go through. Try again.");
          setPromptSent(false);
          setIntentId(null);
        }
      } catch {
        /* keep polling */
      }
    };
    const id = window.setInterval(() => void tick(), 2500);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [intentId, promptSent, paid, phone, applyTabSnapshot, refreshAfterPayment]);

  useEffect(() => {
    if (!walletIntentId || !walletPromptSent || walletPaid) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const st = await fetchPublicTabStkStatus(phone, walletIntentId);
        if (cancelled) return;
        if (st.status === "fulfilled") {
          applyTabSnapshot(st.balanceOwed, st.walletBalance);
          setWalletPaid(true);
          setWalletStatusMsg("Wallet topped up — asante!");
          setWalletPromptSent(false);
          setWalletIntentId(null);
          void refreshAfterPayment();
          return;
        }
        if (st.status === "failed") {
          setWalletStatusMsg("Top-up didn’t go through. Try again.");
          setWalletPromptSent(false);
          setWalletIntentId(null);
        }
      } catch {
        /* keep polling */
      }
    };
    const id = window.setInterval(() => void tick(), 2500);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [walletIntentId, walletPromptSent, walletPaid, phone, applyTabSnapshot, refreshAfterPayment]);

  useEffect(() => {
    if (!manualSubmitted || manualCleared) return;
    let cancelled = false;
    const tick = async () => {
      try {
        if (cancelled) return;
        await silentReload();
      } catch {
        /* ignore polling errors */
      }
    };
    const id = window.setInterval(() => void tick(), 2500);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [manualSubmitted, manualCleared, silentReload]);

  useEffect(() => {
    if (!manualSubmitted || manualCleared) return;
    if (manualBalanceAtSubmit == null) return;
    const owedNow = toNum(tab?.balanceOwed);
    if (!Number.isFinite(owedNow)) return;
    if (owedNow < manualBalanceAtSubmit - 0.001) {
      setManualCleared(true);
      setManualSubmitted(false);
      setManualBalanceAtSubmit(null);
      setStatusMsg(null);
    }
  }, [manualSubmitted, manualCleared, manualBalanceAtSubmit, tab?.balanceOwed]);

  const owed = toNum(tab?.balanceOwed);
  const wallet = toNum(tab?.walletBalance);
  const currency = tab?.currency || "KES";
  const displayShop = tab?.shopName || shopName;
  const firstName = tab?.customerName?.trim().split(/\s+/)[0] || null;
  const payDisabled = busy || promptSent || owed <= 0;
  const manualPayDisabled = busy || manualSubmitted || owed <= 0;
  const amountNum = Number.parseFloat(amount);
  const amountValid =
    Number.isFinite(amountNum) && amountNum > 0 && amountNum <= owed + 0.001;
  const walletAmountNum = Number.parseFloat(walletAmount);
  const walletAmountValid =
    Number.isFinite(walletAmountNum) && walletAmountNum >= 1;
  const walletTopUpDisabled = walletBusy || walletPromptSent;
  const showPay = owed > 0 && !loading && !notFound && mounted;
  const showWalletTopUp = !loading && !notFound && mounted && owed <= 0;
  const purchaseCount = tab?.purchases?.length ?? 0;
  const tabStats = useMemo(
    () => computeTabStats(tab?.purchases ?? []),
    [tab?.purchases],
  );
  const phoneOk = looksLikeKenyanMobilePath(payPhone);
  const payToName = shopPayLabel(displayShop);

  async function onPay() {
    setError(null);
    setStatusMsg(null);
    if (!looksLikeKenyanMobilePath(payPhone)) {
      setError("Enter a valid M-Pesa number e.g. 0712345678.");
      return;
    }
    if (!amountValid) {
      setError(
        !Number.isFinite(amountNum) || amountNum <= 0
          ? "Enter how much you want to pay."
          : `Max is ${fmtMoney(owed, currency)}.`,
      );
      return;
    }
    setBusy(true);
    try {
      const normalizedPay = toKenyanLocal07(payPhone) || payPhone.trim();
      const res = await initiatePublicTabStk(
        phone,
        amountNum,
        newIdempotencyKey(),
        normalizedPay,
      );
      setIntentId(res.intentId);
      setPromptSent(true);
      setPaid(false);
      setStatusMsg(`Check ${normalizedPay} and enter your M-Pesa PIN.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send M-Pesa prompt.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitManual() {
    setError(null);
    if (!amountValid) {
      setError(
        !Number.isFinite(amountNum) || amountNum <= 0
          ? "Enter how much you paid."
          : `Max is ${fmtMoney(owed, currency)}.`,
      );
      return;
    }
    setBusy(true);
    try {
      setManualCleared(false);
      setManualBalanceAtSubmit(owed);

      await submitPublicTabManualPayment(
        phone,
        amountNum,
        reference.trim() || undefined,
      );
      setManualSubmitted(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not submit payment report.",
      );
    } finally {
      setBusy(false);
    }
  }

  function pickAmount(n: number) {
    setAmount(String(Math.round(n * 100) / 100));
    setError(null);
  }

  async function onWalletTopUp() {
    setWalletError(null);
    setWalletStatusMsg(null);
    setWalletPaid(false);
    if (!looksLikeKenyanMobilePath(payPhone)) {
      setWalletError("Enter a valid M-Pesa number e.g. 0712345678.");
      return;
    }
    if (!walletAmountValid) {
      setWalletError("Enter how much to add to your wallet.");
      return;
    }
    setWalletBusy(true);
    try {
      const normalizedPay = toKenyanLocal07(payPhone) || payPhone.trim();
      const res = await initiatePublicWalletStk(
        phone,
        walletAmountNum,
        newIdempotencyKey(),
        normalizedPay,
      );
      setWalletIntentId(res.intentId);
      setWalletPromptSent(true);
      setWalletPaid(false);
      setWalletStatusMsg(`Check ${normalizedPay} and enter your M-Pesa PIN.`);
    } catch (e) {
      setWalletError(
        e instanceof Error ? e.message : "Could not send M-Pesa prompt.",
      );
    } finally {
      setWalletBusy(false);
    }
  }

  function pickWalletAmount(n: number) {
    setWalletAmount(String(Math.round(n * 100) / 100));
    setWalletError(null);
  }

  function openPaySheet() {
    setError(null);
    setPayMode("stk");
    setPaySheetOpen(true);
  }

  function closePaySheet() {
    if (busy || promptSent) return;
    setPaySheetOpen(false);
  }

  useEffect(() => {
    if (!paid) return;
    const t = window.setTimeout(() => {
      setPaySheetOpen(false);
      setPaid(false);
      setStatusMsg(null);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [paid]);

  useEffect(() => {
    if (!walletPaid) return;
    const t = window.setTimeout(() => {
      setWalletSheetOpen(false);
      setWalletPaid(false);
      setWalletStatusMsg(null);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [walletPaid]);

  return (
    <div
      className="min-h-[100dvh] antialiased touch-manipulation"
      style={surfaceStyle}
    >
      <div
        className="h-[2px] w-full shrink-0"
        style={{ backgroundColor: primary }}
        aria-hidden
      />
      <div
        className={cn(
          "mx-auto flex min-h-[calc(100dvh-2px)] w-full max-w-lg flex-col",
          showPay ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))]" : "",
        )}
      >
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--tab-border)] bg-[var(--tab-bg)] px-4 py-3 pt-[max(0.65rem,env(safe-area-inset-top))]">
          {branding.logoUrl ? (
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden border border-[var(--tab-border)] bg-[var(--tab-card)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.logoUrl}
                alt=""
                className="size-full object-contain p-1"
              />
            </div>
          ) : (
            <div
              className="flex size-10 shrink-0 items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: primary }}
              aria-hidden
            >
              {displayShop.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1rem] font-semibold leading-tight tracking-[-0.02em]">
              {displayShop}
            </h1>
            <p className="truncate text-[13px] text-[var(--tab-muted)]">
              {firstName && !loading && !notFound
                ? `${firstName}'s tab`
                : "Your tab"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {showWalletTopUp ? (
              <button
                type="button"
                onClick={() => setWalletSheetOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 border border-[var(--tab-border)] bg-[var(--tab-card)] px-2.5 text-[13px] font-medium text-[var(--tab-fg)] active:bg-[var(--tab-bg)]"
                aria-label={`Top up wallet · ${fmtMoney(wallet, currency)}`}
              >
                <Wallet className="size-3.5 shrink-0" aria-hidden />
                Top up
              </button>
            ) : null}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex size-9 shrink-0 items-center justify-center border border-[var(--tab-border)] bg-[var(--tab-card)] text-[var(--tab-fg)] active:bg-[var(--tab-bg)]"
              aria-label={
                portalTheme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
            >
              {portalTheme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
          </div>
        </header>

        {loading ? (
          <PortalSkeleton />
        ) : notFound ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
            <Store className="size-9 text-[var(--tab-muted)]" />
            <div>
              <h2 className="text-xl font-bold">Account not found</h2>
              <p className="mt-2 text-[15px] text-[var(--tab-muted)]">
                Ask the shop to check the phone number on file.
              </p>
            </div>
            <Link
              href="/shop"
              className="px-5 py-3 text-sm font-semibold"
              style={{
                backgroundColor: "var(--tab-cta-bg)",
                color: "var(--tab-cta-fg)",
              }}
            >
              Browse shop
            </Link>
          </div>
        ) : (
          <main className="flex flex-1 flex-col">
            <section
              ref={walletSectionRef}
              id="wallet"
              className="border-b border-[var(--tab-border)] bg-[var(--tab-card)] px-4 py-6"
            >
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-[1.75rem] font-semibold leading-none tabular-nums tracking-[-0.03em]">
                    {fmtMoney(owed, currency)}
                  </h2>
                  <p className="mt-2 text-[14px] text-[var(--tab-muted)]">
                    {owed > 0
                      ? `Balance owed to ${displayShop}`
                      : wallet > 0
                        ? "Nothing owed — wallet credit available"
                        : "Nothing owed"}
                  </p>
                </div>
                {wallet > 0 ? (
                  <div className="shrink-0 border border-[var(--tab-border)] bg-[var(--tab-bg)] px-3 py-2 text-right">
                    <p className="text-[13px] font-medium text-[var(--tab-muted)]">
                      Wallet
                    </p>
                    <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
                      {fmtMoney(wallet, currency)}
                    </p>
                  </div>
                ) : null}
              </div>
              {tabStats.purchaseCount > 0 ? (
                <p className="mt-5 text-[13px] leading-relaxed text-[var(--tab-muted)]">
                  {tabStats.purchaseCount} visit
                  {tabStats.purchaseCount === 1 ? "" : "s"}
                  {" · "}
                  {fmtMoney(tabStats.totalCredit, currency)} lifetime
                  {tabStats.lastPurchaseAt ? (
                    <>
                      {" · "}
                      Last visit{" "}
                      {fmtRelativeVisit(tabStats.lastPurchaseAt).toLowerCase()}
                    </>
                  ) : null}
                  {tabStats.monthAmount > 0 ? (
                    <>
                      {" · "}
                      {fmtMoney(tabStats.monthAmount, currency)} this month
                    </>
                  ) : null}
                </p>
              ) : (
                <p className="mt-5 text-[13px] text-[var(--tab-muted)]">
                  {wallet > 0
                    ? "Wallet ready for your next visit."
                    : "No purchases on this tab yet."}
                </p>
              )}
            </section>

            {owed <= 0 ? (
              <div className="mx-4 mt-4 flex items-center gap-2.5 border border-[var(--tab-success-fg)] bg-[var(--tab-success-bg)] px-3.5 py-3 text-[13px] font-medium text-[var(--tab-success-fg)]">
                <CheckCircle2 className="size-4 shrink-0" />
                {wallet > 0
                  ? `All clear — ${fmtMoney(wallet, currency)} wallet credit available.`
                  : "All settled — nothing owed."}
              </div>
            ) : null}

            {purchaseCount > 0 ? (
              <section className="mt-5 flex flex-1 flex-col">
                <div className="flex items-center justify-between border-y border-[var(--tab-border)] px-4 py-3">
                  <h3 className="text-[15px] font-semibold tracking-[-0.02em]">
                    Recent purchases
                  </h3>
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((open) => !open)}
                    className="text-[13px] font-medium text-[var(--tab-muted)]"
                  >
                    {historyOpen ? "Show less" : "Show all"}
                  </button>
                </div>
                <ul
                  className={cn(
                    "divide-y divide-[var(--tab-border)] border-b border-[var(--tab-border)] bg-[var(--tab-card)] transition-[max-height] duration-300 ease-out",
                    historyOpen ? "max-h-[2000px]" : "max-h-[280px] overflow-hidden",
                  )}
                >
                  {(historyOpen ? tab!.purchases : tab!.purchases.slice(0, 4)).map(
                    (row) => (
                      <PurchaseRow
                        key={row.saleId}
                        row={row}
                        currency={currency}
                      />
                    ),
                  )}
                </ul>
                {!historyOpen && purchaseCount > 4 ? (
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="border-b border-[var(--tab-border)] px-4 py-3 text-center text-[13px] font-medium text-[var(--tab-muted)] active:bg-[var(--tab-card)]"
                  >
                    View all {purchaseCount} purchases
                  </button>
                ) : null}
              </section>
            ) : null}
          </main>
        )}

        {showPay ? (
          <div
            className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[var(--tab-border)] bg-[var(--tab-card)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            style={{ maxWidth: "32rem", marginInline: "auto" }}
          >
            <p className="mb-2 text-[13px] text-[var(--tab-muted)]">
              {fmtMoney(owed, currency)} owed · M-Pesa
            </p>
            <button
              type="button"
              onClick={openPaySheet}
              className={btnPrimaryClass}
              style={{
                backgroundColor: "var(--tab-cta-bg)",
                color: "var(--tab-cta-fg)",
              }}
            >
              <Smartphone className="size-4" />
              {amountValid
                ? `Pay ${fmtMoney(amountNum, currency)} with M-Pesa`
                : "Pay with M-Pesa"}
            </button>
          </div>
        ) : null}
      </div>

      <PaySheet
        open={paySheetOpen}
        onClose={closePaySheet}
        shopLabel={payToName}
        currency={currency}
        owed={owed}
        amount={amount}
        setAmount={(v) => {
          setAmount(v);
          setError(null);
        }}
        amountNum={amountNum}
        amountValid={amountValid}
        payPhone={payPhone}
        setPayPhone={(v) => {
          setPayPhone(v);
          setError(null);
        }}
        phoneOk={phoneOk}
        payMode={payMode}
        setPayMode={(m) => {
          setPayMode(m);
          setError(null);
          if (m === "manual") setManualCleared(false);
        }}
        reference={reference}
        setReference={(v) => {
          setReference(v);
          setError(null);
        }}
        payDisabled={payDisabled}
        manualPayDisabled={manualPayDisabled}
        busy={busy}
        promptSent={promptSent}
        paid={paid}
        manualSubmitted={manualSubmitted}
        manualCleared={manualCleared}
        statusMsg={statusMsg}
        error={error}
        onPay={() => void onPay()}
        onSubmitManual={() => void onSubmitManual()}
        onPickAmount={pickAmount}
        keyboardInset={payKeyboardInset}
        fieldIdPrefix={fieldIdPrefix}
      />

      {/* Wallet top-up sheet */}
      {walletSheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Top up wallet"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close"
            onClick={() => {
              if (!walletBusy && !walletPromptSent) setWalletSheetOpen(false);
            }}
          />
          <div
            className="relative flex max-h-[92dvh] w-full flex-col border-t-2 border-[var(--tab-border)] bg-[var(--tab-card)] motion-safe:animate-in motion-safe:slide-in-from-bottom-full motion-safe:duration-200 motion-safe:ease-out"
            style={{
              paddingBottom: `max(${walletKeyboardInset}px, env(safe-area-inset-bottom))`,
            }}
          >
            <SheetHandle />
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--tab-border)] px-4 py-4">
              <div>
                <h2 className="text-[1.125rem] font-semibold tracking-[-0.02em]">
                  Top up wallet
                </h2>
                <p className="mt-1 text-[14px] text-[var(--tab-muted)]">
                  Current balance{" "}
                  <span className="font-semibold tabular-nums text-[var(--tab-fg)]">
                    {fmtMoney(wallet, currency)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!walletBusy && !walletPromptSent) setWalletSheetOpen(false);
                }}
                className="flex size-9 items-center justify-center border border-[var(--tab-border)] text-[var(--tab-muted)]"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="grid grid-cols-4 gap-2">
                {[100, 200, 500, 1000].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={walletTopUpDisabled}
                    onClick={() => pickWalletAmount(n)}
                    className={cn(
                      "border py-2.5 text-[12px] font-bold tabular-nums disabled:opacity-40",
                      Math.abs(walletAmountNum - n) < 0.001
                        ? "border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                        : "border-[var(--tab-border)] bg-[var(--tab-input)]",
                    )}
                  >
                    {fmtMoney(n, currency)}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <label
                  htmlFor={`${fieldIdPrefix}-wallet-amount`}
                  className="mb-1.5 block text-[13px] font-medium text-[var(--tab-fg)]"
                >
                  Amount to add
                </label>
                <input
                  id={`${fieldIdPrefix}-wallet-amount`}
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={walletAmount}
                  onChange={(e) => {
                    setWalletAmount(e.target.value);
                    setWalletError(null);
                  }}
                  disabled={walletTopUpDisabled}
                  onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                  className={cn(fieldClass, "text-[22px] font-bold")}
                />
              </div>
              <div className="mt-5">
                <label
                  htmlFor={`${fieldIdPrefix}-wallet-phone`}
                  className="mb-1.5 block text-[13px] font-medium text-[var(--tab-fg)]"
                >
                  M-Pesa number
                </label>
                <input
                  id={`${fieldIdPrefix}-wallet-phone`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={payPhone}
                  onChange={(e) => {
                    setPayPhone(e.target.value);
                    setWalletError(null);
                  }}
                  disabled={walletTopUpDisabled}
                  onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                  className={cn(fieldClass, "text-[18px] font-bold tracking-wide")}
                />
              </div>
              {walletStatusMsg ? (
                <p className="mt-4 border border-[var(--tab-border)] bg-[var(--tab-bg)] px-3 py-2 text-[13px]">
                  {walletStatusMsg}
                </p>
              ) : null}
              {walletError ? (
                <p className="mt-4 border border-[var(--tab-error-fg)] bg-[var(--tab-error-bg)] px-3 py-2 text-[13px] text-[var(--tab-error-fg)]">
                  {walletError}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 border-t border-[var(--tab-border)] px-4 py-3">
              <button
                type="button"
                disabled={walletTopUpDisabled || !walletAmountValid || !phoneOk}
                onClick={() => void onWalletTopUp()}
                className={btnPrimaryClass}
                style={{
                  backgroundColor: "var(--tab-cta-bg)",
                  color: "var(--tab-cta-fg)",
                }}
              >
                {walletBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending…
                  </>
                ) : walletPromptSent ? (
                  "Waiting for M-Pesa…"
                ) : (
                  <>
                    <Smartphone className="size-4" />
                    Top up {fmtMoney(walletAmountNum, currency)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
