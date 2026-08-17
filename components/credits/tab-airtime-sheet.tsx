"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, ChevronDown, Loader2, Smartphone, X } from "lucide-react";

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

const fieldClass =
  "w-full border border-[var(--tab-border)] bg-[var(--tab-input)] px-3 py-2.5 text-[16px] font-semibold tabular-nums outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-[var(--tab-focus)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_28%,transparent)] disabled:opacity-50";

const btnPrimaryClass =
  "flex w-full items-center justify-center gap-2 py-3 text-[15px] font-semibold transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tab-card)] active:opacity-85 disabled:cursor-not-allowed disabled:opacity-45";

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
      className={cn("inline-flex h-4 items-end gap-[2px]", className)}
      aria-hidden
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "w-[4px] origin-bottom transition-colors duration-200",
            i < lit ? "bg-current" : "bg-current/25",
          )}
          style={{ height: `${8 + i * 3}px` }}
        />
      ))}
    </span>
  );
}

type PhoneOption = { phone: string; hint: string };

function PhoneCombobox({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
  open,
  onOpenChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: PhoneOption[];
  disabled?: boolean;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const hasOptions = options.length > 0;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [open]);

  return (
    <div ref={rootRef} className="min-w-0">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex min-w-0">
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          disabled={disabled}
          aria-expanded={hasOptions ? open : undefined}
          aria-controls={hasOptions ? `${id}-list` : undefined}
          onChange={(e) => {
            onChange(e.target.value);
            if (hasOptions) onOpenChange(true);
          }}
          onFocus={() => {
            if (hasOptions) onOpenChange(true);
          }}
          className={cn(fieldClass, "min-w-0 flex-1 tracking-wide")}
          placeholder="07…"
        />
        {hasOptions ? (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label={`Saved ${label.toLowerCase()} numbers`}
            onClick={() => onOpenChange(!open)}
            className="flex w-10 shrink-0 items-center justify-center border border-l-0 border-[var(--tab-border)] bg-[var(--tab-input)] text-[var(--tab-muted)] disabled:opacity-40"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-150",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        ) : null}
      </div>
      {open && hasOptions ? (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          className="mt-1.5 max-h-[min(12.5rem,36dvh)] overflow-y-auto overscroll-contain border border-[var(--tab-border)] bg-[var(--tab-card)]"
        >
          {options.map((opt) => {
            const selected = sameNumber(opt.phone, value);
            return (
              <li key={`${opt.hint}-${opt.phone}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left",
                    selected
                      ? "bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                      : "hover:bg-[var(--tab-bg)]",
                  )}
                  onClick={() => {
                    onChange(opt.phone);
                    onOpenChange(false);
                  }}
                >
                  <span className="font-semibold tabular-nums tracking-wide">
                    {formatPhoneDisplay(opt.phone)}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[11px]",
                      selected ? "opacity-80" : "text-[var(--tab-muted)]",
                    )}
                  >
                    {opt.hint}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
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
  const [openPicker, setOpenPicker] = useState<"recipient" | "payer" | null>(null);
  const [payerFollows, setPayerFollows] = useState(true);
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
    setOpenPicker(null);
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

  const fill = amountValid ? Math.min(1, (amountNum - min) / Math.max(1, max - min)) : 0;
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
    setOpenPicker(null);
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
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden border-t-2 border-[var(--tab-border)] bg-[var(--tab-card)] motion-safe:animate-in motion-safe:slide-in-from-bottom-full motion-safe:duration-200 motion-safe:ease-out"
        style={{
          paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom))`,
        }}
      >
        <div className="flex shrink-0 justify-center py-1.5" aria-hidden>
          <div className="h-1 w-10 bg-[var(--tab-border)]" />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2">
          <h2
            id={`${fieldIdPrefix}-airtime-title`}
            className="flex items-center gap-2 text-[1.0625rem] font-semibold tracking-[-0.02em]"
          >
            <SignalBars fill={order?.delivered ? 1 : fill} />
            Buy airtime
          </h2>
          <button
            type="button"
            onClick={() => {
              if (canClose) onClose();
            }}
            disabled={!canClose}
            className="flex size-9 items-center justify-center border border-[var(--tab-border)] text-[var(--tab-muted)] disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
          {order?.delivered ? (
            <div className="border border-[var(--tab-success-fg)] bg-[var(--tab-success-bg)] px-3 py-3 text-[var(--tab-success-fg)]">
              <p className="flex items-center gap-2 text-[15px] font-semibold">
                <CheckCircle2 className="size-5 shrink-0" />
                Airtime sent
              </p>
              <p className="mt-1.5 text-[14px] leading-snug">
                {money(Number(order.amount), order.currency || currency)} landed on{" "}
                {formatPhoneDisplay(order.phoneNumber)}.
              </p>
            </div>
          ) : order && !order.failed ? (
            <div className="border border-[var(--tab-border)] bg-[var(--tab-bg)] px-3 py-3">
              <p className="flex items-center gap-2 text-[15px] font-semibold">
                {order.awaitingPayment ? (
                  <Smartphone className="size-5 shrink-0" />
                ) : (
                  <Loader2 className="size-5 shrink-0 animate-spin" />
                )}
                {money(Number(order.amount), order.currency || currency)} to{" "}
                {formatPhoneDisplay(order.phoneNumber)}
              </p>
              <p className="mt-1.5 text-[14px] leading-snug text-[var(--tab-muted)]">
                {order.awaitingPayment
                  ? `Check ${formatPhoneDisplay(payer)} and enter your M-Pesa PIN.`
                  : "Payment received — sending now."}
              </p>
            </div>
          ) : (
            <fieldset disabled={locked} className="min-w-0 space-y-3">
              <legend className="sr-only">Network, amount, and numbers</legend>
              <div>
                <div className="grid grid-cols-5 gap-1.5">
                  {KENYAN_NETWORKS.map((n) => {
                    const selected = network === n.id;
                    const short =
                      n.id === "SAFARICOM"
                        ? "Saf"
                        : n.id === "AIRTEL"
                          ? "Air"
                          : n.id === "TELKOM"
                            ? "Tel"
                            : n.id === "EQUITEL"
                              ? "Equ"
                              : "JTL";
                    return (
                      <button
                        key={n.id}
                        type="button"
                        aria-pressed={selected}
                        aria-label={n.label}
                        onClick={() => {
                          setNetwork(n.id);
                          setNetworkTouched(true);
                          setError(null);
                        }}
                        className={cn(
                          "min-h-10 border px-1 text-[12px] font-semibold leading-tight disabled:opacity-40",
                          selected
                            ? "border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                            : "border-[var(--tab-border)] bg-[var(--tab-input)]",
                        )}
                      >
                        {short}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[13px] font-medium">Amount</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {quickAmounts.map((n) => {
                    const selected = amountValid && Math.abs(amountNum - n) < 0.001;
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          setAmount(String(n));
                          setOtherAmount(false);
                          setError(null);
                        }}
                        className={cn(
                          "min-h-10 border text-[14px] font-bold tabular-nums disabled:opacity-40",
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
                    className={cn(fieldClass, "mt-1.5 font-bold")}
                    placeholder={`${min}–${max}`}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setOtherAmount(true)}
                    className="mt-1.5 text-[12px] font-medium text-[var(--tab-muted)] underline-offset-2 hover:underline"
                  >
                    Other amount
                  </button>
                )}
              </div>

              <div className="space-y-3 border border-[var(--tab-border)] bg-[var(--tab-bg)] px-3 py-3">
                {lastPair &&
                !(
                  sameNumber(recipient, lastPair.recipient) &&
                  sameNumber(payer, lastPair.payer)
                ) ? (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setRecipient(lastPair.recipient);
                      setPayer(lastPair.payer);
                      setPayerFollows(
                        sameNumber(lastPair.recipient, lastPair.payer),
                      );
                      setNetwork(detectKenyanNetwork(lastPair.recipient));
                      setNetworkTouched(false);
                      setOpenPicker(null);
                      setError(null);
                    }}
                    className="flex w-full items-center justify-between gap-2 border border-[var(--tab-border)] bg-[var(--tab-card)] px-3 py-2 text-left disabled:opacity-40"
                  >
                    <span className="min-w-0 text-[12px] leading-snug text-[var(--tab-muted)]">
                      Last time: airtime to{" "}
                      <span className="font-semibold tabular-nums text-[var(--tab-fg)]">
                        {formatPhoneDisplay(lastPair.recipient)}
                      </span>
                      {sameNumber(lastPair.recipient, lastPair.payer) ? (
                        ", paid from that same phone"
                      ) : (
                        <>
                          {", PIN prompt to "}
                          <span className="font-semibold tabular-nums text-[var(--tab-fg)]">
                            {formatPhoneDisplay(lastPair.payer)}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold">Use</span>
                  </button>
                ) : null}

                <div>
                  <p className="text-[14px] font-semibold leading-snug">
                    Airtime goes to this phone
                  </p>
                  <p className="mb-1.5 mt-0.5 text-[12px] leading-snug text-[var(--tab-muted)]">
                    This is the number that will receive the credit.
                  </p>
                  <PhoneCombobox
                    id={`${fieldIdPrefix}-airtime-recipient`}
                    label="Phone that receives airtime"
                    value={recipient}
                    onChange={(next) => {
                      setRecipient(next);
                      if (payerFollows) setPayer(next);
                      setError(null);
                    }}
                    options={recipientOptions}
                    disabled={locked}
                    open={openPicker === "recipient"}
                    onOpenChange={(next) =>
                      setOpenPicker(next ? "recipient" : null)
                    }
                  />
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={payerFollows}
                  disabled={locked}
                  onClick={() => {
                    const next = !payerFollows;
                    setPayerFollows(next);
                    if (next) setPayer(recipient);
                    setOpenPicker(null);
                    setError(null);
                  }}
                  className="flex w-full items-start gap-3 border border-[var(--tab-border)] bg-[var(--tab-card)] px-3 py-2.5 text-left disabled:opacity-40"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center border",
                      payerFollows
                        ? "border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                        : "border-[var(--tab-border)] bg-[var(--tab-input)]",
                    )}
                    aria-hidden
                  >
                    {payerFollows ? <Check className="size-3.5" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold leading-snug">
                      Send the PIN prompt to this same number
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-[var(--tab-muted)]">
                      {payerFollows
                        ? `M-Pesa will ask ${formatPhoneDisplay(recipient) || "this phone"} for the PIN.`
                        : "Turn this on if you are buying for yourself."}
                    </span>
                  </span>
                </button>

                {!payerFollows ? (
                  <div>
                    <p className="text-[14px] font-semibold leading-snug">
                      PIN prompt goes to this phone
                    </p>
                    <p className="mb-1.5 mt-0.5 text-[12px] leading-snug text-[var(--tab-muted)]">
                      After you tap Buy, M-Pesa will ping this number — enter the PIN there.
                    </p>
                    <PhoneCombobox
                      id={`${fieldIdPrefix}-airtime-payer`}
                      label="Phone that receives the M-Pesa PIN prompt"
                      value={payer}
                      onChange={(next) => {
                        setPayer(next);
                        setPayerFollows(sameNumber(next, recipient));
                        setError(null);
                      }}
                      options={payerOptions}
                      disabled={locked}
                      open={openPicker === "payer"}
                      onOpenChange={(next) =>
                        setOpenPicker(next ? "payer" : null)
                      }
                    />
                  </div>
                ) : null}
              </div>

              {networkMismatch && detectedFromPhone ? (
                <p
                  role="status"
                  className="text-[12px] leading-snug text-[var(--tab-muted)]"
                >
                  That number looks like {networkLabel(detectedFromPhone)}.{" "}
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-2"
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

              {error ? (
                <p
                  role="alert"
                  className="border border-[var(--tab-error-fg)] bg-[var(--tab-error-bg)] px-3 py-2 text-[13px] text-[var(--tab-error-fg)]"
                >
                  {error}
                </p>
              ) : null}
            </fieldset>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--tab-border)] px-4 py-2.5">
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
            <p className="flex items-center justify-center gap-2 py-1.5 text-[13px] text-[var(--tab-muted)]">
              <Loader2 className="size-4 animate-spin" />
              Waiting for confirmation…
            </p>
          ) : (
            <>
              {recipientOk ? (
                <div className="mb-2 space-y-0.5 text-[12px] leading-snug text-[var(--tab-muted)]">
                  <p>
                    Airtime lands on{" "}
                    <span className="font-semibold tabular-nums text-[var(--tab-fg)]">
                      {formatPhoneDisplay(recipient)}
                    </span>
                    .
                  </p>
                  {payerOk ? (
                    <p>
                      PIN prompt goes to{" "}
                      <span className="font-semibold tabular-nums text-[var(--tab-fg)]">
                        {payerFollows || sameNumber(recipient, payer)
                          ? "that same phone"
                          : formatPhoneDisplay(payer)}
                      </span>
                      .
                    </p>
                  ) : (
                    <p>Add the phone that should get the M-Pesa PIN prompt.</p>
                  )}
                </div>
              ) : (
                <p className="mb-2 text-[12px] leading-snug text-[var(--tab-muted)]">
                  Enter the phone that should receive the airtime.
                </p>
              )}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
