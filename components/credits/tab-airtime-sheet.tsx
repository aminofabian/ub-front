"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";

import {
  createPublicTabAirtimeOrder,
  fetchPublicTabAirtimeOrder,
  type PublicTabAirtimeConfig,
  type PublicTabAirtimeOrder,
} from "@/lib/public-customer-tab";
import {
  detectKenyanNetwork,
  looksLikeKenyanMobilePath,
  toKenyanLocal07,
  type KenyanNetwork,
} from "@/lib/kenyan-phone";
import { formatMoneyCompact, resolveCurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full border border-[var(--tab-border)] bg-[var(--tab-input)] px-3 py-3 text-[17px] font-semibold tabular-nums outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-[var(--tab-focus)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_28%,transparent)] disabled:opacity-50";

const btnPrimaryClass =
  "flex w-full items-center justify-center gap-2 py-3.5 text-[15px] font-semibold transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tab-card)] active:opacity-85 disabled:cursor-not-allowed disabled:opacity-45";

const NETWORK_LABEL: Record<KenyanNetwork, string> = {
  SAFARICOM: "Safaricom",
  AIRTEL: "Airtel",
  TELKOM: "Telkom",
  EQUITEL: "Equitel",
  JTL: "JTL",
};

function money(n: number, currency: string) {
  return formatMoneyCompact(n, resolveCurrencyCode(currency));
}

function formatPhoneDisplay(raw: string): string {
  const digits = (toKenyanLocal07(raw) || raw).replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("07")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

function SignalBars({
  fill,
  className,
}: {
  fill: number;
  className?: string;
}) {
  const lit = Math.max(0, Math.min(4, Math.round(fill * 4)));
  return (
    <span
      className={cn("inline-flex h-5 items-end gap-[3px]", className)}
      aria-hidden
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "w-[5px] origin-bottom transition-colors duration-200",
            i < lit ? "bg-current" : "bg-current/25",
          )}
          style={{ height: `${10 + i * 4}px` }}
        />
      ))}
    </span>
  );
}

function scrollFieldIntoView(el: HTMLElement | null) {
  if (!el) return;
  window.requestAnimationFrame(() => {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

type Props = {
  open: boolean;
  onClose: () => void;
  tabPhone: string;
  config: PublicTabAirtimeConfig;
  keyboardInset: number;
  fieldIdPrefix: string;
};

/**
 * Thumb-first airtime purchase for the customer tab.
 *
 * The line on the tab is the default recipient. Amounts are a 3-up keypad of
 * large chips, then one M-Pesa prompt. Delivery is confirmed by polling the
 * order — Instalipa finishes over a callback, not in the STK response.
 */
export function TabAirtimeSheet({
  open,
  onClose,
  tabPhone,
  config,
  keyboardInset,
  fieldIdPrefix,
}: Props) {
  const currency = config.currency || "KES";
  const defaultPhone = toKenyanLocal07(tabPhone) || tabPhone;
  const [amount, setAmount] = useState("");
  const [otherLine, setOtherLine] = useState(false);
  const [recipient, setRecipient] = useState(defaultPhone);
  const [samePayer, setSamePayer] = useState(true);
  const [payer, setPayer] = useState(defaultPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicTabAirtimeOrder | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setOtherLine(false);
    setRecipient(defaultPhone);
    setSamePayer(true);
    setPayer(defaultPhone);
    setBusy(false);
    setError(null);
    setOrder(null);
  }, [open, defaultPhone]);

  const amountNum = Number.parseFloat(amount);
  const min = Number(config.minAmount) || 1;
  const max = Number(config.maxAmount) || 10_000;
  const amountValid =
    Number.isFinite(amountNum) && amountNum >= min && amountNum <= max;

  const liveRecipient = otherLine ? recipient : defaultPhone;
  const livePayer = samePayer ? liveRecipient : payer;
  const recipientOk = looksLikeKenyanMobilePath(liveRecipient);
  const payerOk = looksLikeKenyanMobilePath(livePayer);
  const network = detectKenyanNetwork(liveRecipient);

  const quickAmounts = useMemo(() => {
    const list = config.quickAmounts?.length
      ? config.quickAmounts.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : [20, 50, 100, 250, 500, 1000];
    return list.filter((n) => n >= min && n <= max).slice(0, 6);
  }, [config.quickAmounts, min, max]);

  const fill = amountValid ? Math.min(1, (amountNum - min) / Math.max(1, max - min)) : 0;
  const inFlight = Boolean(order && !order.delivered && !order.failed);
  const locked = busy || inFlight;

  useEffect(() => {
    if (!order || order.delivered || order.failed) return;
    let stopped = false;
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      const fresh = await fetchPublicTabAirtimeOrder(tabPhone, order.orderId);
      if (stopped) return;
      if (fresh) {
        setOrder(fresh);
        if (fresh.delivered || fresh.failed) return;
      }
      if (attempts < 40) {
        timer = window.setTimeout(() => void tick(), 2500);
      }
    };
    let timer = window.setTimeout(() => void tick(), 2500);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [order, tabPhone]);

  const submit = async () => {
    if (!amountValid || !recipientOk || !payerOk || locked) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createPublicTabAirtimeOrder(tabPhone, {
        phoneNumber: liveRecipient.trim(),
        amount: amountNum,
        payerPhone: samePayer ? undefined : livePayer.trim(),
      });
      setOrder(created);
      if (created.failed) {
        setError(created.message || "The airtime purchase could not be started.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the M-Pesa prompt.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const canClose = !busy && !inFlight;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${fieldIdPrefix}-airtime-title`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close"
        onClick={() => {
          if (canClose) onClose();
        }}
      />
      <div
        className="relative flex max-h-[92dvh] w-full flex-col border-t-2 border-[var(--tab-border)] bg-[var(--tab-card)] motion-safe:animate-in motion-safe:slide-in-from-bottom-full motion-safe:duration-200 motion-safe:ease-out"
        style={{
          paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom))`,
        }}
      >
        <div className="flex shrink-0 justify-center border-b border-[var(--tab-border)] py-2.5" aria-hidden>
          <div className="h-1 w-10 bg-[var(--tab-border)]" />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--tab-border)] px-4 py-4">
          <div className="min-w-0">
            <h2
              id={`${fieldIdPrefix}-airtime-title`}
              className="flex items-center gap-2 text-[1.125rem] font-semibold tracking-[-0.02em]"
            >
              <SignalBars fill={order?.delivered ? 1 : fill} />
              Buy airtime
            </h2>
            <p className="mt-1 text-[14px] text-[var(--tab-muted)]">
              Any Kenyan network. One M-Pesa PIN.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (canClose) onClose();
            }}
            disabled={!canClose}
            className="flex size-9 items-center justify-center border border-[var(--tab-border)] text-[var(--tab-muted)] disabled:opacity-40"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {order?.delivered ? (
            <div className="border border-[var(--tab-success-fg)] bg-[var(--tab-success-bg)] px-3.5 py-4 text-[var(--tab-success-fg)]">
              <p className="flex items-center gap-2 text-[15px] font-semibold">
                <CheckCircle2 className="size-5 shrink-0" />
                Airtime sent
              </p>
              <p className="mt-2 text-[14px] leading-relaxed">
                {money(Number(order.amount), order.currency || currency)} landed on{" "}
                {formatPhoneDisplay(order.phoneNumber)}. Watch for the telco SMS.
              </p>
              {order.receipt ? (
                <p className="mt-2 font-mono text-[12px] tabular-nums opacity-80">
                  {order.receipt}
                </p>
              ) : null}
            </div>
          ) : order && !order.failed ? (
            <div className="border border-[var(--tab-border)] bg-[var(--tab-bg)] px-3.5 py-4">
              <p className="flex items-center gap-2 text-[15px] font-semibold">
                {order.awaitingPayment ? (
                  <Smartphone className="size-5 shrink-0" />
                ) : (
                  <Loader2 className="size-5 shrink-0 animate-spin" />
                )}
                {money(Number(order.amount), order.currency || currency)} to{" "}
                {formatPhoneDisplay(order.phoneNumber)}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--tab-muted)]">
                {order.awaitingPayment
                  ? `Check ${formatPhoneDisplay(livePayer)} and enter your M-Pesa PIN.`
                  : "Payment received — sending your airtime now."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border border-[var(--tab-border)] bg-[var(--tab-bg)] px-3 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--tab-muted)]">
                    {otherLine ? "Sending to" : "This line"}
                  </p>
                  <p className="mt-0.5 truncate text-[16px] font-semibold tabular-nums tracking-wide">
                    {formatPhoneDisplay(liveRecipient)}
                  </p>
                </div>
                {network ? (
                  <span className="shrink-0 border border-[var(--tab-border)] bg-[var(--tab-card)] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em]">
                    {NETWORK_LABEL[network]}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  setOtherLine((v) => !v);
                  setError(null);
                }}
                className="mt-2 text-[13px] font-medium text-[var(--tab-muted)] underline-offset-2 hover:underline disabled:opacity-40"
              >
                {otherLine ? "Use this tab’s number instead" : "Send to a different number"}
              </button>

              {otherLine ? (
                <div className="mt-3">
                  <label
                    htmlFor={`${fieldIdPrefix}-airtime-recipient`}
                    className="mb-1.5 block text-[13px] font-medium"
                  >
                    Number to top up
                  </label>
                  <input
                    id={`${fieldIdPrefix}-airtime-recipient`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={recipient}
                    disabled={locked}
                    onChange={(e) => {
                      setRecipient(e.target.value);
                      setError(null);
                    }}
                    onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                    className={cn(fieldClass, "text-[18px] font-bold tracking-wide")}
                    placeholder="07…"
                  />
                </div>
              ) : null}

              <p className="mt-5 text-[13px] font-medium">Amount</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {quickAmounts.map((n) => {
                  const selected = amountValid && Math.abs(amountNum - n) < 0.001;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setAmount(String(n));
                        setError(null);
                      }}
                      className={cn(
                        "min-h-12 border py-3 text-[15px] font-bold tabular-nums disabled:opacity-40",
                        selected
                          ? "border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                          : "border-[var(--tab-border)] bg-[var(--tab-input)]",
                      )}
                    >
                      {n.toLocaleString("en-KE")}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">
                <label
                  htmlFor={`${fieldIdPrefix}-airtime-amount`}
                  className="mb-1.5 block text-[13px] font-medium"
                >
                  Other amount
                </label>
                <input
                  id={`${fieldIdPrefix}-airtime-amount`}
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  step={1}
                  value={amount}
                  disabled={locked}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                  className={cn(fieldClass, "text-[22px] font-bold")}
                  placeholder={`${min}–${max}`}
                />
              </div>

              <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 border border-[var(--tab-border)] bg-[var(--tab-bg)] px-3 py-3 text-[14px] font-medium">
                <span>Pay from this same number</span>
                <input
                  type="checkbox"
                  className="size-5 accent-current"
                  checked={samePayer}
                  disabled={locked}
                  onChange={(e) => setSamePayer(e.target.checked)}
                />
              </label>
              {!samePayer ? (
                <div className="mt-3">
                  <label
                    htmlFor={`${fieldIdPrefix}-airtime-payer`}
                    className="mb-1.5 block text-[13px] font-medium"
                  >
                    M-Pesa number to charge
                  </label>
                  <input
                    id={`${fieldIdPrefix}-airtime-payer`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={payer}
                    disabled={locked}
                    onChange={(e) => {
                      setPayer(e.target.value);
                      setError(null);
                    }}
                    onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                    className={cn(fieldClass, "text-[18px] font-bold tracking-wide")}
                    placeholder="07…"
                  />
                </div>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="mt-4 border border-[var(--tab-error-fg)] bg-[var(--tab-error-bg)] px-3 py-2 text-[13px] text-[var(--tab-error-fg)]"
                >
                  {error}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--tab-border)] px-4 py-3">
          {order?.delivered ? (
            <button
              type="button"
              onClick={onClose}
              className={btnPrimaryClass}
              style={{
                backgroundColor: "var(--tab-cta-bg)",
                color: "var(--tab-cta-fg)",
              }}
            >
              Done
            </button>
          ) : inFlight ? (
            <p className="flex items-center justify-center gap-2 py-2 text-[13px] text-[var(--tab-muted)]">
              <Loader2 className="size-4 animate-spin" />
              Waiting for confirmation…
            </p>
          ) : (
            <button
              type="button"
              disabled={locked || !amountValid || !recipientOk || !payerOk}
              onClick={() => void submit()}
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
              ) : (
                <>
                  <Smartphone className="size-4" />
                  {amountValid
                    ? `Buy ${money(amountNum, currency)} with M-Pesa`
                    : "Buy airtime with M-Pesa"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
