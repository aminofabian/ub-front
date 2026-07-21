"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Smartphone,
  Store,
} from "lucide-react";

import { looksLikeKenyanMobilePath, toKenyanLocal07 } from "@/lib/kenyan-phone";
import {
  fetchPublicCustomerTab,
  fetchPublicTabStkStatus,
  initiatePublicTabStk,
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
    return new Intl.DateTimeFormat(undefined, {
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
  variant = "inline",
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
  variant?: "inline" | "dock";
}) {
  const inputId = variant === "dock" ? "tab-pay-amount-mobile" : "tab-pay-amount";
  const phoneId = variant === "dock" ? "tab-pay-phone-mobile" : "tab-pay-phone";
  const isDock = variant === "dock";
  const phoneOk = looksLikeKenyanMobilePath(payPhone);

  return (
    <div className={cn("space-y-3", isDock && "space-y-2.5")}>
      {!isDock ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Settle with M-Pesa
          </p>
          <button
            type="button"
            onClick={() => {
              setAmount(String(Math.round(owed * 100) / 100));
              onClearError();
            }}
            disabled={payDisabled}
            className="text-[12px] font-semibold underline-offset-2 hover:underline disabled:opacity-40"
            style={{ color: primary }}
          >
            Use full balance
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500"
          >
            Pay
          </label>
          <button
            type="button"
            onClick={() => {
              setAmount(String(Math.round(owed * 100) / 100));
              onClearError();
            }}
            disabled={payDisabled}
            className="text-[11px] font-semibold disabled:opacity-40"
            style={{ color: primary }}
          >
            Full · {fmtMoney(owed, currency)}
          </button>
        </div>
      )}

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
            "rounded-xl focus:border-transparent focus:ring-2 disabled:opacity-55",
            isDock ? "py-3 text-xl" : "py-3.5 text-2xl",
          )}
          style={{ ["--tw-ring-color" as string]: primary }}
        />
      </div>

      <button
        type="button"
        disabled={payDisabled || !amountValid || !phoneOk}
        onClick={onPay}
        className={cn(
          "relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold text-white transition",
          "active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45",
          isDock ? "py-3.5 text-[15px]" : "py-4 text-base",
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
        <p
          className="flex items-start gap-2 text-[13px] leading-snug"
          style={{ color: primary }}
        >
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current animate-pulse" />
          {statusMsg}
        </p>
      ) : null}

      {paid ? (
        <p className="flex items-center gap-2 text-[13px] font-medium text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0" />
          {statusMsg}
        </p>
      ) : null}

      {error ? (
        <p className="text-[13px] font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {!isDock && !promptSent && !paid && !error ? (
        <p className="text-center text-[12px] leading-relaxed text-stone-500">
          Prompt goes to the number above. If it differs from your account phone,
          we’ll update your account after a successful payment.
        </p>
      ) : null}
    </div>
  );
}

export function CustomerTabPortal({ phoneSegment, branding }: Props) {
  const phone = useMemo(
    () => toKenyanLocal07(phoneSegment) ?? phoneSegment.trim(),
    [phoneSegment],
  );

  const [tab, setTab] = useState<PublicCustomerTab | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState("");
  const [payPhone, setPayPhone] = useState(phone);
  const [busy, setBusy] = useState(false);
  const [promptSent, setPromptSent] = useState(false);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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
  const amountNum = Number.parseFloat(amount);
  const amountValid =
    Number.isFinite(amountNum) && amountNum > 0 && amountNum <= owed + 0.001;
  const showPay = owed > 0 && !loading && !notFound;
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
            ? "pb-[calc(16rem+env(safe-area-inset-bottom))] sm:pb-16"
            : "pb-[max(2.5rem,env(safe-area-inset-bottom))]",
          "transition-opacity duration-500",
          ready || loading ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Brand masthead */}
        <header className="flex items-start gap-3.5 sm:items-center sm:gap-4">
          {branding.logoUrl ? (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-[0_1px_0_rgba(28,25,23,0.06)] ring-1 ring-stone-900/8 sm:h-16 sm:w-16 sm:p-2"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.logoUrl}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold text-white sm:h-16 sm:w-16"
              style={{
                background: `linear-gradient(145deg, ${primary}, color-mix(in oklab, ${primary} 70%, #062015))`,
              }}
              aria-hidden
            >
              {displayShop.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h1
              className="font-[family-name:var(--font-cormorant),Georgia,serif] text-[1.45rem] font-semibold leading-[1.15] tracking-[-0.02em] text-balance sm:text-[1.85rem]"
              style={{ color: primary }}
            >
              {displayShop}
            </h1>
            <p className="mt-1.5 text-[12px] tracking-[0.04em] text-stone-500">
              Account · {phone}
            </p>
          </div>
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
            {/* Balance composition */}
            <section className="mt-12 sm:mt-14">
              {firstName ? (
                <p className="text-[14px] text-stone-600">
                  Hi {firstName},
                </p>
              ) : null}
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                {owed > 0 ? "Outstanding" : "Balance"}
              </p>
              <p
                className="mt-2 font-[family-name:var(--font-cormorant),Georgia,serif] text-[3.5rem] font-semibold leading-[0.92] tracking-[-0.03em] sm:text-[4.25rem]"
                style={{ color: primary }}
              >
                {fmtMoney(owed, currency)}
              </p>
              <div
                className="mt-5 h-px w-16"
                style={{
                  background: `linear-gradient(90deg, ${primary}, transparent)`,
                }}
              />
              {owed <= 0 ? (
                <p className="mt-6 flex items-center gap-2 text-[14px] font-medium text-emerald-800">
                  <CheckCircle2 className="size-5 shrink-0" />
                  All settled — nothing owed.
                </p>
              ) : (
                <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-stone-500">
                  Pay any amount below. We’ll send an M-Pesa prompt to this phone.
                </p>
              )}
            </section>

            {showPay ? (
              <section className="mt-10 hidden sm:block">
                <div className="rounded-2xl border border-stone-900/8 bg-white/55 p-5 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]">
                  <PayPanel {...payProps} variant="inline" />
                </div>
              </section>
            ) : null}

            {/* Ledger */}
            <section className="mt-14 flex-1">
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

      {showPay ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 sm:hidden"
          style={{
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="mx-auto max-w-md px-3">
            <div
              className="rounded-2xl border border-stone-900/8 bg-[#f7f4ed]/92 p-3.5 shadow-[0_-12px_40px_rgba(28,25,23,0.12)] backdrop-blur-xl"
            >
              <PayPanel {...payProps} variant="dock" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
