"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  History,
  Loader2,
  Receipt,
  Smartphone,
  Store,
} from "lucide-react";

import { looksLikeKenyanMobilePath, toKenyanLocal07 } from "@/lib/kenyan-phone";
import {
  fetchPublicCustomerTab,
  fetchPublicTabStkStatus,
  initiatePublicTabStk,
  submitPublicTabManualPayment,
  type PublicCustomerTab,
  type PublicTabPurchaseRow,
} from "@/lib/public-customer-tab";
import { cn } from "@/lib/utils";

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

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmtMoney(amount: unknown, currency: string): string {
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency.length >= 3 ? currency : "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(toNum(amount));
  } catch {
    return `${currency} ${toNum(amount).toFixed(2)}`;
  }
}

function fmtQty(v: unknown): string {
  const n = toNum(v);
  if (!Number.isFinite(n)) return "";
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("en-KE", { maximumFractionDigits: 3 });
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-KE", {
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

function PurchaseRow({
  row,
  currency,
  defaultOpen,
}: {
  row: PublicTabPurchaseRow;
  currency: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const lines = row.lines ?? [];
  const headline =
    lines.length === 0
      ? "Purchase"
      : lines.length === 1
        ? lines[0].itemName?.trim() || "Item"
        : `${lines[0].itemName?.trim() || "Item"} +${lines.length - 1}`;

  return (
    <li className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(28,25,23,0.06)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-start gap-3 p-4 text-left active:bg-stone-50"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-[15px] font-medium tracking-tight text-stone-900">
              {headline}
            </p>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-stone-400 transition-transform duration-250 group-hover:text-stone-600",
                open && "rotate-180",
              )}
            />
          </div>
          <p className="mt-1 text-[12px] tracking-wide text-stone-500">
            {fmtDate(row.soldAt)}
            {row.receiptNo != null ? (
              <span className="text-stone-400"> · #{row.receiptNo}</span>
            ) : null}
          </p>
        </div>
        <p className="shrink-0 pt-0.5 text-[15px] font-semibold tabular-nums tracking-tight text-stone-900">
          {fmtMoney(row.creditAmount, currency)}
        </p>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          {lines.length > 0 ? (
            <ul className="mb-1 space-y-2 border-t border-stone-100 px-4 pb-4 pt-2">
              {lines.map((line, i) => (
                <li
                  key={`${row.saleId}-${i}`}
                  className="flex items-baseline justify-between gap-4 text-[13px]"
                >
                  <span className="min-w-0 text-stone-600">
                    <span className="text-stone-800">
                      {line.itemName?.trim() || "Item"}
                    </span>
                    {toNum(line.quantity) !== 1 ? (
                      <span className="ml-1.5 tabular-nums text-stone-400">
                        ×{fmtQty(line.quantity)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-stone-500">
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

type PayMode = "stk" | "manual";
type AppScreen = "purchases" | "pay";

function BottomTabBar({
  screen,
  setScreen,
  purchaseCount,
  owed,
  currency,
  primary,
  showPay,
}: {
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;
  purchaseCount: number;
  owed: number;
  currency: string;
  primary: string;
  showPay: boolean;
}) {
  const tabBase =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition active:opacity-70";

  return (
    <nav
      className="flex shrink-0 border-t border-stone-200 bg-white pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1"
      aria-label="Main"
    >
      <button
        type="button"
        onClick={() => setScreen("purchases")}
        className={cn(
          tabBase,
          screen === "purchases" ? "text-stone-900" : "text-stone-400",
        )}
        aria-current={screen === "purchases" ? "page" : undefined}
      >
        <History className="size-5" strokeWidth={screen === "purchases" ? 2.25 : 1.75} />
        Purchases
        {purchaseCount > 0 ? (
          <span className="tabular-nums text-[10px] text-stone-400">
            {purchaseCount}
          </span>
        ) : null}
      </button>
      {showPay ? (
        <button
          type="button"
          onClick={() => setScreen("pay")}
          className={cn(
            tabBase,
            screen === "pay" ? "font-semibold" : "text-stone-400",
          )}
          style={screen === "pay" ? { color: primary } : undefined}
          aria-current={screen === "pay" ? "page" : undefined}
        >
          <Smartphone className="size-5" strokeWidth={screen === "pay" ? 2.25 : 1.75} />
          Pay
          <span className="tabular-nums text-[10px] font-semibold">
            {fmtMoney(owed, currency)}
          </span>
        </button>
      ) : null}
    </nav>
  );
}

function PayModeToggle({
  mode,
  setMode,
  disabled,
  primary,
}: {
  mode: PayMode;
  setMode: (m: PayMode) => void;
  disabled: boolean;
  primary: string;
}) {
  return (
    <div
      className="flex gap-1 rounded-2xl bg-stone-100 p-1"
      role="tablist"
      aria-label="Payment method"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "stk"}
        disabled={disabled}
        onClick={() => setMode("stk")}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-45",
          mode === "stk"
            ? "bg-white text-stone-900 shadow-sm"
            : "text-stone-600",
        )}
      >
        <Smartphone className="size-4 shrink-0" />
        M-Pesa
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "manual"}
        disabled={disabled}
        onClick={() => setMode("manual")}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-45",
          mode === "manual"
            ? "bg-white shadow-sm"
            : "text-stone-600",
        )}
        style={mode === "manual" ? { color: primary } : undefined}
      >
        <Receipt className="size-4 shrink-0" />
        Already paid
      </button>
    </div>
  );
}

function QuickAmounts({
  owed,
  currency,
  amountNum,
  disabled,
  primary,
  onPick,
}: {
  owed: number;
  currency: string;
  amountNum: number;
  disabled: boolean;
  primary: string;
  onPick: (n: number) => void;
}) {
  const chips: number[] = [];
  if (owed > 0) chips.push(owed);
  for (const n of [500, 1000, 2000]) {
    if (n < owed && !chips.includes(n)) chips.push(n);
  }
  chips.sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((n) => {
        const active = Math.abs(amountNum - n) < 0.01;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onPick(n)}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-semibold tabular-nums transition active:scale-95 disabled:opacity-40",
              active
                ? "text-white shadow-sm"
                : "bg-stone-100 text-stone-700",
            )}
            style={
              active
                ? { backgroundColor: primary }
                : undefined
            }
          >
            {n === owed ? "Pay all" : fmtMoney(n, currency)}
          </button>
        );
      })}
    </div>
  );
}

function ManualPayPanel({
  currency,
  amount,
  setAmount,
  reference,
  setReference,
  owed,
  payDisabled,
  amountValid,
  amountNum,
  busy,
  submitted,
  error,
  primary,
  onSubmit,
  onClearError,
  fieldIdPrefix,
}: {
  currency: string;
  amount: string;
  setAmount: (v: string) => void;
  reference: string;
  setReference: (v: string) => void;
  owed: number;
  payDisabled: boolean;
  amountValid: boolean;
  amountNum: number;
  busy: boolean;
  submitted: boolean;
  error: string | null;
  primary: string;
  onSubmit: () => void;
  onClearError: () => void;
  fieldIdPrefix: string;
}) {
  const amountId = `${fieldIdPrefix}-amount`;
  const refId = `${fieldIdPrefix}-ref`;

  return (
    <div className="space-y-3">
      <QuickAmounts
        owed={owed}
        currency={currency}
        amountNum={amountNum}
        disabled={payDisabled || submitted}
        primary={primary}
        onPick={(n) => {
          setAmount(String(Math.round(n * 100) / 100));
          onClearError();
        }}
      />

      <div className="relative">
        <label htmlFor={amountId} className="sr-only">
          Amount paid
        </label>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-medium text-stone-400">
          {currency}
        </span>
        <input
          id={amountId}
          type="number"
          inputMode="decimal"
          min={1}
          step="1"
          max={owed}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            onClearError();
          }}
          disabled={payDisabled || submitted}
          className="w-full rounded-2xl border-0 bg-stone-100 py-4 pl-14 pr-4 text-2xl font-bold tabular-nums text-stone-900 outline-none ring-2 ring-transparent transition focus:bg-white focus:ring-[color-mix(in_oklab,var(--tab-primary)_35%,transparent)] disabled:opacity-55"
        />
      </div>

      <div>
        <label
          htmlFor={refId}
          className="mb-2 block text-[13px] font-medium text-stone-600"
        >
          M-Pesa code <span className="text-stone-400">(optional)</span>
        </label>
        <input
          id={refId}
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="e.g. QGH1ABC234"
          value={reference}
          onChange={(e) => {
            setReference(e.target.value);
            onClearError();
          }}
          disabled={payDisabled || submitted}
          className="w-full rounded-2xl border-0 bg-stone-100 px-4 py-3.5 text-[16px] uppercase tracking-wide text-stone-900 outline-none ring-2 ring-transparent transition focus:bg-white focus:ring-[color-mix(in_oklab,var(--tab-primary)_35%,transparent)] disabled:opacity-55"
        />
      </div>

      <button
        type="button"
        disabled={payDisabled || !amountValid || submitted}
        onClick={onSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-45"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, color-mix(in oklab, ${primary} 78%, #0a2018) 100%)`,
          boxShadow: `0 10px 28px -12px color-mix(in oklab, ${primary} 65%, transparent)`,
        }}
      >
        {busy ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Submitting…
          </>
        ) : submitted ? (
          <>
            <CheckCircle2 className="size-5" />
            Submitted for review
          </>
        ) : (
          <>
            <Receipt className="size-5 opacity-90" />
            {amountValid
              ? `Submit ${fmtMoney(amountNum, currency)} payment`
              : "Submit payment"}
          </>
        )}
      </button>

      {submitted ? (
        <div className="flex items-start gap-2 text-[13px] leading-snug text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          The shop will review your payment and update your balance.
        </div>
      ) : null}

      {error ? (
        <p className="text-[13px] font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PayPanel({
  currency,
  phone,
  payPhone,
  setPayPhone,
  amount,
  setAmount,
  owed,
  payDisabled,
  amountValid,
  amountNum,
  busy,
  promptSent,
  paid,
  statusMsg,
  error,
  primary,
  onPay,
  onClearError,
  fieldIdPrefix,
}: {
  currency: string;
  phone: string;
  payPhone: string;
  setPayPhone: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  owed: number;
  payDisabled: boolean;
  amountValid: boolean;
  amountNum: number;
  busy: boolean;
  promptSent: boolean;
  paid: boolean;
  statusMsg: string | null;
  error: string | null;
  primary: string;
  onPay: () => void;
  onClearError: () => void;
  fieldIdPrefix: string;
}) {
  const inputId = `${fieldIdPrefix}-amount`;
  const phoneId = `${fieldIdPrefix}-phone`;
  const phoneOk = looksLikeKenyanMobilePath(payPhone);

  return (
    <div className="space-y-3">
      <QuickAmounts
        owed={owed}
        currency={currency}
        amountNum={amountNum}
        disabled={payDisabled}
        primary={primary}
        onPick={(n) => {
          setAmount(String(Math.round(n * 100) / 100));
          onClearError();
        }}
      />

      <div>
        <label htmlFor={phoneId} className="mb-2 block text-[13px] font-medium text-stone-600">
          M-Pesa number
        </label>
        <div className="relative">
          <Smartphone className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-stone-400" />
          <input
            id={phoneId}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0712 345 678"
            value={payPhone}
            onChange={(e) => {
              setPayPhone(e.target.value);
              onClearError();
            }}
            disabled={payDisabled}
            className="w-full rounded-2xl border-0 bg-stone-100 py-3.5 pl-12 pr-4 text-[16px] font-medium tabular-nums text-stone-900 outline-none ring-2 ring-transparent transition focus:bg-white focus:ring-[color-mix(in_oklab,var(--tab-primary)_35%,transparent)] disabled:opacity-55"
          />
        </div>
      </div>

      <div className="relative">
        <label htmlFor={inputId} className="sr-only">
          Amount
        </label>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-medium text-stone-400">
          {currency}
        </span>
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={1}
          step="1"
          max={owed}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            onClearError();
          }}
          disabled={payDisabled}
          className="w-full rounded-2xl border-0 bg-stone-100 py-4 pl-14 pr-4 text-2xl font-bold tabular-nums text-stone-900 outline-none ring-2 ring-transparent transition focus:bg-white focus:ring-[color-mix(in_oklab,var(--tab-primary)_35%,transparent)] disabled:opacity-55"
        />
      </div>

      <button
        type="button"
        disabled={payDisabled || !amountValid || !phoneOk}
        onClick={onPay}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-45"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, color-mix(in oklab, ${primary} 78%, #0a2018) 100%)`,
          boxShadow: `0 10px 28px -12px color-mix(in oklab, ${primary} 65%, transparent)`,
        }}
      >
        {busy ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Sending prompt…
          </>
        ) : promptSent ? (
          <>
            <Smartphone className="size-5 animate-pulse" />
            Enter PIN on your phone
          </>
        ) : (
          <>
            <Smartphone className="size-5 opacity-90" />
            {amountValid
              ? `Pay ${fmtMoney(amountNum, currency)}`
              : "Pay with M-Pesa"}
          </>
        )}
      </button>

      {promptSent ? (
        <div
          className="flex items-start gap-2 text-[13px] leading-snug"
          style={{ color: primary }}
        >
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current animate-pulse" />
          {statusMsg}
        </div>
      ) : null}

      {paid ? (
        <div className="flex items-center gap-2 text-[13px] font-medium text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0" />
          {statusMsg}
        </div>
      ) : null}

      {error ? (
        <p className="text-[13px] font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
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
  const [payMode, setPayMode] = useState<PayMode>("stk");
  const [appScreen, setAppScreen] = useState<AppScreen>("purchases");
  const [reference, setReference] = useState("");
  const [manualSubmitted, setManualSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promptSent, setPromptSent] = useState(false);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const primary = branding.primaryHex || "#0b6e4f";
  const shopName = branding.shopName || "Shop";

  const themeStyle = useMemo(
    (): CSSProperties =>
      ({
        "--tab-primary": primary,
      }) as CSSProperties,
    [primary],
  );

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
          setPaid(true);
          setStatusMsg("Payment received — asante!");
          setPromptSent(false);
          setAppScreen("purchases");
          void reload();
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
  }, [intentId, promptSent, paid, phone, reload]);

  const owed = toNum(tab?.balanceOwed);
  const currency = tab?.currency || "KES";
  const displayShop = tab?.shopName || shopName;
  const firstName = tab?.customerName?.trim().split(/\s+/)[0] || null;
  const payDisabled = busy || promptSent || owed <= 0;
  const manualPayDisabled = busy || manualSubmitted || owed <= 0;
  const amountNum = Number.parseFloat(amount);
  const amountValid =
    Number.isFinite(amountNum) && amountNum > 0 && amountNum <= owed + 0.001;
  const showPay = owed > 0 && !loading && !notFound && mounted;
  const purchaseCount = tab?.purchases?.length ?? 0;

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

  const payProps = {
    currency,
    phone,
    payPhone,
    setPayPhone,
    amount,
    setAmount,
    owed,
    payDisabled,
    amountValid,
    amountNum,
    busy,
    promptSent,
    paid,
    statusMsg,
    error,
    primary,
    onPay: () => void onPay(),
    onClearError: () => setError(null),
    fieldIdPrefix: `${fieldIdPrefix}-stk`,
  };

  const manualPayProps = {
    currency,
    amount,
    setAmount,
    reference,
    setReference,
    owed,
    payDisabled: manualPayDisabled,
    amountValid,
    amountNum,
    busy,
    submitted: manualSubmitted,
    error,
    primary,
    onSubmit: () => void onSubmitManual(),
    onClearError: () => setError(null),
    fieldIdPrefix: `${fieldIdPrefix}-manual`,
  };

  const modeToggleProps = {
    mode: payMode,
    setMode: (m: PayMode) => {
      setPayMode(m);
      setError(null);
    },
    disabled: busy || promptSent || manualSubmitted,
    primary,
  };

  return (
    <div
      className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-[#f0ebe3] font-sans text-stone-900 antialiased touch-manipulation sm:max-w-lg"
      style={themeStyle}
    >
      {/* Compact app header — balance on the right */}
      <header className="shrink-0 border-b border-stone-900/[0.06] bg-[#f0ebe3] px-4 pb-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <div className="flex h-11 w-[4.5rem] shrink-0 items-center justify-center bg-[#f0ebe3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.logoUrl}
                alt=""
                className="max-h-11 w-full object-contain object-left"
                style={{ mixBlendMode: "multiply" }}
              />
            </div>
          ) : (
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
              style={{ backgroundColor: primary }}
              aria-hidden
            >
              {displayShop.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[14px] font-semibold leading-tight text-stone-900">
              {displayShop}
            </h1>
            <p className="truncate text-[12px] text-stone-500">
              {firstName && !loading && !notFound ? `Hi ${firstName} · ` : null}
              {phone}
            </p>
          </div>
          {!loading && !notFound ? (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                {owed > 0 ? "You owe" : "Balance"}
              </p>
              <p
                className="text-[1.35rem] font-bold leading-tight tabular-nums"
                style={{ color: primary }}
              >
                {fmtMoney(owed, currency)}
              </p>
            </div>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin" style={{ color: primary }} />
          <p className="text-sm text-stone-500">Loading…</p>
        </div>
      ) : notFound ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <Store className="size-10 text-stone-400" />
          <div>
            <h2 className="text-lg font-semibold">No tab found</h2>
            <p className="mt-2 text-[15px] text-stone-600">
              Ask the shop to check your phone number.
            </p>
          </div>
          <Link
            href="/shop"
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: primary }}
          >
            Browse shop
          </Link>
        </div>
      ) : (
        <>
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {appScreen === "purchases" ? (
              <div className="px-4 py-3">
                {owed <= 0 ? (
                  <div className="mb-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-[14px] font-medium text-emerald-800">
                    <CheckCircle2 className="size-4 shrink-0" />
                    All paid up — nothing owed.
                  </div>
                ) : null}
                {purchaseCount === 0 ? (
                  <p className="py-16 text-center text-sm text-stone-500">
                    No purchases yet
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {tab!.purchases.map((row) => (
                      <PurchaseRow
                        key={row.saleId}
                        row={row}
                        currency={currency}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ) : showPay ? (
              <div className="px-4 py-4">
                <PayModeToggle {...modeToggleProps} />
                <div className="mt-4">
                  {payMode === "stk" ? (
                    <PayPanel {...payProps} />
                  ) : (
                    <ManualPayPanel {...manualPayProps} />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                <CheckCircle2 className="size-10 text-emerald-600" />
                <p className="font-medium text-stone-800">Nothing to pay</p>
              </div>
            )}
          </main>

          <BottomTabBar
            screen={appScreen}
            setScreen={setAppScreen}
            purchaseCount={purchaseCount}
            owed={owed}
            currency={currency}
            primary={primary}
            showPay={showPay}
          />
        </>
      )}
    </div>
  );
}
