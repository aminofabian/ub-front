"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Signal, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createPublicAirtimeOrderBrowser,
  fetchPublicAirtimeConfigBrowser,
  fetchPublicAirtimeOrderBrowser,
  type PublicAirtimeConfig,
  type PublicAirtimeOrder,
} from "@/lib/public-storefront-client";
import { formatDisplayPrice } from "@/lib/public-storefront";
import {
  detectKenyanNetwork,
  KENYAN_NETWORKS,
  kenyanAirtimePhoneMessage,
  kenyanAirtimePhoneOk,
  limitKenyanAirtimePhoneInput,
  type KenyanNetwork,
} from "@/lib/kenyan-phone";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  accentHex?: string | null;
  /** Pre-fetched config avoids a second round trip when the host already has it. */
  initialConfig?: PublicAirtimeConfig | null;
  className?: string;
};

function isTerminal(order: PublicAirtimeOrder | null) {
  return order != null && (order.delivered || order.failed);
}

/**
 * Shopper-facing airtime purchase.
 *
 * <p>The shop pays for the airtime out of its wallet, so the shopper only has to
 * approve one M-Pesa prompt. Delivery is confirmed asynchronously, hence the
 * polling once the STK push is accepted.
 */
export function ShopAirtimeFlow({
  slug,
  accentHex,
  initialConfig = null,
  className,
}: Props) {
  const [config, setConfig] = useState<PublicAirtimeConfig | null>(initialConfig);
  const [loading, setLoading] = useState(initialConfig == null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [network, setNetwork] = useState<KenyanNetwork | null>(null);
  const [networkTouched, setNetworkTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<PublicAirtimeOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);

  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;

  useEffect(() => {
    if (initialConfig != null) return;
    let stopped = false;
    fetchPublicAirtimeConfigBrowser(slug)
      .then((c) => {
        if (!stopped) setConfig(c);
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [slug, initialConfig]);

  const currency = config?.currency || "KES";
  const price = useCallback(
    (n: number | null | undefined) =>
      formatDisplayPrice(currency, typeof n === "number" ? n : 0),
    [currency],
  );

  const detectedFromPhone = detectKenyanNetwork(recipient);
  const networkMismatch =
    Boolean(network) &&
    Boolean(detectedFromPhone) &&
    network !== detectedFromPhone;
  const amountValue = Number(amount);
  const amountValid =
    Number.isFinite(amountValue) &&
    amountValue >= (config?.minAmount ?? 1) &&
    amountValue <= (config?.maxAmount ?? Number.POSITIVE_INFINITY);
  const recipientHint = kenyanAirtimePhoneMessage(recipient);
  const payerHint = kenyanAirtimePhoneMessage(payer || recipient);
  const payerOk = kenyanAirtimePhoneOk(payer || recipient);
  const canSubmit =
    !submitting &&
    config?.available === true &&
    kenyanAirtimePhoneOk(recipient) &&
    amountValid &&
    network != null &&
    payerOk;

  useEffect(() => {
    if (networkTouched) return;
    if (detectedFromPhone) setNetwork(detectedFromPhone);
  }, [detectedFromPhone, networkTouched]);

  // Delivery lands on an Instalipa callback, so watch the order until it settles.
  useEffect(() => {
    if (!order || isTerminal(order)) return;
    let stopped = false;
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      const fresh = await fetchPublicAirtimeOrderBrowser(slug, order.orderId);
      if (stopped) return;
      if (fresh) {
        setOrder(fresh);
        if (isTerminal(fresh)) return;
      }
      if (attempts < 40) {
        timer = setTimeout(() => void tick(), 3000);
      }
    };
    let timer = setTimeout(() => void tick(), 3000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [order, slug]);

  const quickAmounts = useMemo(
    () =>
      config?.quickAmounts?.length ? config.quickAmounts : [20, 50, 100, 250, 500, 1000],
    [config],
  );

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createPublicAirtimeOrderBrowser(slug, {
        phoneNumber: recipient.trim(),
        amount: amountValue,
        payerPhone: (payer.trim() || recipient).trim(),
      });
      setOrder(created);
      if (created.failed) {
        setError(created.message || "The airtime purchase could not be started.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setOrder(null);
    setAmount("");
    setError(null);
    setNetworkTouched(false);
  };

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-1 py-8 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Checking airtime…
      </div>
    );
  }

  if (!config?.available) {
    return (
      <div className={cn("px-1 py-6 text-center", className)}>
        <Signal className="mx-auto size-6 text-muted-foreground/50" aria-hidden />
        <p className="mt-2 text-sm font-medium text-foreground">
          Airtime is not available right now
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {config?.reason || "Please check back shortly."}
        </p>
      </div>
    );
  }

  if (order) {
    return (
      <div className={cn("space-y-4", className)}>
        <div
          className={cn(
            "rounded-xl border px-4 py-4 text-center",
            order.delivered
              ? "border-emerald-300/70 bg-emerald-50"
              : order.failed
                ? "border-rose-300/70 bg-rose-50"
                : "border-amber-300/70 bg-amber-50",
          )}
        >
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-white/70">
            {order.delivered ? (
              <Check className="size-6 text-emerald-700" aria-hidden />
            ) : order.failed ? (
              <X className="size-6 text-rose-700" aria-hidden />
            ) : (
              <Smartphone className="size-6 animate-pulse text-amber-700" aria-hidden />
            )}
          </span>
          <p className="mt-2 font-heading text-lg font-semibold tracking-tight">
            {price(order.amount)} to {order.phoneNumber}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.delivered
              ? "Airtime delivered. You will get the usual telco SMS."
              : order.failed
                ? order.message || "This purchase did not go through."
                : order.awaitingPayment
                  ? "Check your phone and enter your M-Pesa PIN to confirm."
                  : "Payment received — sending your airtime now."}
          </p>
          {order.receipt ? (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {order.receipt}
            </p>
          ) : null}
          {!isTerminal(order) ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Waiting for confirmation…
            </p>
          ) : null}
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={reset}>
          Buy more airtime
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Network
        </legend>
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
                }}
                className={cn(
                  "min-h-12 rounded-xl border py-2.5 text-sm font-bold transition-all active:scale-[0.98]",
                  selected
                    ? "border-transparent text-white shadow-sm"
                    : "border-border/70 bg-background text-foreground hover:border-foreground/30",
                  selected && !accent && "bg-primary",
                )}
                style={selected && accent ? { backgroundColor: accent } : undefined}
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
                }}
                className={cn(
                  "min-h-12 rounded-xl border py-2.5 text-sm font-bold transition-all active:scale-[0.98]",
                  selected
                    ? "border-transparent text-white shadow-sm"
                    : "border-border/70 bg-background text-foreground hover:border-foreground/30",
                  selected && !accent && "bg-primary",
                )}
                style={selected && accent ? { backgroundColor: accent } : undefined}
              >
                {n.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Number that receives airtime
        </span>
        <input
          type="tel"
          inputMode="tel"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 font-heading text-lg tabular-nums tracking-wide shadow-sm"
          placeholder="07…"
          value={recipient}
          onChange={(e) => {
            const next = limitKenyanAirtimePhoneInput(e.target.value);
            setRecipient(next);
            if (!payer) setPayer(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") amountRef.current?.focus();
          }}
        />
        {recipientHint ? (
          <p className="text-xs leading-relaxed text-rose-700">{recipientHint}</p>
        ) : null}
        {networkMismatch && detectedFromPhone ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            That number looks like{" "}
            {KENYAN_NETWORKS.find((n) => n.id === detectedFromPhone)?.label}.{" "}
            <button
              type="button"
              className="font-semibold underline underline-offset-2"
              onClick={() => {
                setNetwork(detectedFromPhone);
                setNetworkTouched(true);
              }}
            >
              Switch network
            </button>
          </p>
        ) : null}
      </label>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Amount
        </span>
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map((a) => {
            const selected = Number(amount) === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                className={cn(
                  "rounded-xl border py-2.5 text-sm font-bold tabular-nums transition-all active:scale-[0.98]",
                  selected
                    ? "border-transparent text-white shadow-sm"
                    : "border-border/70 bg-background text-foreground hover:border-foreground/30",
                  selected && !accent && "bg-primary",
                )}
                style={selected && accent ? { backgroundColor: accent } : undefined}
              >
                {a.toLocaleString("en-KE")}
              </button>
            );
          })}
        </div>
        <input
          ref={amountRef}
          type="number"
          inputMode="numeric"
          min={config.minAmount}
          max={config.maxAmount}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 font-heading text-lg tabular-nums shadow-sm"
          placeholder={`Other amount (${config.minAmount}–${config.maxAmount})`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) void submit();
          }}
        />
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          M-Pesa number that pays
        </span>
        <input
          type="tel"
          inputMode="tel"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 font-heading text-lg tabular-nums tracking-wide shadow-sm"
          placeholder="07… — PIN is entered here"
          value={payer}
          onChange={(e) => setPayer(limitKenyanAirtimePhoneInput(e.target.value))}
        />
        {payerHint && payer ? (
          <p className="text-xs leading-relaxed text-rose-700">{payerHint}</p>
        ) : null}
        <p className="text-[11px] leading-snug text-muted-foreground">
          Change this if someone else is paying. The STK prompt lands on this phone.
        </p>
      </label>

      {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}

      <Button
        type="button"
        className="w-full py-6 text-base font-bold"
        style={accent ? { backgroundColor: accent } : undefined}
        disabled={!canSubmit}
        onClick={() => void submit()}
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Starting M-Pesa…
          </>
        ) : (
          <>
            <Signal className="size-4" aria-hidden />
            Buy {amountValid ? price(amountValue) : "airtime"}
          </>
        )}
      </Button>
      <p className="text-center text-[11px] leading-snug text-muted-foreground">
        One M-Pesa prompt, no extra fee. Works on Safaricom, Airtel, Telkom, Equitel
        and Faiba lines.
      </p>
    </div>
  );
}