"use client";

import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes } from "react";
import { Check, Loader2, Signal, X } from "lucide-react";

import {
  createPublicTabAirtimeOrder,
  fetchPublicTabAirtimeOrder,
  tabAirtimeRecentsFromConfig,
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
import { TabOverlay } from "@/components/credits/tab-overlay";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tab-fg)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tab-card)]";

/** Kenyan telco marks — same fills as the cashier airtime board. */
const NETWORK_SWATCH: Record<KenyanNetwork, { fill: string; ink: string }> = {
  SAFARICOM: { fill: "#00A651", ink: "#ffffff" },
  AIRTEL: { fill: "#ED1C24", ink: "#ffffff" },
  TELKOM: { fill: "#0054A6", ink: "#ffffff" },
  EQUITEL: { fill: "#FDB913", ink: "#122017" },
  JTL: { fill: "#FF6600", ink: "#ffffff" },
};

function money(n: number, currency: string) {
  return formatMoneyCompact(n, resolveCurrencyCode(currency));
}

function formatPhoneDisplay(raw: string): string {
  const digits = (toKenyanLocal07(raw) || raw).replace(/\D/g, "");
  if (digits.length === 10 && (digits.startsWith("07") || digits.startsWith("01"))) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

function networkLabel(id: KenyanNetwork | null): string {
  return KENYAN_NETWORKS.find((n) => n.id === id)?.label ?? "this network";
}

function sameNumber(a: string, b: string): boolean {
  return (
    (toKenyanLocal07(a) || a.replace(/\D/g, "")) ===
    (toKenyanLocal07(b) || b.replace(/\D/g, ""))
  );
}

function BracketButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type="button"
      className={cn(
        "inline-flex min-h-9 items-center gap-2 px-1 font-mono text-[13px] disabled:opacity-40",
        focusRing,
        className,
      )}
    >
      <span aria-hidden>[</span>
      {children}
      <span aria-hidden>]</span>
    </button>
  );
}

type PhoneOption = { phone: string; hint: string };

type Props = {
  open: boolean;
  onClose: () => void;
  tabPhone: string;
  config: PublicTabAirtimeConfig;
  keyboardInset: number;
  fieldIdPrefix: string;
  onDelivered?: () => void;
};

/**
 * Thumb-first airtime purchase for the customer tab.
 *
 * One viewport: amount, who receives it, which network, who pays.
 * Networks are pressable tiles, not a list. The ticket does not scroll.
 */
export function TabAirtimeSheet({
  open,
  onClose,
  tabPhone,
  config,
  keyboardInset,
  fieldIdPrefix,
  onDelivered,
}: Props) {
  const currency = config.currency || "KES";
  const defaultPhone = toKenyanLocal07(tabPhone) || tabPhone;
  const recents = tabAirtimeRecentsFromConfig(config);
  const configRef = useRef(config);
  configRef.current = config;
  const amountRef = useRef<HTMLInputElement>(null);
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
  const [payerFollows, setPayerFollows] = useState(true);
  const notifiedDeliveredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const stored = tabAirtimeRecentsFromConfig(configRef.current);
    const nextRecipient = stored.lastRecipient || defaultPhone;
    const nextPayer = stored.lastPayer || defaultPhone;
    setRecipient(nextRecipient);
    setPayer(nextPayer);
    setPayerFollows(sameNumber(nextRecipient, nextPayer));
    setNetwork(detectKenyanNetwork(nextRecipient));
    setNetworkTouched(false);
    setAmount("");
    setBusy(false);
    setError(null);
    setOrder(null);
    notifiedDeliveredRef.current = null;
    const id = window.requestAnimationFrame(() => {
      amountRef.current?.focus();
      amountRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
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

  const inFlight = Boolean(order && !order.delivered && !order.failed);
  const locked = busy || inFlight;
  const canSubmit =
    !locked && amountValid && recipientOk && payerOk && network != null;

  const recipientOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: PhoneOption[] = [];
    const add = (phone: string, hint: string) => {
      const local = toKenyanLocal07(phone);
      if (!local || seen.has(local)) return;
      seen.add(local);
      out.push({ phone: local, hint });
    };
    add(defaultPhone, "This tab");
    for (const phone of recents.recipients) {
      add(phone, networkLabel(detectKenyanNetwork(phone)));
    }
    return out;
  }, [defaultPhone, recents.recipients]);

  const lastPair =
    recents.lastRecipient &&
    recents.lastPayer &&
    (!sameNumber(recents.lastRecipient, defaultPhone) ||
      !sameNumber(recents.lastPayer, defaultPhone))
      ? { recipient: recents.lastRecipient, payer: recents.lastPayer }
      : null;

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

  useEffect(() => {
    if (!order?.delivered) return;
    if (notifiedDeliveredRef.current === order.orderId) return;
    notifiedDeliveredRef.current = order.orderId;
    onDelivered?.();
  }, [order, onDelivered]);

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
  const waitingPin = Boolean(inFlight && order?.awaitingPayment);

  return (
    <TabOverlay
      open={open}
      onClose={onClose}
      labelledBy={`${fieldIdPrefix}-airtime-title`}
      keyboardInset={keyboardInset}
      closeDisabled={!canClose}
      size="ticket"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden font-mono text-[var(--tab-fg)]">
        <div className="mx-3 mb-3 flex min-h-0 flex-1 flex-col overflow-hidden border-y-2 border-[var(--tab-fg)]">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-x border-dashed border-[var(--tab-fg)]">
            <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3 pb-2">
              <h2
                id={`${fieldIdPrefix}-airtime-title`}
                className="flex min-w-0 items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]"
              >
                <Signal className="size-4 shrink-0" aria-hidden />
                Airtime
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (canClose) onClose();
                }}
                disabled={!canClose}
                className={cn("flex size-9 items-center justify-center disabled:opacity-40", focusRing)}
                aria-label="Close"
              >
                <X className="size-4" aria-hidden />
              </button>
            </header>

            {order?.delivered ? (
              <div className="flex min-h-0 flex-1 flex-col justify-between px-4 pb-4">
                <div className="border-2 border-[var(--tab-fg)] px-4 py-5 text-center">
                  <p className="text-[1.5rem] font-semibold leading-none tracking-[-0.03em]">
                    Airtime sent
                  </p>
                  <p className="mt-2.5 text-[14px] leading-snug text-[var(--tab-muted)]">
                    {money(Number(order.amount), order.currency || currency)} landed on{" "}
                    {formatPhoneDisplay(order.phoneNumber)}
                  </p>
                </div>
                <BracketButton className="self-start" onClick={onClose}>
                  Done
                </BracketButton>
              </div>
            ) : inFlight ? (
              <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
                <div className="border-2 border-[var(--tab-fg)] px-4 py-5 text-center">
                  <p className="text-[1.5rem] font-semibold leading-none tracking-[-0.03em]">
                    {waitingPin ? "Check your phone" : "Sending now"}
                  </p>
                  <p className="mt-2.5 text-[14px] leading-snug text-[var(--tab-muted)]">
                    {waitingPin
                      ? `PIN prompt on ${formatPhoneDisplay(payer)}`
                      : `${money(Number(order?.amount), order?.currency || currency)} to ${formatPhoneDisplay(order?.phoneNumber ?? recipient)}`}
                  </p>
                </div>
                <p className="mt-4 flex items-center gap-2 text-[13px] text-[var(--tab-muted)]">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Waiting for confirmation…
                </p>
              </div>
            ) : (
              <fieldset
                disabled={locked}
                className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4"
              >
                <legend className="sr-only">Amount, recipient, network, and payer</legend>
                <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-hidden">
                  <div className="min-h-0 space-y-3 overflow-hidden">
                    <div>
                      <label
                        htmlFor={`${fieldIdPrefix}-airtime-amount`}
                        className="text-[12px] text-[var(--tab-muted)]"
                      >
                        Amount
                      </label>
                      <div className="mt-1 flex items-baseline gap-2 border-b-2 border-[var(--tab-fg)]">
                        <span className="pb-1 text-[13px] text-[var(--tab-muted)]" aria-hidden>
                          KSh
                        </span>
                        <input
                          ref={amountRef}
                          id={`${fieldIdPrefix}-airtime-amount`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          enterKeyHint="next"
                          value={amount}
                          disabled={locked}
                          onChange={(e) => {
                            const next = e.target.value.replace(/[^\d.]/g, "");
                            setAmount(next);
                            setError(null);
                          }}
                          placeholder="0"
                          className={cn(
                            "min-w-0 flex-1 bg-transparent py-1 text-[1.75rem] font-semibold leading-none tracking-[-0.03em] tabular-nums outline-none placeholder:text-[var(--tab-muted)]",
                            focusRing,
                          )}
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {quickAmounts.map((n) => {
                          const selected = amountValid && Math.abs(amountNum - n) < 0.001;
                          return (
                            <button
                              key={n}
                              type="button"
                              disabled={locked}
                              aria-pressed={selected}
                              onClick={() => {
                                setAmount(String(n));
                                setError(null);
                              }}
                              className={cn(
                                "min-h-10 border-2 px-1 text-[13px] font-semibold tabular-nums active:scale-[0.98] disabled:opacity-40",
                                selected
                                  ? "border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                                  : "border-[var(--tab-fg)] bg-transparent",
                                focusRing,
                              )}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`${fieldIdPrefix}-airtime-recipient`}
                        className="text-[12px] text-[var(--tab-muted)]"
                      >
                        Airtime goes to
                      </label>
                      <input
                        id={`${fieldIdPrefix}-airtime-recipient`}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        enterKeyHint="next"
                        value={recipient}
                        disabled={locked}
                        onChange={(e) => {
                          const next = e.target.value;
                          setRecipient(next);
                          if (payerFollows) setPayer(next);
                          setNetworkTouched(false);
                          setError(null);
                        }}
                        placeholder="07…"
                        className={cn(
                          "mt-1 w-full border-b-2 border-[var(--tab-fg)] bg-transparent py-2 text-[16px] font-semibold tabular-nums outline-none",
                          focusRing,
                        )}
                      />
                      {recipientOptions.length > 1 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {recipientOptions.slice(0, 3).map((opt) => {
                            const selected = sameNumber(opt.phone, recipient);
                            return (
                              <button
                                key={opt.phone}
                                type="button"
                                disabled={locked}
                                aria-pressed={selected}
                                onClick={() => {
                                  setRecipient(opt.phone);
                                  if (payerFollows) setPayer(opt.phone);
                                  setNetworkTouched(false);
                                  setError(null);
                                }}
                                className={cn(
                                  "min-h-8 border px-2 text-[11px] tabular-nums disabled:opacity-40",
                                  selected
                                    ? "border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                                    : "border-[var(--tab-fg)]",
                                  focusRing,
                                )}
                              >
                                {formatPhoneDisplay(opt.phone)}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <p id={`${fieldIdPrefix}-airtime-network`} className="text-[12px] text-[var(--tab-muted)]">
                        Network
                      </p>
                      <div
                        role="group"
                        aria-labelledby={`${fieldIdPrefix}-airtime-network`}
                        className="mt-1.5 grid grid-cols-6 gap-1.5"
                      >
                        {KENYAN_NETWORKS.map((n, index) => {
                          const selected = network === n.id;
                          const swatch = NETWORK_SWATCH[n.id];
                          return (
                            <button
                              key={n.id}
                              type="button"
                              aria-pressed={selected}
                              disabled={locked}
                              onClick={() => {
                                setNetwork(n.id);
                                setNetworkTouched(true);
                                setError(null);
                              }}
                              className={cn(
                                "flex min-h-12 items-center justify-center gap-1.5 border-2 px-1 text-[12px] font-semibold leading-none active:scale-[0.98] disabled:opacity-40",
                                index < 3 ? "col-span-2" : "col-span-3",
                                selected
                                  ? "border-transparent"
                                  : "border-[var(--tab-fg)] bg-[var(--tab-chip)] hover:bg-[color-mix(in_oklab,var(--tab-fg)_8%,var(--tab-card))]",
                                focusRing,
                              )}
                              style={
                                selected
                                  ? {
                                      backgroundColor: swatch.fill,
                                      borderColor: swatch.fill,
                                      color: swatch.ink,
                                    }
                                  : undefined
                              }
                            >
                              <span
                                className="size-2.5 shrink-0"
                                style={{ backgroundColor: selected ? swatch.ink : swatch.fill }}
                                aria-hidden
                              />
                              {n.label}
                            </button>
                          );
                        })}
                      </div>
                      {networkMismatch && detectedFromPhone ? (
                        <p role="status" className="mt-1.5 text-[12px] leading-snug text-[var(--tab-muted)]">
                          That number looks like {networkLabel(detectedFromPhone)}.{" "}
                          <button
                            type="button"
                            className={cn("font-semibold underline underline-offset-2", focusRing)}
                            onClick={() => {
                              setNetwork(detectedFromPhone);
                              setNetworkTouched(false);
                              setError(null);
                            }}
                          >
                            Use {networkLabel(detectedFromPhone)}
                          </button>
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={payerFollows}
                        disabled={locked}
                        onClick={() => {
                          const next = !payerFollows;
                          setPayerFollows(next);
                          if (next) setPayer(recipient);
                          setError(null);
                        }}
                        className={cn(
                          "flex min-h-10 w-full items-center gap-2 border-2 border-[var(--tab-fg)] px-2.5 text-left text-[13px] disabled:opacity-40",
                          focusRing,
                        )}
                      >
                        {payerFollows ? (
                          <Check className="size-3.5 shrink-0" aria-hidden />
                        ) : (
                          <span className="size-3.5 shrink-0 border border-current" aria-hidden />
                        )}
                        <span className="min-w-0">PIN prompt to this same number</span>
                      </button>
                      {!payerFollows ? (
                        <div className="mt-2">
                          <label
                            htmlFor={`${fieldIdPrefix}-airtime-payer`}
                            className="text-[12px] text-[var(--tab-muted)]"
                          >
                            Number making payment
                          </label>
                          <input
                            id={`${fieldIdPrefix}-airtime-payer`}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={payer}
                            disabled={locked}
                            onChange={(e) => {
                              const next = e.target.value;
                              setPayer(next);
                              setPayerFollows(sameNumber(next, recipient));
                              setError(null);
                            }}
                            placeholder="07…"
                            className={cn(
                              "mt-1 w-full border-b-2 border-[var(--tab-fg)] bg-transparent py-2 text-[16px] font-semibold tabular-nums outline-none",
                              focusRing,
                            )}
                          />
                        </div>
                      ) : null}
                      {lastPair &&
                      !(
                        sameNumber(recipient, lastPair.recipient) &&
                        sameNumber(payer, lastPair.payer)
                      ) ? (
                        <BracketButton
                          className="mt-1"
                          disabled={locked}
                          onClick={() => {
                            setRecipient(lastPair.recipient);
                            setPayer(lastPair.payer);
                            setPayerFollows(
                              sameNumber(lastPair.recipient, lastPair.payer),
                            );
                            setNetwork(detectKenyanNetwork(lastPair.recipient));
                            setNetworkTouched(false);
                            setError(null);
                          }}
                        >
                          Last: {formatPhoneDisplay(lastPair.recipient)}
                        </BracketButton>
                      ) : null}
                    </div>

                    {error ? (
                      <p
                        role="alert"
                        className="border border-[var(--tab-error-fg)] px-3 py-2 text-[12px] leading-snug text-[var(--tab-error-fg)]"
                      >
                        {error}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={!canSubmit}
                      onClick={() => void submit()}
                      className={cn(
                        "flex min-h-12 w-full items-center justify-center gap-2 border-2 border-[var(--tab-fg)] bg-[var(--tab-fg)] px-3 text-[14px] font-semibold text-[var(--tab-bg)] active:scale-[0.99] disabled:bg-transparent disabled:text-[var(--tab-fg)] disabled:opacity-40",
                        focusRing,
                      )}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          Sending prompt…
                        </>
                      ) : amountValid && network ? (
                        `Buy ${networkLabel(network)} ${money(amountNum, currency)}`
                      ) : amountValid ? (
                        "Choose a network"
                      ) : (
                        "Enter an amount"
                      )}
                    </button>
                  </div>
                </div>
              </fieldset>
            )}
          </div>
        </div>
      </div>
    </TabOverlay>
  );
}
