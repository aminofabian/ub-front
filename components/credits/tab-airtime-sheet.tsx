"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

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
  kenyanAirtimePhoneMessage,
  kenyanAirtimePhoneOk,
  limitKenyanAirtimePhoneInput,
  toKenyanLocal07,
  type KenyanNetwork,
} from "@/lib/kenyan-phone";
import { formatMoneyCompact, resolveCurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";
import { TabOverlay } from "@/components/credits/tab-overlay";
import {
  TabDestinationCta,
  TabDestinationHeader,
} from "@/components/credits/tab-destination";
import styles from "@/components/credits/customer-tab-mobile.module.css";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tab-fg)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tab-card)]";

const NETWORK_SWATCH: Record<KenyanNetwork, { fill: string; ink: string }> = {
  SAFARICOM: { fill: "#00A651", ink: "#ffffff" },
  AIRTEL: { fill: "#ED1C24", ink: "#ffffff" },
  TELKOM: { fill: "#0054A6", ink: "#ffffff" },
  EQUITEL: { fill: "#FDB913", ink: "#122017" },
  JTL: { fill: "#FF6600", ink: "#ffffff" },
};

type Beat = "amount" | "line" | "pay";

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

function BeatDots({ beat }: { beat: Beat }) {
  const index = beat === "amount" ? 0 : beat === "line" ? 1 : 2;
  return (
    <div className={styles.beat} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(styles.beatDot, i <= index && styles.beatDotOn)}
        />
      ))}
    </div>
  );
}

/**
 * Airtime as a destination: amount, then whose line, then confirm.
 * One job per beat so a phone never has to scroll a jammed ticket.
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
  const [beat, setBeat] = useState<Beat>("amount");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState(defaultPhone);
  const [payer, setPayer] = useState(defaultPhone);
  const [network, setNetwork] = useState<KenyanNetwork | null>(
    detectKenyanNetwork(defaultPhone),
  );
  const [networkTouched, setNetworkTouched] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [otherLine, setOtherLine] = useState(false);
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
    const isOther = !sameNumber(nextRecipient, defaultPhone);
    setRecipient(nextRecipient);
    setPayer(nextPayer);
    setPayerFollows(sameNumber(nextRecipient, nextPayer));
    setNetwork(detectKenyanNetwork(nextRecipient));
    setNetworkTouched(false);
    setNetworkOpen(false);
    setOtherLine(isOther);
    setAmount("");
    setBeat("amount");
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

  const recipientCheck = kenyanAirtimePhoneMessage(recipient);
  const payerCheck = kenyanAirtimePhoneMessage(payer);
  const recipientOk = kenyanAirtimePhoneOk(recipient);
  const payerOk = kenyanAirtimePhoneOk(payer);
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
      setError(e instanceof Error ? e.message : "Could not send the PIN prompt.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const canClose = !busy && !inFlight;
  const waitingPin = Boolean(inFlight && order?.awaitingPayment);
  const title =
    order?.delivered
      ? "Airtime sent"
      : inFlight
        ? waitingPin
          ? "Check your phone"
          : "Sending"
        : beat === "amount"
          ? "How much"
          : beat === "line"
            ? "Whose line"
            : "Confirm";

  function handleBack() {
    if (!canClose) return;
    if (order?.delivered || inFlight) {
      onClose();
      return;
    }
    if (beat === "pay") {
      setBeat("line");
      return;
    }
    if (beat === "line") {
      setBeat("amount");
      return;
    }
    onClose();
  }

  return (
    <TabOverlay
      open={open}
      onClose={onClose}
      labelledBy={`${fieldIdPrefix}-airtime-title`}
      keyboardInset={keyboardInset}
      closeDisabled={!canClose}
      size="destination"
    >
      <TabDestinationHeader
        title={title}
        titleId={`${fieldIdPrefix}-airtime-title`}
        onClose={handleBack}
        closeDisabled={!canClose}
        closeLabel={beat === "amount" || Boolean(order) ? "Back to tab" : "Back"}
      />

      {order?.delivered ? (
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-6">
          <p className={styles.amount}>{money(Number(order.amount), order.currency || currency)}</p>
          <p className={styles.caption}>
            Landed on {formatPhoneDisplay(order.phoneNumber)}
          </p>
          <div className="mt-auto pt-8">
            <button
              type="button"
              onClick={onClose}
              className={cn(styles.pay, focusRing)}
            >
              Back to tab
            </button>
          </div>
        </div>
      ) : inFlight ? (
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-6">
          <p className={styles.amount}>
            {money(Number(order?.amount), order?.currency || currency)}
          </p>
          <p className={styles.caption}>
            {waitingPin
              ? `PIN prompt on ${formatPhoneDisplay(payer)}`
              : `Going to ${formatPhoneDisplay(order?.phoneNumber ?? recipient)}`}
          </p>
          <p className="mt-8 flex items-center gap-2 text-[14px] text-[var(--tab-muted)]">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Waiting for confirmation
          </p>
        </div>
      ) : (
        <fieldset
          disabled={locked}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <legend className="sr-only">Buy airtime</legend>
          <BeatDots beat={beat} />

          {beat === "amount" ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
                <label
                  htmlFor={`${fieldIdPrefix}-airtime-amount`}
                  className="sr-only"
                >
                  Amount
                </label>
                <div className="flex items-end gap-2 border-b border-[var(--tab-fg)]">
                  <span className="pb-2 text-[15px] text-[var(--tab-muted)]" aria-hidden>
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
                      "min-w-0 flex-1 bg-transparent py-1 text-[clamp(2.8rem,14vw,3.8rem)] font-bold leading-none tracking-[-0.038em] tabular-nums outline-none placeholder:text-[color-mix(in_oklab,var(--tab-muted)_55%,transparent)]",
                      focusRing,
                    )}
                  />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
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
                          "min-h-12 px-1 text-[15px] font-semibold tabular-nums active:scale-[0.98] disabled:opacity-40",
                          selected
                            ? "bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                            : "bg-[var(--tab-chip)] text-[var(--tab-fg)]",
                          focusRing,
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
              <TabDestinationCta
                disabled={!amountValid}
                onClick={() => {
                  setBeat("line");
                  setError(null);
                }}
              >
                {amountValid ? `Continue · ${money(amountNum, currency)}` : "Enter an amount"}
              </TabDestinationCta>
            </>
          ) : null}

          {beat === "line" ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
                <p className="text-[13px] text-[var(--tab-muted)]">Airtime goes to</p>
                <button
                  type="button"
                  aria-pressed={!otherLine}
                  disabled={locked}
                  onClick={() => {
                    setOtherLine(false);
                    setRecipient(defaultPhone);
                    if (payerFollows) setPayer(defaultPhone);
                    setNetworkTouched(false);
                    setError(null);
                  }}
                  className={cn(
                    "mt-2 flex min-h-14 w-full items-center justify-between gap-3 px-3.5 text-left",
                    !otherLine
                      ? "bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                      : "bg-[var(--tab-chip)]",
                    focusRing,
                  )}
                >
                  <span>
                    <span className="block text-[16px] font-semibold tabular-nums tracking-[-0.02em]">
                      {formatPhoneDisplay(defaultPhone)}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[12px]",
                        !otherLine ? "opacity-80" : "text-[var(--tab-muted)]",
                      )}
                    >
                      This tab
                    </span>
                  </span>
                  {!otherLine ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                </button>

                <button
                  type="button"
                  aria-pressed={otherLine}
                  disabled={locked}
                  onClick={() => {
                    setOtherLine(true);
                    if (sameNumber(recipient, defaultPhone)) {
                      setRecipient("");
                      if (payerFollows) setPayer("");
                    }
                    setError(null);
                  }}
                  className={cn(
                    "mt-2 flex min-h-12 w-full items-center px-3.5 text-left text-[15px] font-semibold",
                    otherLine
                      ? "bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                      : "bg-[var(--tab-chip)]",
                    focusRing,
                  )}
                >
                  Someone else
                </button>

                {otherLine ? (
                  <div className="mt-3">
                    <label
                      htmlFor={`${fieldIdPrefix}-airtime-recipient`}
                      className="sr-only"
                    >
                      Recipient number
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
                        const next = limitKenyanAirtimePhoneInput(e.target.value);
                        setRecipient(next);
                        if (payerFollows) setPayer(next);
                        setNetworkTouched(false);
                        setError(null);
                      }}
                      placeholder="07…"
                      aria-invalid={Boolean(recipientCheck)}
                      className={cn(
                        "w-full border-b border-[var(--tab-fg)] bg-transparent py-2 text-[1.35rem] font-semibold tabular-nums outline-none",
                        recipientCheck && "border-[var(--tab-error-fg)]",
                        focusRing,
                      )}
                    />
                    {recipientCheck ? (
                      <p
                        role="status"
                        className="mt-1.5 text-[13px] leading-snug text-[var(--tab-error-fg)]"
                      >
                        {recipientCheck}
                      </p>
                    ) : null}
                    {recipientOptions.filter((opt) => !sameNumber(opt.phone, defaultPhone)).length >
                    0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {recipientOptions
                          .filter((opt) => !sameNumber(opt.phone, defaultPhone))
                          .slice(0, 4)
                          .map((opt) => {
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
                                  "min-h-9 px-2.5 text-[12px] tabular-nums",
                                  selected
                                    ? "bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                                    : "bg-[var(--tab-chip)]",
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
                ) : null}

                <div className="mt-7">
                  <p className="text-[13px] text-[var(--tab-muted)]">Network</p>
                  {network ? (
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => setNetworkOpen((openNet) => !openNet)}
                      className={cn(
                        "mt-2 flex min-h-12 w-full items-center justify-between gap-3 px-3.5 text-left",
                        focusRing,
                      )}
                      style={{
                        backgroundColor: NETWORK_SWATCH[network].fill,
                        color: NETWORK_SWATCH[network].ink,
                      }}
                    >
                      <span className="text-[15px] font-semibold">
                        {networkLabel(network)}
                        {detectedFromPhone && !networkTouched
                          ? " · from the number"
                          : ""}
                      </span>
                      <span className="text-[12px] opacity-85">
                        {networkOpen ? "Hide" : "Change"}
                      </span>
                    </button>
                  ) : (
                    <p className="mt-2 text-[14px] text-[var(--tab-muted)]">
                      Enter a Kenyan mobile to pick the network.
                    </p>
                  )}
                  {networkOpen ? (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {KENYAN_NETWORKS.map((n) => {
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
                              setNetworkOpen(false);
                              setError(null);
                            }}
                            className={cn(
                              "flex min-h-11 items-center gap-2 px-3 text-[13px] font-semibold",
                              selected
                                ? "text-white"
                                : "bg-[var(--tab-chip)] text-[var(--tab-fg)]",
                              focusRing,
                            )}
                            style={
                              selected
                                ? { backgroundColor: swatch.fill, color: swatch.ink }
                                : undefined
                            }
                          >
                            <span
                              className="size-2 shrink-0"
                              style={{ backgroundColor: swatch.fill }}
                              aria-hidden
                            />
                            {n.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {networkMismatch && detectedFromPhone ? (
                    <p role="status" className="mt-2 text-[13px] leading-snug text-[var(--tab-muted)]">
                      That number looks like {networkLabel(detectedFromPhone)}.{" "}
                      <button
                        type="button"
                        className={cn("font-semibold underline underline-offset-2", focusRing)}
                        onClick={() => {
                          setNetwork(detectedFromPhone);
                          setNetworkTouched(false);
                          setNetworkOpen(false);
                          setError(null);
                        }}
                      >
                        Use {networkLabel(detectedFromPhone)}
                      </button>
                    </p>
                  ) : null}
                </div>
              </div>
              <TabDestinationCta
                disabled={!recipientOk || network == null}
                onClick={() => {
                  setBeat("pay");
                  setError(null);
                }}
              >
                Continue
              </TabDestinationCta>
            </>
          ) : null}

          {beat === "pay" ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
                <p className={styles.amount}>{money(amountNum, currency)}</p>
                <p className={styles.caption}>
                  {networkLabel(network)} · {formatPhoneDisplay(recipient)}
                </p>

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
                    "mt-8 flex min-h-12 w-full items-center gap-3 bg-[var(--tab-chip)] px-3.5 text-left text-[14px]",
                    focusRing,
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center",
                      payerFollows
                        ? "bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                        : "border border-[var(--tab-fg)]",
                    )}
                    aria-hidden
                  >
                    {payerFollows ? <Check className="size-3" /> : null}
                  </span>
                  PIN prompt to this same number
                </button>
                {!payerFollows ? (
                  <div className="mt-3">
                    <label
                      htmlFor={`${fieldIdPrefix}-airtime-payer`}
                      className="text-[13px] text-[var(--tab-muted)]"
                    >
                      Number that will enter the PIN
                    </label>
                    <input
                      id={`${fieldIdPrefix}-airtime-payer`}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={payer}
                      disabled={locked}
                      onChange={(e) => {
                        const next = limitKenyanAirtimePhoneInput(e.target.value);
                        setPayer(next);
                        setPayerFollows(sameNumber(next, recipient));
                        setError(null);
                      }}
                      placeholder="07…"
                      aria-invalid={Boolean(payerCheck)}
                      className={cn(
                        "mt-1 w-full border-b border-[var(--tab-fg)] bg-transparent py-2 text-[1.2rem] font-semibold tabular-nums outline-none",
                        payerCheck && "border-[var(--tab-error-fg)]",
                        focusRing,
                      )}
                    />
                    {payerCheck ? (
                      <p
                        role="status"
                        className="mt-1.5 text-[13px] text-[var(--tab-error-fg)]"
                      >
                        {payerCheck}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {error ? (
                  <p
                    role="alert"
                    className="mt-4 border border-[var(--tab-error-fg)] px-3 py-2 text-[13px] leading-snug text-[var(--tab-error-fg)]"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
              <TabDestinationCta
                disabled={!canSubmit}
                onClick={() => void submit()}
              >
                {busy
                  ? "Sending prompt…"
                  : `Send PIN · ${money(amountNum, currency)}`}
              </TabDestinationCta>
            </>
          ) : null}
        </fieldset>
      )}
    </TabOverlay>
  );
}
