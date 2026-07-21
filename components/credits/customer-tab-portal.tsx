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
import {
  buildStorefrontThemeVars,
  STOREFRONT_ON_PRIMARY,
} from "@/lib/storefront-theme";
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

type PayMode = "stk" | "manual";
type AppScreen = "purchases" | "pay";

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

const fieldClass =
  "w-full border border-border bg-background px-3.5 py-3.5 text-[16px] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50";

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

  return (
    <li className="border-b border-border/70 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 py-3.5 text-left active:bg-muted/40"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-medium text-foreground">
              {headline}
            </p>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {fmtDate(row.soldAt)}
            {row.receiptNo != null ? (
              <span> · #{row.receiptNo}</span>
            ) : null}
          </p>
        </div>
        <p className="shrink-0 text-[15px] font-semibold tabular-nums text-foreground">
          {fmtMoney(row.creditAmount, currency)}
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
            <ul className="space-y-2 border-l-2 border-primary/25 pb-3.5 pl-3">
              {lines.map((line, i) => (
                <li
                  key={`${row.saleId}-${i}`}
                  className="flex items-baseline justify-between gap-3 text-[13px]"
                >
                  <span className="min-w-0 text-muted-foreground">
                    <span className="text-foreground/90">
                      {line.itemName?.trim() || "Item"}
                    </span>
                    {toNum(line.quantity) !== 1 ? (
                      <span className="ml-1.5 tabular-nums opacity-70">
                        ×{fmtQty(line.quantity)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
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

function SegmentedControl({
  mode,
  setMode,
  disabled,
}: {
  mode: PayMode;
  setMode: (m: PayMode) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="flex border border-border bg-muted/40 p-0.5"
      role="tablist"
      aria-label="Payment method"
    >
      {(
        [
          { id: "stk" as const, label: "M-Pesa prompt", icon: Smartphone },
          { id: "manual" as const, label: "Already paid", icon: Receipt },
        ] as const
      ).map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => setMode(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition disabled:opacity-45",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function QuickAmounts({
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
              "border px-3 py-1.5 text-[12px] font-semibold tabular-nums transition active:scale-[0.98] disabled:opacity-40",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground",
            )}
          >
            {n === owed ? "Full balance" : fmtMoney(n, currency)}
          </button>
        );
      })}
    </div>
  );
}

function PrimaryButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
      style={{ color: STOREFRONT_ON_PRIMARY }}
    >
      {children}
    </button>
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
  onSubmit: () => void;
  onClearError: () => void;
  fieldIdPrefix: string;
}) {
  const amountId = `${fieldIdPrefix}-amount`;
  const refId = `${fieldIdPrefix}-ref`;

  return (
    <div className="space-y-4">
      <QuickAmounts
        owed={owed}
        currency={currency}
        amountNum={amountNum}
        disabled={payDisabled || submitted}
        onPick={(n) => {
          setAmount(String(Math.round(n * 100) / 100));
          onClearError();
        }}
      />

      <div>
        <label
          htmlFor={amountId}
          className="mb-1.5 block text-[12px] font-medium text-muted-foreground"
        >
          Amount paid
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
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
            className={cn(fieldClass, "pl-12 text-xl font-semibold tabular-nums")}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={refId}
          className="mb-1.5 block text-[12px] font-medium text-muted-foreground"
        >
          M-Pesa code <span className="font-normal">(optional)</span>
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
          className={cn(fieldClass, "uppercase tracking-wide")}
        />
      </div>

      <PrimaryButton
        disabled={payDisabled || !amountValid || submitted}
        onClick={onSubmit}
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting…
          </>
        ) : submitted ? (
          <>
            <CheckCircle2 className="size-4" />
            Submitted for review
          </>
        ) : (
          <>
            <Receipt className="size-4 opacity-90" />
            {amountValid
              ? `Submit ${fmtMoney(amountNum, currency)}`
              : "Submit payment"}
          </>
        )}
      </PrimaryButton>

      {submitted ? (
        <p className="text-[13px] leading-snug text-muted-foreground">
          The shop will review your payment and update your balance.
        </p>
      ) : null}

      {error ? (
        <p className="text-[13px] font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PayPanel({
  currency,
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
    <div className="space-y-4">
      <QuickAmounts
        owed={owed}
        currency={currency}
        amountNum={amountNum}
        disabled={payDisabled}
        onPick={(n) => {
          setAmount(String(Math.round(n * 100) / 100));
          onClearError();
        }}
      />

      <div>
        <label
          htmlFor={phoneId}
          className="mb-1.5 block text-[12px] font-medium text-muted-foreground"
        >
          M-Pesa number
        </label>
        <div className="relative">
          <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
            className={cn(fieldClass, "pl-10 tabular-nums")}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-[12px] font-medium text-muted-foreground"
        >
          Amount
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
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
            className={cn(fieldClass, "pl-12 text-xl font-semibold tabular-nums")}
          />
        </div>
      </div>

      <PrimaryButton
        disabled={payDisabled || !amountValid || !phoneOk}
        onClick={onPay}
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending prompt…
          </>
        ) : promptSent ? (
          <>
            <Smartphone className="size-4 animate-pulse" />
            Enter PIN on your phone
          </>
        ) : (
          <>
            <Smartphone className="size-4 opacity-90" />
            {amountValid
              ? `Pay ${fmtMoney(amountNum, currency)}`
              : "Pay with M-Pesa"}
          </>
        )}
      </PrimaryButton>

      {promptSent ? (
        <p className="text-[13px] leading-snug" style={{ color: primary }}>
          {statusMsg}
        </p>
      ) : null}

      {paid ? (
        <p className="flex items-center gap-2 text-[13px] font-medium text-emerald-700">
          <CheckCircle2 className="size-4 shrink-0" />
          {statusMsg}
        </p>
      ) : null}

      {error ? (
        <p className="text-[13px] font-medium text-destructive" role="alert">
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
  const accent = branding.accentHex;
  const shopName = branding.shopName || "Shop";

  const themeStyle = useMemo(
    (): CSSProperties => ({
      ...buildStorefrontThemeVars(primary, accent),
      "--primary": primary,
      "--primary-foreground": STOREFRONT_ON_PRIMARY,
    }),
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
    onSubmit: () => void onSubmitManual(),
    onClearError: () => setError(null),
    fieldIdPrefix: `${fieldIdPrefix}-manual`,
  };

  return (
    <div
      className="mx-auto flex h-[100dvh] max-w-lg flex-col overflow-hidden bg-background text-foreground antialiased touch-manipulation"
      style={themeStyle}
    >
      {/* Brand header */}
      <header className="shrink-0 border-b border-border bg-background px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt=""
              className="h-10 w-auto max-w-[7.5rem] shrink-0 object-contain object-left"
            />
          ) : (
            <div
              className="flex size-10 shrink-0 items-center justify-center text-sm font-semibold text-white"
              style={{ backgroundColor: primary }}
              aria-hidden
            >
              {displayShop.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1
              className="truncate font-[family-name:var(--font-cormorant),Georgia,serif] text-[1.2rem] font-semibold leading-tight tracking-tight"
              style={{ color: primary }}
            >
              {displayShop}
            </h1>
            <p className="truncate text-[12px] text-muted-foreground">
              {firstName && !loading && !notFound ? `${firstName} · ` : null}
              {phone}
            </p>
          </div>
        </div>

        {!loading && !notFound ? (
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/70 pt-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {owed > 0 ? "Outstanding" : "Balance"}
              </p>
              <p
                className="mt-0.5 font-[family-name:var(--font-cormorant),Georgia,serif] text-[2rem] font-semibold leading-none tracking-tight tabular-nums"
                style={{ color: primary }}
              >
                {fmtMoney(owed, currency)}
              </p>
            </div>
            {showPay && appScreen === "purchases" ? (
              <button
                type="button"
                onClick={() => setAppScreen("pay")}
                className="shrink-0 bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground"
                style={{ color: STOREFRONT_ON_PRIMARY }}
              >
                Pay now
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your account…</p>
        </div>
      ) : notFound ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <Store className="size-9 text-muted-foreground" />
          <div>
            <h2 className="font-[family-name:var(--font-cormorant),Georgia,serif] text-2xl font-semibold">
              Account not found
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Ask the shop to check the phone number on file.
            </p>
          </div>
          <Link
            href="/shop"
            className="bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            style={{ color: STOREFRONT_ON_PRIMARY }}
          >
            Browse shop
          </Link>
        </div>
      ) : (
        <>
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {appScreen === "purchases" ? (
              <div className="px-4 py-4">
                {owed <= 0 ? (
                  <div className="mb-4 flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[14px] font-medium text-emerald-800">
                    <CheckCircle2 className="size-4 shrink-0" />
                    All settled — nothing owed.
                  </div>
                ) : null}

                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h2 className="font-[family-name:var(--font-cormorant),Georgia,serif] text-lg font-semibold tracking-tight">
                    Purchases
                  </h2>
                  {purchaseCount > 0 ? (
                    <span className="text-[12px] text-muted-foreground">
                      {purchaseCount}
                    </span>
                  ) : null}
                </div>

                {purchaseCount === 0 ? (
                  <p className="border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                    No credit purchases yet
                  </p>
                ) : (
                  <ul className="border border-border bg-background">
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
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-[family-name:var(--font-cormorant),Georgia,serif] text-lg font-semibold tracking-tight">
                    Pay balance
                  </h2>
                  <button
                    type="button"
                    onClick={() => setAppScreen("purchases")}
                    className="text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Back
                  </button>
                </div>

                <SegmentedControl
                  mode={payMode}
                  setMode={(m) => {
                    setPayMode(m);
                    setError(null);
                  }}
                  disabled={busy || promptSent || manualSubmitted}
                />

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
                <CheckCircle2 className="size-9 text-emerald-600" />
                <p className="font-medium">Nothing to pay</p>
              </div>
            )}
          </main>

          {showPay && appScreen === "purchases" ? (
            <div className="shrink-0 border-t border-border bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <PrimaryButton onClick={() => setAppScreen("pay")}>
                Pay {fmtMoney(owed, currency)}
              </PrimaryButton>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
