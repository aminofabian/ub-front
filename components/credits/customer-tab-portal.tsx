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
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-start gap-4 py-4 text-left transition-colors"
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
            <ul className="mb-4 space-y-2.5 border-l border-stone-900/10 pl-4">
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
  const base =
    "flex-1 rounded-lg py-2 text-[13px] font-semibold transition disabled:opacity-45";
  return (
    <div
      className="mb-1 flex gap-1 rounded-xl bg-stone-900/[0.06] p-1 sm:mb-0"
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
          base,
          mode === "stk"
            ? "bg-white text-stone-900 shadow-sm"
            : "text-stone-600 hover:text-stone-900",
        )}
      >
        M-Pesa prompt
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "manual"}
        disabled={disabled}
        onClick={() => setMode("manual")}
        className={cn(
          base,
          mode === "manual"
            ? "bg-white text-stone-900 shadow-sm"
            : "text-stone-600 hover:text-stone-900",
        )}
        style={mode === "manual" ? { color: primary } : undefined}
      >
        Already paid
      </button>
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
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 sm:tracking-[0.18em]">
          <span className="sm:hidden">Amount paid</span>
          <span className="hidden sm:inline">Report a payment</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setAmount(String(Math.round(owed * 100) / 100));
            onClearError();
          }}
          disabled={payDisabled || submitted}
          className="text-[11px] font-semibold underline-offset-2 hover:underline disabled:opacity-40 sm:text-[12px]"
          style={{ color: primary }}
        >
          <span className="sm:hidden">Full · {fmtMoney(owed, currency)}</span>
          <span className="hidden sm:inline">Use full balance</span>
        </button>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-stone-400">
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
          className={cn(
            "w-full border border-stone-900/10 bg-white/90 pl-14 pr-4 font-semibold tabular-nums text-stone-900 outline-none transition",
            "rounded-xl py-3 text-xl focus:border-transparent focus:ring-2 disabled:opacity-55 sm:py-3.5 sm:text-2xl",
          )}
          style={{ ["--tw-ring-color" as string]: primary }}
        />
      </div>

      <div>
        <label
          htmlFor={refId}
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500"
        >
          M-Pesa code <span className="font-normal normal-case text-stone-400">(optional)</span>
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
          className={cn(
            "w-full border border-stone-900/10 bg-white/90 px-4 py-3 text-[15px] uppercase tracking-wide text-stone-900 outline-none transition",
            "rounded-xl focus:border-transparent focus:ring-2 disabled:opacity-55",
          )}
          style={{ ["--tw-ring-color" as string]: primary }}
        />
      </div>

      <button
        type="button"
        disabled={payDisabled || !amountValid || submitted}
        onClick={onSubmit}
        className={cn(
          "relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-[15px] font-semibold text-white transition sm:py-4 sm:text-base",
          "active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45",
        )}
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

      {!submitted && !error ? (
        <p className="hidden text-center text-[12px] leading-relaxed text-stone-500 sm:block">
          Paid the till or paybill directly? Enter what you sent — staff will
          confirm before your balance updates.
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
    <div className="space-y-3 sm:space-y-3">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 sm:tracking-[0.18em]">
          <span className="sm:hidden">Pay</span>
          <span className="hidden sm:inline">Settle with M-Pesa</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setAmount(String(Math.round(owed * 100) / 100));
            onClearError();
          }}
          disabled={payDisabled}
          className="text-[11px] font-semibold underline-offset-2 hover:underline disabled:opacity-40 sm:text-[12px]"
          style={{ color: primary }}
        >
          <span className="sm:hidden">Full · {fmtMoney(owed, currency)}</span>
          <span className="hidden sm:inline">Use full balance</span>
        </button>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label
            htmlFor={phoneId}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500"
          >
            M-Pesa number
          </label>
          {payPhone.trim() !== phone.trim() ? (
            <button
              type="button"
              onClick={() => {
                setPayPhone(phone);
                onClearError();
              }}
              disabled={payDisabled}
              className="text-[11px] font-medium text-stone-500 underline-offset-2 hover:underline disabled:opacity-40"
            >
              Reset
            </button>
          ) : null}
        </div>
        <div className="relative">
          <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
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
            className={cn(
              "w-full border border-stone-900/10 bg-white/90 py-3 pl-10 pr-4 text-[15px] font-medium tabular-nums text-stone-900 outline-none transition",
              "rounded-xl focus:border-transparent focus:ring-2 disabled:opacity-55",
            )}
            style={{ ["--tw-ring-color" as string]: primary }}
          />
        </div>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-stone-400">
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
          className={cn(
            "w-full border border-stone-900/10 bg-white/90 pl-14 pr-4 font-semibold tabular-nums text-stone-900 outline-none transition",
            "rounded-xl py-3 text-xl focus:border-transparent focus:ring-2 disabled:opacity-55 sm:py-3.5 sm:text-2xl",
          )}
          style={{ ["--tw-ring-color" as string]: primary }}
        />
      </div>

      <button
        type="button"
        disabled={payDisabled || !amountValid || !phoneOk}
        onClick={onPay}
        className={cn(
          "relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-[15px] font-semibold text-white transition sm:py-4 sm:text-base",
          "active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45",
        )}
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

      {!promptSent && !paid && !error ? (
        <p className="hidden text-center text-[12px] leading-relaxed text-stone-500 sm:block">
          Prompt goes to the number above. If it differs from your account phone,
          we’ll update your account after a successful payment.
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
  const [reference, setReference] = useState("");
  const [manualSubmitted, setManualSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promptSent, setPromptSent] = useState(false);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const primary = branding.primaryHex || "#0b6e4f";
  const accent = branding.accentHex || "#8a9a7b";
  const shopName = branding.shopName || "Shop";

  const themeStyle = useMemo(
    (): CSSProperties =>
      ({
        "--tab-primary": primary,
        "--tab-accent": accent,
      }) as CSSProperties,
    [primary, accent],
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
    requestAnimationFrame(() => setReady(true));
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
      className="relative min-h-[100dvh] overflow-x-hidden text-stone-900 antialiased"
      style={{
        ...themeStyle,
        backgroundColor: "#f4f1ea",
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in oklab, var(--tab-primary) 16%, transparent), transparent 70%),
          radial-gradient(ellipse 60% 40% at 100% 20%, color-mix(in oklab, var(--tab-accent) 14%, transparent), transparent 60%),
          linear-gradient(180deg, #f7f4ed 0%, #f0ebe3 55%, #e8efe9 100%)
        `,
      }}
    >
      {/* Soft paper grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div
        className={cn(
          "relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] sm:max-w-lg sm:px-8",
          showPay
            ? "pb-[calc(14rem+env(safe-area-inset-bottom))] sm:pb-12"
            : "pb-[max(2rem,env(safe-area-inset-bottom))]",
          "transition-opacity duration-500",
          ready || loading ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Brand + balance — compact centered lockup */}
        <header className="text-center">
          {branding.logoUrl ? (
            <div className="mx-auto flex max-w-[min(78vw,240px)] items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.logoUrl}
                alt={displayShop}
                className="h-20 w-full object-contain object-center sm:h-24"
                style={{ mixBlendMode: "multiply" }}
              />
            </div>
          ) : (
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-3xl font-semibold text-white sm:h-24 sm:w-24 sm:text-4xl"
              style={{
                background: `linear-gradient(145deg, ${primary}, color-mix(in oklab, ${primary} 70%, #062015))`,
              }}
              aria-hidden
            >
              {displayShop.slice(0, 1).toUpperCase()}
            </div>
          )}
          <h1
            className="mt-3 font-[family-name:var(--font-cormorant),Georgia,serif] text-[1.25rem] font-semibold leading-snug tracking-tight text-balance sm:text-[1.4rem]"
            style={{ color: primary }}
          >
            {displayShop}
          </h1>
          <p className="mt-1 text-[11px] tracking-wide text-stone-500">
            Account · {phone}
          </p>
        </header>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-28">
            <div
              className="flex size-12 items-center justify-center rounded-full"
              style={{
                background: `color-mix(in oklab, ${primary} 12%, white)`,
              }}
            >
              <Loader2 className="size-6 animate-spin" style={{ color: primary }} />
            </div>
            <p className="text-sm text-stone-500">Fetching your tab…</p>
          </div>
        ) : notFound ? (
          <div className="flex flex-1 flex-col justify-center gap-6 py-20">
            <div
              className="flex size-14 items-center justify-center rounded-full"
              style={{
                background: `color-mix(in oklab, ${primary} 10%, white)`,
              }}
            >
              <Store className="size-6" style={{ color: primary }} />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-cormorant),Georgia,serif] text-[2rem] font-semibold tracking-tight">
                No tab here
              </h2>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-stone-600">
                We couldn’t match this number to an open account. Ask the cashier
                to check the phone on file.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex w-fit text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: primary }}
            >
              Browse the shop
            </Link>
          </div>
        ) : (
          <>
            {/* Balance — tight hero */}
            <section className="mt-5 text-center sm:mt-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
                {firstName ? (
                  <>
                    Hi {firstName} ·{" "}
                    {owed > 0 ? "Outstanding" : "Balance"}
                  </>
                ) : owed > 0 ? (
                  "Outstanding"
                ) : (
                  "Balance"
                )}
              </p>
              <p
                className="mt-1.5 font-[family-name:var(--font-cormorant),Georgia,serif] text-[2.65rem] font-semibold leading-none tracking-[-0.03em] sm:text-[3rem]"
                style={{ color: primary }}
              >
                {fmtMoney(owed, currency)}
              </p>
              {owed <= 0 ? (
                <div className="mt-3 flex items-center justify-center gap-2 text-[13px] font-medium text-emerald-800">
                  <CheckCircle2 className="size-4 shrink-0" />
                  All settled — nothing owed.
                </div>
              ) : null}
            </section>

            {showPay ? (
              <section
                className={cn(
                  "z-40 mt-5 sm:mt-6",
                  "fixed inset-x-0 bottom-0 sm:static sm:inset-auto",
                  "pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-0",
                )}
              >
                <div className="mx-auto max-w-md px-3 sm:max-w-none sm:px-0">
                  <div className="rounded-2xl border border-stone-900/8 bg-[#f7f4ed]/92 p-3.5 shadow-[0_-12px_40px_rgba(28,25,23,0.12)] backdrop-blur-xl sm:bg-white/55 sm:p-5 sm:shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]">
                    <PayModeToggle {...modeToggleProps} />
                    <div className="mt-2.5 sm:mt-4">
                      {payMode === "stk" ? (
                        <PayPanel {...payProps} />
                      ) : (
                        <ManualPayPanel {...manualPayProps} />
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Ledger */}
            <section className="mt-8 flex-1 sm:mt-10">
              <div className="mb-1 flex items-end justify-between gap-3">
                <h2 className="font-[family-name:var(--font-cormorant),Georgia,serif] text-[1.35rem] font-semibold tracking-tight text-stone-900">
                  History
                </h2>
                {purchaseCount > 0 ? (
                  <span className="pb-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
                    {purchaseCount} {purchaseCount === 1 ? "entry" : "entries"}
                  </span>
                ) : null}
              </div>
              <div className="mb-2 h-px bg-stone-900/10" />

              {purchaseCount === 0 ? (
                <p className="py-8 text-sm text-stone-500">No credit purchases yet.</p>
              ) : (
                <ul className="divide-y divide-stone-900/[0.07]">
                  {tab!.purchases.map((row, i) => (
                    <PurchaseRow
                      key={row.saleId}
                      row={row}
                      currency={currency}
                      defaultOpen={i === 0}
                    />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
