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

function sameNumber(a: string, b: string): boolean {
  return (
    (toKenyanLocal07(a) || a.replace(/\D/g, "")) ===
    (toKenyanLocal07(b) || b.replace(/\D/g, ""))
  );
}

function SectionRule({ title }: { title: string }) {
  return (
    <div className="flex items-end gap-3">
      <h3 className="shrink-0 text-[13px] font-medium">{title}</h3>
      <span className="mb-1.5 h-px min-w-0 flex-1 bg-[var(--tab-fg)]" aria-hidden />
    </div>
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

function StatusBox({
  title,
  detail,
}: {
  title: string;
  detail?: string | null;
}) {
  return (
    <div className="border-2 border-[var(--tab-fg)] px-4 py-4 text-center">
      <p className="text-[1.5rem] font-semibold leading-none tracking-[-0.03em]">
        {title}
      </p>
      {detail ? (
        <p className="mt-2.5 text-[14px] leading-snug text-[var(--tab-muted)]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

type PhoneOption = { phone: string; hint: string };

function PhoneList({
  label,
  value,
  onChange,
  options,
  disabled,
  otherOpen,
  onOtherOpen,
  fieldId,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: PhoneOption[];
  disabled?: boolean;
  otherOpen: boolean;
  onOtherOpen: (next: boolean) => void;
  fieldId: string;
}) {
  const known = options.some((opt) => sameNumber(opt.phone, value));

  return (
    <div>
      <SectionRule title={label} />
      <ul className="mt-3 space-y-1">
        {options.map((opt) => {
          const selected = !otherOpen && sameNumber(opt.phone, value);
          return (
            <li key={`${opt.hint}-${opt.phone}`}>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => {
                  onChange(opt.phone);
                  onOtherOpen(false);
                }}
                className={cn(
                  "flex min-h-9 w-full items-center gap-3 text-left disabled:opacity-40",
                  focusRing,
                )}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full bg-[var(--tab-fg)]"
                  aria-hidden
                />
                <span className="min-w-0 tabular-nums">
                  {formatPhoneDisplay(opt.phone)}
                </span>
                <span className="ml-auto shrink-0 text-[12px] text-[var(--tab-muted)]">
                  {opt.hint}
                </span>
                {selected ? (
                  <Check className="size-3.5 shrink-0" aria-hidden />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <BracketButton
        className="mt-1"
        disabled={disabled}
        aria-pressed={otherOpen || (Boolean(value) && !known)}
        onClick={() => onOtherOpen(!otherOpen)}
      >
        {otherOpen ? "Cancel" : "+ Other phone"}
      </BracketButton>
      {otherOpen || (Boolean(value) && !known) ? (
        <div className="mt-2">
          <label htmlFor={fieldId} className="sr-only">
            {label}
          </label>
          <input
            id={fieldId}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="07…"
            className={cn(
              "w-full border-b border-[var(--tab-fg)] bg-transparent py-2 text-[16px] font-semibold tabular-nums outline-none",
              focusRing,
            )}
          />
        </div>
      ) : null}
    </div>
  );
}

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
 * Numbers live in the sheet flow so saved phones never spill off-screen.
 * Copy names the two jobs in plain language: who receives airtime, who
 * gets the M-Pesa PIN prompt.
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
  const [amount, setAmount] = useState("");
  const [otherAmount, setOtherAmount] = useState(false);
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
  const [otherRecipient, setOtherRecipient] = useState(false);
  const [otherPayer, setOtherPayer] = useState(false);
  const notifiedDeliveredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const stored = tabAirtimeRecentsFromConfig(configRef.current);
    const chips = (configRef.current.quickAmounts?.length
      ? configRef.current.quickAmounts.map(Number)
      : [20, 50, 100, 250, 500, 1000]
    ).filter((n) => Number.isFinite(n));
    const nextRecipient = stored.lastRecipient || defaultPhone;
    const nextPayer = stored.lastPayer || defaultPhone;
    setRecipient(nextRecipient);
    setPayer(nextPayer);
    setPayerFollows(sameNumber(nextRecipient, nextPayer));
    setNetwork(detectKenyanNetwork(nextRecipient));
    setNetworkTouched(false);
    if (stored.lastAmount && stored.lastAmount > 0) {
      setAmount(String(stored.lastAmount));
      setOtherAmount(!chips.some((n) => Math.abs(n - stored.lastAmount!) < 0.001));
    } else {
      setAmount("");
      setOtherAmount(false);
    }
    setBusy(false);
    setError(null);
    setOrder(null);
    setOtherRecipient(false);
    setOtherPayer(false);
    notifiedDeliveredRef.current = null;
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
    !locked && amountValid && recipientOk && payerOk && network != null && !networkMismatch;

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

  const payerOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: PhoneOption[] = [];
    const add = (phone: string, hint: string) => {
      const local = toKenyanLocal07(phone);
      if (!local || seen.has(local)) return;
      seen.add(local);
      out.push({ phone: local, hint });
    };
    add(defaultPhone, "This tab");
    for (const phone of recents.payers) {
      add(phone, "Paid before");
    }
    return out;
  }, [defaultPhone, recents.payers]);

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
  const statusTitle = order?.delivered
    ? "Airtime sent"
    : inFlight && order?.awaitingPayment
      ? "Check your phone"
      : inFlight
        ? "Sending now"
        : amountValid
          ? money(amountNum, currency)
          : "Choose an amount";
  const statusDetail = order?.delivered
    ? `${money(Number(order.amount), order.currency || currency)} landed on ${formatPhoneDisplay(order.phoneNumber)}`
    : inFlight && order?.awaitingPayment
      ? `PIN prompt on ${formatPhoneDisplay(payer)}`
      : inFlight
        ? `${money(Number(order?.amount), order?.currency || currency)} to ${formatPhoneDisplay(order?.phoneNumber ?? recipient)}`
        : recipientOk
          ? `to ${formatPhoneDisplay(recipient)}`
          : "then the phone that should receive it";

  return (
    <TabOverlay
      open={open}
      onClose={onClose}
      labelledBy={`${fieldIdPrefix}-airtime-title`}
      keyboardInset={keyboardInset}
      closeDisabled={!canClose}
      size="ticket"
    >
      <div className="flex min-h-0 flex-1 flex-col font-mono text-[var(--tab-fg)]">
        <div className="mx-3 mb-3 flex min-h-0 flex-1 flex-col border-y-2 border-[var(--tab-fg)]">
          <div className="flex min-h-0 flex-1 flex-col border-x border-dashed border-[var(--tab-fg)]">
            <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-3">
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
              <StatusBox title={statusTitle} detail={statusDetail} />

              {order?.delivered ? (
                <BracketButton className="mt-6" onClick={onClose}>
                  Done
                </BracketButton>
              ) : inFlight ? (
                <p className="mt-6 flex items-center gap-2 text-[13px] text-[var(--tab-muted)]">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Waiting for confirmation…
                </p>
              ) : (
                <fieldset disabled={locked} className="min-w-0">
                  <legend className="sr-only">Network, amount, and numbers</legend>

                  {lastPair &&
                  !(
                    sameNumber(recipient, lastPair.recipient) &&
                    sameNumber(payer, lastPair.payer)
                  ) ? (
                    <BracketButton
                      className="mt-5"
                      disabled={locked}
                      onClick={() => {
                        setRecipient(lastPair.recipient);
                        setPayer(lastPair.payer);
                        setPayerFollows(
                          sameNumber(lastPair.recipient, lastPair.payer),
                        );
                        setNetwork(detectKenyanNetwork(lastPair.recipient));
                        setNetworkTouched(false);
                        setOtherRecipient(false);
                        setOtherPayer(false);
                        setError(null);
                      }}
                    >
                      Use last: {formatPhoneDisplay(lastPair.recipient)}
                    </BracketButton>
                  ) : null}

                  <section className="mt-6">
                    <SectionRule title="Network" />
                    <ul className="mt-3 space-y-1">
                      {KENYAN_NETWORKS.map((n) => {
                        const selected = network === n.id;
                        return (
                          <li key={n.id}>
                            <button
                              type="button"
                              aria-pressed={selected}
                              disabled={locked}
                              onClick={() => {
                                setNetwork(n.id);
                                setNetworkTouched(true);
                                setError(null);
                              }}
                              className={cn(
                                "flex min-h-9 w-full items-center gap-3 text-left disabled:opacity-40",
                                focusRing,
                              )}
                            >
                              <span
                                className="size-1.5 shrink-0 rounded-full bg-[var(--tab-fg)]"
                                aria-hidden
                              />
                              <span>{n.label}</span>
                              {selected ? (
                                <Check className="ml-auto size-3.5 shrink-0" aria-hidden />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {networkMismatch && detectedFromPhone ? (
                      <p role="status" className="mt-2 text-[12px] leading-snug text-[var(--tab-muted)]">
                        That number looks like {networkLabel(detectedFromPhone)}.{" "}
                        <button
                          type="button"
                          className={cn("font-semibold underline underline-offset-2", focusRing)}
                          onClick={() => {
                            setNetwork(detectedFromPhone);
                            setNetworkTouched(true);
                            setError(null);
                          }}
                        >
                          Switch
                        </button>
                      </p>
                    ) : null}
                  </section>

                  <section className="mt-7">
                    <SectionRule title="Amount" />
                    <ul className="mt-3 space-y-1">
                      {quickAmounts.map((n) => {
                        const selected =
                          !otherAmount &&
                          amountValid &&
                          Math.abs(amountNum - n) < 0.001;
                        return (
                          <li key={n}>
                            <button
                              type="button"
                              disabled={locked}
                              aria-pressed={selected}
                              onClick={() => {
                                setAmount(String(n));
                                setOtherAmount(false);
                                setError(null);
                              }}
                              className={cn(
                                "flex min-h-9 w-full items-center gap-3 text-left tabular-nums disabled:opacity-40",
                                focusRing,
                              )}
                            >
                              <span
                                className="size-1.5 shrink-0 rounded-full bg-[var(--tab-fg)]"
                                aria-hidden
                              />
                              <span>{money(n, currency)}</span>
                              {selected ? (
                                <Check className="ml-auto size-3.5 shrink-0" aria-hidden />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <BracketButton
                      className="mt-1"
                      disabled={locked}
                      aria-pressed={otherAmount}
                      onClick={() => {
                        setOtherAmount(true);
                        setError(null);
                      }}
                    >
                      Other amount
                    </BracketButton>
                    {otherAmount ? (
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
                        className={cn(
                          "mt-2 w-full border-b border-[var(--tab-fg)] bg-transparent py-2 text-[16px] font-semibold tabular-nums outline-none",
                          focusRing,
                        )}
                        placeholder={`${min}–${max}`}
                      />
                    ) : null}
                  </section>

                  <section className="mt-7">
                    <PhoneList
                      fieldId={`${fieldIdPrefix}-airtime-recipient`}
                      label="Airtime goes to"
                      value={recipient}
                      onChange={(next) => {
                        setRecipient(next);
                        if (payerFollows) setPayer(next);
                        setError(null);
                      }}
                      options={recipientOptions}
                      disabled={locked}
                      otherOpen={otherRecipient}
                      onOtherOpen={setOtherRecipient}
                    />
                  </section>

                  <section className="mt-7">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={payerFollows}
                      disabled={locked}
                      onClick={() => {
                        const next = !payerFollows;
                        setPayerFollows(next);
                        if (next) {
                          setPayer(recipient);
                          setOtherPayer(false);
                        }
                        setError(null);
                      }}
                      className={cn(
                        "flex min-h-9 w-full items-center gap-3 text-left disabled:opacity-40",
                        focusRing,
                      )}
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-[var(--tab-fg)]"
                        aria-hidden
                      />
                      <span className="min-w-0">PIN prompt to this same number</span>
                      {payerFollows ? (
                        <Check className="ml-auto size-3.5 shrink-0" aria-hidden />
                      ) : null}
                    </button>
                    {!payerFollows ? (
                      <div className="mt-4">
                        <PhoneList
                          fieldId={`${fieldIdPrefix}-airtime-payer`}
                          label="PIN prompt goes to"
                          value={payer}
                          onChange={(next) => {
                            setPayer(next);
                            setPayerFollows(sameNumber(next, recipient));
                            setError(null);
                          }}
                          options={payerOptions}
                          disabled={locked}
                          otherOpen={otherPayer}
                          onOtherOpen={setOtherPayer}
                        />
                      </div>
                    ) : null}
                  </section>

                  {error ? (
                    <p
                      role="alert"
                      className="mt-6 border border-[var(--tab-error-fg)] px-3 py-2 text-[13px] text-[var(--tab-error-fg)]"
                    >
                      {error}
                    </p>
                  ) : null}

                  <div className="mt-7">
                    <BracketButton disabled={!canSubmit} onClick={() => void submit()}>
                      {busy ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          Sending prompt…
                        </>
                      ) : amountValid && network ? (
                        `Buy ${networkLabel(network)} ${money(amountNum, currency)}`
                      ) : network ? (
                        "Choose an amount"
                      ) : (
                        "Choose a network"
                      )}
                    </BracketButton>
                    {recipientOk && payerOk ? (
                      <p className="mt-2 text-[12px] leading-snug text-[var(--tab-muted)]">
                        {payerFollows || sameNumber(recipient, payer)
                          ? `PIN and airtime both on ${formatPhoneDisplay(recipient)}.`
                          : `Airtime to ${formatPhoneDisplay(recipient)}. PIN on ${formatPhoneDisplay(payer)}.`}
                      </p>
                    ) : (
                      <p className="mt-2 text-[12px] leading-snug text-[var(--tab-muted)]">
                        Enter the phone that should receive the airtime.
                      </p>
                    )}
                  </div>
                </fieldset>
              )}
            </div>
          </div>
        </div>
      </div>
    </TabOverlay>
  );
}
