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
  ChevronRight,
  Loader2,
  Smartphone,
  Store,
} from "lucide-react";

import { toKenyanLocal07 } from "@/lib/kenyan-phone";
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

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
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

function ShopMark({
  logoUrl,
  name,
  primary,
}: {
  logoUrl: string | null;
  name: string;
  primary: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="h-11 w-11 shrink-0 rounded-2xl object-cover ring-1 ring-black/5 sm:h-12 sm:w-12"
      />
    );
  }
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-white sm:h-12 sm:w-12"
      style={{ background: primary }}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
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
  const preview = lines.slice(0, 2);
  const extra = Math.max(0, lines.length - preview.length);

  return (
    <li className="border-t border-stone-900/[0.07] pt-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 text-left active:opacity-80"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-stone-500">{fmtDate(row.soldAt)}</p>
          <p className="mt-0.5 text-[15px] font-medium text-stone-900">
            {row.receiptNo != null ? `Receipt #${row.receiptNo}` : "Purchase"}
          </p>
          {!open && lines.length > 0 ? (
            <p className="mt-1 truncate text-sm text-stone-500">
              {preview.map((l) => l.name).join(" · ")}
              {extra > 0 ? ` · +${extra} more` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
          <span className="text-[15px] font-semibold tabular-nums text-stone-900">
            {fmtMoney(row.creditAmount, currency)}
          </span>
          <ChevronRight
            className={cn(
              "size-4 text-stone-400 transition-transform duration-200",
              open && "rotate-90",
            )}
          />
        </div>
      </button>
      {open && lines.length > 0 ? (
        <ul className="mt-3 space-y-2 border-l-2 border-[color-mix(in_oklab,var(--tab-primary)_40%,transparent)] pl-3">
          {lines.map((line, i) => (
            <li
              key={`${row.saleId}-${i}`}
              className="flex justify-between gap-3 text-sm text-stone-600"
            >
              <span className="min-w-0">
                {line.name}
                {toNum(line.quantity) !== 1 ? (
                  <span className="text-stone-400"> × {toNum(line.quantity)}</span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums">
                {fmtMoney(line.lineTotal, currency)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
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
  const [busy, setBusy] = useState(false);
  const [promptSent, setPromptSent] = useState(false);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primary = branding.primaryHex || "#0b6e4f";
  const accent = branding.accentHex || "#c4a574";
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

  async function onPay() {
    setError(null);
    setStatusMsg(null);
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
      const res = await initiatePublicTabStk(phone, amountNum, newIdempotencyKey());
      setIntentId(res.intentId);
      setPromptSent(true);
      setPaid(false);
      setStatusMsg(`Prompt sent to ${phone}. Open M-Pesa and enter your PIN.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send M-Pesa prompt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-[100dvh] text-stone-900 antialiased"
      style={{
        ...themeStyle,
        background: `
          radial-gradient(90% 55% at 0% 0%, color-mix(in oklab, var(--tab-primary) 18%, transparent), transparent 60%),
          radial-gradient(70% 45% at 100% 8%, color-mix(in oklab, var(--tab-accent) 22%, transparent), transparent 55%),
          linear-gradient(180deg, #faf8f4 0%, #f3efe8 45%, #eef5f0 100%)
        `,
      }}
    >
      <div
        className={cn(
          "mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:max-w-lg sm:px-6",
          showPay
            ? "pb-[calc(11.5rem+env(safe-area-inset-bottom))] sm:pb-12"
            : "pb-[max(2rem,env(safe-area-inset-bottom))]",
        )}
      >
        <header className="flex items-center gap-3">
          <ShopMark
            logoUrl={branding.logoUrl}
            name={displayShop}
            primary={primary}
          />
          <div className="min-w-0 flex-1">
            <h1
              className="truncate font-[family-name:var(--font-cormorant),Georgia,serif] text-[1.65rem] font-semibold leading-tight tracking-tight sm:text-3xl"
              style={{ color: primary }}
            >
              {displayShop}
            </h1>
            <p className="mt-0.5 truncate text-sm text-stone-500">
              Your tab · {phone}
            </p>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
            <Loader2 className="size-9 animate-spin" style={{ color: primary }} />
            <p className="text-sm text-stone-500">Loading your balance…</p>
          </div>
        ) : notFound ? (
          <div className="flex flex-1 flex-col justify-center gap-5 py-16">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: `color-mix(in oklab, ${primary} 12%, white)`,
              }}
            >
              <Store className="size-7" style={{ color: primary }} />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-cormorant),Georgia,serif] text-3xl font-semibold tracking-tight">
                Tab not found
              </h2>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-stone-600">
                We couldn’t find an open tab for this number here. Ask the cashier
                to confirm your phone is on the account.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex w-fit items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: primary }}
            >
              Back to shop
              <ChevronRight className="size-4" />
            </Link>
          </div>
        ) : (
          <>
            <section className="mt-10">
              {firstName ? (
                <p className="text-[15px] text-stone-600">Hi {firstName}</p>
              ) : null}
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                {owed > 0 ? "You owe" : "Balance"}
              </p>
              <p
                className="mt-1 font-[family-name:var(--font-cormorant),Georgia,serif] text-[3.25rem] font-semibold leading-none tracking-tight sm:text-6xl"
                style={{ color: primary }}
              >
                {fmtMoney(owed, currency)}
              </p>
              {owed <= 0 ? (
                <p className="mt-5 flex items-center gap-2 text-[15px] font-medium text-emerald-800">
                  <CheckCircle2 className="size-5 shrink-0" />
                  You’re all settled — nothing owed.
                </p>
              ) : null}
            </section>

            {/* Desktop pay (in flow) */}
            {showPay ? (
              <section className="mt-8 hidden sm:block">
                <PayPanel
                  currency={currency}
                  phone={phone}
                  amount={amount}
                  setAmount={setAmount}
                  owed={owed}
                  payDisabled={payDisabled}
                  amountValid={amountValid}
                  amountNum={amountNum}
                  busy={busy}
                  promptSent={promptSent}
                  paid={paid}
                  statusMsg={statusMsg}
                  error={error}
                  primary={primary}
                  onPay={() => void onPay()}
                  onClearError={() => setError(null)}
                />
              </section>
            ) : null}

            <section className="mt-12 flex-1">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="font-[family-name:var(--font-cormorant),Georgia,serif] text-xl font-semibold tracking-tight">
                  On credit
                </h2>
                {(tab?.purchases?.length ?? 0) > 0 ? (
                  <span className="text-xs tabular-nums text-stone-400">
                    {tab!.purchases.length}{" "}
                    {tab!.purchases.length === 1 ? "sale" : "sales"}
                  </span>
                ) : null}
              </div>

              {(tab?.purchases?.length ?? 0) === 0 ? (
                <p className="text-sm text-stone-500">No recent tab purchases yet.</p>
              ) : (
                <ul>
                  {tab!.purchases.map((row) => (
                    <PurchaseRow key={row.saleId} row={row} currency={currency} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {/* Mobile sticky pay dock — thumb-friendly */}
      {showPay ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-900/10 bg-[#faf8f4]/95 px-5 pt-3 shadow-[0_-8px_30px_rgba(28,25,23,0.06)] backdrop-blur-md sm:hidden"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="mx-auto max-w-md">
            <PayPanel
              currency={currency}
              phone={phone}
              amount={amount}
              setAmount={setAmount}
              owed={owed}
              payDisabled={payDisabled}
              amountValid={amountValid}
              amountNum={amountNum}
              busy={busy}
              promptSent={promptSent}
              paid={paid}
              statusMsg={statusMsg}
              error={error}
              primary={primary}
              onPay={() => void onPay()}
              onClearError={() => setError(null)}
              compact
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PayPanel({
  currency,
  phone,
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
  compact = false,
}: {
  currency: string;
  phone: string;
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
  compact?: boolean;
}) {
  const inputId = compact ? "tab-pay-amount-mobile" : "tab-pay-amount";

  return (
    <div className={cn("space-y-2.5", !compact && "space-y-3")}>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium text-stone-700">
          Amount to pay
        </label>
        <button
          type="button"
          onClick={() => {
            setAmount(String(Math.round(owed * 100) / 100));
            onClearError();
          }}
          disabled={payDisabled}
          className="text-xs font-semibold uppercase tracking-wide disabled:opacity-40"
          style={{ color: primary }}
        >
          Pay all
        </button>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-400">
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
          className="w-full rounded-2xl border border-stone-900/10 bg-white px-4 py-3.5 pl-14 text-2xl font-semibold tabular-nums text-stone-900 outline-none transition focus:border-transparent focus:ring-2 disabled:opacity-60"
          style={{ ["--tw-ring-color" as string]: primary }}
        />
      </div>

      <button
        type="button"
        disabled={payDisabled || !amountValid}
        onClick={onPay}
        className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: primary }}
      >
        {busy ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Sending…
          </>
        ) : promptSent ? (
          <>
            <Smartphone className="size-5" />
            Waiting for PIN…
          </>
        ) : (
          <>
            Pay {amountValid ? fmtMoney(amountNum, currency) : ""} with M-Pesa
          </>
        )}
      </button>

      {promptSent ? (
        <div
          className="flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm"
          style={{
            background: `color-mix(in oklab, ${primary} 12%, white)`,
            color: primary,
          }}
        >
          <Smartphone className="mt-0.5 size-4 shrink-0 animate-pulse" />
          <p className="font-medium leading-snug">{statusMsg}</p>
        </div>
      ) : null}

      {paid ? (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="size-4 shrink-0" />
          {statusMsg}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {!compact && !promptSent && !paid && !error ? (
        <p className="text-center text-xs leading-relaxed text-stone-500">
          We’ll prompt <span className="font-medium text-stone-700">{phone}</span>.
          Approve on your phone to clear this tab.
        </p>
      ) : null}
    </div>
  );
}
