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
  KENYAN_NETWORKS,
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

const btnQuietClass =
  "text-[13px] font-medium text-[var(--tab-muted)] underline-offset-2 hover:underline disabled:opacity-40";

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

function networkLabel(id: KenyanNetwork | null): string {
  return KENYAN_NETWORKS.find((n) => n.id === id)?.label ?? "this network";
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
 * Network, the line being topped up, and the M-Pesa paying number are all on
 * the first screen — Instalipa still routes from the MSISDN, but Kenyan
 * shoppers expect to tap Safaricom / Airtel before they pay.
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
  const [recipient, setRecipient] = useState(defaultPhone);
  const [payer, setPayer] = useState(defaultPhone);
  const [network, setNetwork] = useState<KenyanNetwork | null>(
    detectKenyanNetwork(defaultPhone),
  );
  const [networkTouched, setNetworkTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicTabAirtimeOrder | null>(null);

  useEffect(() => {
    if (!open) return;
    const detected = detectKenyanNetwork(defaultPhone);
    setAmount("");
    setRecipient(defaultPhone);
    setPayer(defaultPhone);
    setNetwork(detected);
    setNetworkTouched(false);
    setBusy(false);
    setError(null);
    setOrder(null);
  }, [open, defaultPhone]);

  const amountNum = Number.parseFloat(amount);
  const min = Number(config.minAmount) || 1;
  const max = Number(config.maxAmount) || 10_000;
  const amountValid =
    Number.isFinite(amountNum) && amountNum >= min && amountNum <= max;

  const recipientOk = looksLikeKenyanMobilePath(recipient);
  const payerOk = looksLikeKenyanMobilePath(payer);
  const detectedFromPhone = detectKenyanNetwork(recipient);
  const networkMismatch =
    Boolean(network) &&
    Boolean(detectedFromPhone) &&
    network !== detectedFromPhone;

  const quickAmounts = useMemo(() => {
    const list = config.quickAmounts?.length
      ? config.quickAmounts.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : [20, 50, 100, 250, 500, 1000];
    return list.filter((n) => n >= min && n <= max).slice(0, 6);
  }, [config.quickAmounts, min, max]);

  const fill = amountValid ? Math.min(1, (amountNum - min) / Math.max(1, max - min)) : 0;
  const inFlight = Boolean(order && !order.delivered && !order.failed);
  const locked = busy || inFlight;
  const canSubmit =
    !locked && amountValid && recipientOk && payerOk && network != null && !networkMismatch;

  useEffect(() => {
    if (networkTouched) return;
    if (detectedFromPhone) setNetwork(detectedFromPhone);
  }, [detectedFromPhone, networkTouched]);

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
    if (!canSubmit || network == null) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createPublicTabAirtimeOrder(tabPhone, {
        phoneNumber: recipient.trim(),
        amount: amountNum,
        payerPhone: payer.trim(),
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
  const samePhones =
    (toKenyanLocal07(recipient) || recipient.replace(/\D/g, "")) ===
    (toKenyanLocal07(payer) || payer.replace(/\D/g, ""));

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
              Pick the network, then who pays.
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
                  ? `Check ${formatPhoneDisplay(payer)} and enter your M-Pesa PIN.`
                  : "Payment received — sending your airtime now."}
              </p>
            </div>
          ) : (
            <>
              <fieldset disabled={locked} className="min-w-0">
                <legend className="text-[13px] font-medium">Network</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {KENYAN_NETWORKS.slice(0, 3).map((n) => {
                    const selected = network === n.id;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setNetwork(n.id);
                          setNetworkTouched(true);
                          setError(null);
                        }}
                        className={cn(
                          "min-h-12 border px-2 py-3 text-[14px] font-semibold disabled:opacity-40",
                          selected
                            ? "border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                            : "border-[var(--tab-border)] bg-[var(--tab-input)]",
                        )}
                      >
                        {n.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {KENYAN_NETWORKS.slice(3).map((n) => {
                    const selected = network === n.id;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setNetwork(n.id);
                          setNetworkTouched(true);
                          setError(null);
                        }}
                        className={cn(
                          "min-h-12 border px-2 py-3 text-[14px] font-semibold disabled:opacity-40",
                          selected
                            ? "border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                            : "border-[var(--tab-border)] bg-[var(--tab-input)]",
                        )}
                      >
                        {n.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-5">
                <label
                  htmlFor={`${fieldIdPrefix}-airtime-recipient`}
                  className="mb-1.5 block text-[13px] font-medium"
                >
                  Number that receives airtime
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
                {recipient !== defaultPhone ? (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setRecipient(defaultPhone);
                      setError(null);
                    }}
                    className={cn(btnQuietClass, "mt-2")}
                  >
                    Use this tab’s number · {formatPhoneDisplay(defaultPhone)}
                  </button>
                ) : (
                  <p className="mt-1.5 text-[13px] text-[var(--tab-muted)]">
                    This tab’s number — change it to top up someone else.
                  </p>
                )}
                {networkMismatch && detectedFromPhone ? (
                  <p
                    role="status"
                    className="mt-3 border border-[var(--tab-border)] bg-[var(--tab-bg)] px-3 py-2 text-[13px] leading-relaxed"
                  >
                    That number looks like {networkLabel(detectedFromPhone)}, not{" "}
                    {networkLabel(network)}.{" "}
                    <button
                      type="button"
                      className="font-semibold underline underline-offset-2"
                      onClick={() => {
                        setNetwork(detectedFromPhone);
                        setNetworkTouched(true);
                        setError(null);
                      }}
                    >
                      Switch to {networkLabel(detectedFromPhone)}
                    </button>
                  </p>
                ) : null}
              </div>

              <div className="mt-5">
                <p className="text-[13px] font-medium">Amount</p>
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
                <label
                  htmlFor={`${fieldIdPrefix}-airtime-amount`}
                  className="mb-1.5 mt-3 block text-[13px] font-medium"
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

              <div className="mt-5">
                <label
                  htmlFor={`${fieldIdPrefix}-airtime-payer`}
                  className="mb-1.5 block text-[13px] font-medium"
                >
                  M-Pesa number that pays
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
                <p className="mt-1.5 text-[13px] text-[var(--tab-muted)]">
                  The STK prompt and PIN go to this phone — it can be different
                  from the line receiving airtime.
                </p>
                {!samePhones ? (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setPayer(recipient);
                      setError(null);
                    }}
                    className={cn(btnQuietClass, "mt-2")}
                  >
                    Pay from the same number as above
                  </button>
                ) : null}
              </div>

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
              disabled={!canSubmit}
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
                  {amountValid && network
                    ? `Buy ${networkLabel(network)} ${money(amountNum, currency)}`
                    : network
                      ? "Choose an amount"
                      : "Choose a network"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
