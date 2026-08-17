"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Signal, Sparkles, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  fetchAirtimeAvailability,
  fetchAirtimeOrder,
  fetchAirtimeQuote,
  sellAirtime,
  type AirtimeAvailabilityRecord,
  type AirtimeOrderRecord,
  type AirtimeQuoteRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/** Networks Instalipa reaches, in the order Kenyan tills see them. */
const NETWORK_TINT: Record<string, string> = {
  SAFARICOM: "bg-emerald-600/12 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  AIRTEL: "bg-rose-600/12 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300",
  TELKOM: "bg-sky-600/12 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  EQUITEL: "bg-indigo-600/12 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-300",
  JTL: "bg-amber-600/12 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200",
};

function money(n: number | null | undefined, currency = "KES") {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${currency} ${v.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function whole(n: number | null | undefined) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-KE", { maximumFractionDigits: 0 });
}

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `air-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isTerminal(status: string) {
  return status === "SUCCESS" || status === "FAILED";
}

type Props = {
  /** POS for the till, DASHBOARD when an owner sells from the back office. */
  channel: "POS" | "DASHBOARD";
  currency?: string;
  /** Called after every settled sale so hosts can refresh their own totals. */
  onSold?: (order: AirtimeOrderRecord) => void;
  className?: string;
};

/**
 * Sell airtime out of the Kiosk Pay wallet.
 *
 * <p>Deliberately keyboard-first: type the number, tap an amount, hit send. The
 * quote is fetched as you type so the cashier sees the wallet hit and the
 * commission before committing, and in-flight orders are polled because
 * Instalipa confirms delivery over a callback rather than in the response.
 */
export function AirtimeSellPanel({
  channel,
  currency: currencyProp,
  onSold,
  className,
}: Props) {
  const [availability, setAvailability] = useState<AirtimeAvailabilityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<AirtimeQuoteRecord | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [selling, setSelling] = useState(false);
  const [order, setOrder] = useState<AirtimeOrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);

  const currency = availability?.currency || currencyProp || "KES";

  const reloadAvailability = useCallback(async () => {
    try {
      setAvailability(await fetchAirtimeAvailability());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load airtime.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadAvailability();
  }, [reloadAvailability]);

  const digits = phone.replace(/\D/g, "");
  const amountValue = Number(amount);
  const amountValid = Number.isFinite(amountValue) && amountValue > 0;
  const phoneLongEnough = digits.length >= 9;

  useEffect(() => {
    if (!phoneLongEnough || !amountValid) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    const timer = setTimeout(() => {
      fetchAirtimeQuote(phone.trim(), amountValue)
        .then((q) => {
          if (!cancelled) setQuote(q);
        })
        .catch(() => {
          if (!cancelled) setQuote(null);
        })
        .finally(() => {
          if (!cancelled) setQuoting(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone, amountValue, phoneLongEnough, amountValid]);

  // Instalipa confirms delivery on a callback, so poll until the order settles.
  useEffect(() => {
    if (!order || isTerminal(order.status) || order.status === "AWAITING_PAYMENT") {
      return;
    }
    let stopped = false;
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      try {
        const fresh = await fetchAirtimeOrder(order.id);
        if (stopped) return;
        setOrder(fresh);
        if (isTerminal(fresh.status)) {
          void reloadAvailability();
          onSold?.(fresh);
          return;
        }
      } catch {
        // Keep polling; a blip here should not strand the cashier.
      }
      if (!stopped && attempts < 20) {
        timer = setTimeout(() => void tick(), 3000);
      }
    };
    let timer = setTimeout(() => void tick(), 2500);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [order, onSold, reloadAvailability]);

  const quickAmounts = useMemo(() => {
    const list = availability?.quickAmounts?.length
      ? availability.quickAmounts
      : [20, 50, 100, 250, 500, 1000];
    const ceiling = availability?.maxSellableNow ?? Number.POSITIVE_INFINITY;
    return list.filter((a) => a <= ceiling);
  }, [availability]);

  const blocked = availability != null && !availability.available;
  const overSellable =
    amountValid &&
    availability != null &&
    amountValue > (availability.maxSellableNow ?? 0);

  const canSell =
    !selling &&
    !blocked &&
    phoneLongEnough &&
    amountValid &&
    !overSellable &&
    (quote?.sellable ?? false);

  const submit = async () => {
    if (!canSell) return;
    setSelling(true);
    setError(null);
    try {
      const created = await sellAirtime(
        { phoneNumber: phone.trim(), amount: amountValue, channel },
        newIdempotencyKey(),
      );
      setOrder(created);
      if (created.status === "FAILED") {
        setError(created.failureReason || "Airtime could not be sent.");
      }
      void reloadAvailability();
      if (isTerminal(created.status)) onSold?.(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Airtime could not be sent.");
    } finally {
      setSelling(false);
    }
  };

  const startNext = () => {
    setOrder(null);
    setPhone("");
    setAmount("");
    setQuote(null);
    setError(null);
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

  if (order) {
    const settled = order.status === "SUCCESS";
    const failed = order.status === "FAILED";
    return (
      <div className={cn("space-y-3", className)}>
        <div
          className={cn(
            "flex items-start gap-3 rounded-lg border px-3 py-3",
            settled
              ? "border-emerald-300/60 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
              : failed
                ? "border-rose-300/60 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30"
                : "border-amber-300/60 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
          )}
        >
          <span className="mt-0.5 shrink-0">
            {settled ? (
              <Check className="size-5 text-emerald-700 dark:text-emerald-300" aria-hidden />
            ) : failed ? (
              <X className="size-5 text-rose-700 dark:text-rose-300" aria-hidden />
            ) : (
              <Loader2
                className="size-5 animate-spin text-amber-700 dark:text-amber-300"
                aria-hidden
              />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-base font-semibold tracking-tight">
              {money(order.amount, order.currency || currency)} to {order.phoneNumber}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {settled
                ? "Delivered. Collect the cash — the customer will get the telco SMS."
                : failed
                  ? order.failureReason || "The telco rejected this top-up."
                  : "Sent to the telco. This usually lands in a few seconds."}
            </p>
            {settled && order.commission > 0 ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                <Sparkles className="size-3.5" aria-hidden />
                You earned {money(order.commission, order.currency || currency)}
              </p>
            ) : null}
            {order.receipt ? (
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                {order.receipt}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Wallet now {money(availability?.walletBalance, currency)}
          </p>
          <Button type="button" onClick={startNext}>
            Sell another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/25 px-3 py-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Wallet available
          </p>
          <p className="font-heading text-lg font-semibold tabular-nums leading-tight">
            {money(availability?.walletBalance, currency)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Earned today
          </p>
          <p className="font-heading text-lg font-semibold tabular-nums leading-tight text-emerald-700 dark:text-emerald-400">
            {money(availability?.commissionEarnedToday, currency)}
          </p>
        </div>
      </div>

      {blocked ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {availability?.reason || "Airtime is not available right now."}
        </p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Customer phone
        </span>
        <div className="relative">
          <input
            type="tel"
            inputMode="tel"
            autoFocus
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-24 font-heading text-lg tabular-nums tracking-wide shadow-sm"
            placeholder="07…"
            value={phone}
            disabled={blocked}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") amountRef.current?.focus();
            }}
          />
          {quote?.network ? (
            <span
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
                NETWORK_TINT[quote.network] ?? "bg-muted text-muted-foreground",
              )}
            >
              {quote.network}
            </span>
          ) : null}
        </div>
      </label>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Amount</span>
        <div className="flex flex-wrap gap-1.5">
          {quickAmounts.map((a) => (
            <button
              key={a}
              type="button"
              disabled={blocked}
              onClick={() => setAmount(String(a))}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-sm font-semibold tabular-nums transition-colors disabled:opacity-40",
                Number(amount) === a
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {whole(a)}
            </button>
          ))}
        </div>
        <input
          ref={amountRef}
          type="number"
          inputMode="numeric"
          min={availability?.minAmount ?? 1}
          step="1"
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-heading text-lg tabular-nums shadow-sm"
          placeholder={`${whole(availability?.minAmount)}–${whole(availability?.maxSellableNow)}`}
          value={amount}
          disabled={blocked}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSell) void submit();
          }}
        />
        <p className="text-[11px] text-muted-foreground">
          {whole(availability?.minAmount)}–{whole(availability?.maxAmount)} per sale ·{" "}
          {money(availability?.dailyRemaining, currency)} left of today&apos;s limit
        </p>
      </div>

      {overSellable ? (
        <p className="text-xs font-medium text-rose-800 dark:text-rose-300">
          You can send up to {money(availability?.maxSellableNow, currency)} right now —
          top up the wallet to go higher.
        </p>
      ) : quote && !quote.sellable && quote.reason ? (
        <p className="text-xs font-medium text-rose-800 dark:text-rose-300">
          {quote.reason}
        </p>
      ) : quote?.sellable ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-300/50 bg-emerald-50/70 px-3 py-2 text-xs dark:border-emerald-800/70 dark:bg-emerald-950/25">
          <span className="text-emerald-900 dark:text-emerald-200">
            Wallet after this sale{" "}
            <strong className="font-semibold tabular-nums">
              {money(quote.walletBalanceAfter, currency)}
            </strong>
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-300">
            <Sparkles className="size-3.5" aria-hidden />+
            {money(quote.commission, currency)} for you
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs font-medium text-rose-800 dark:text-rose-300">{error}</p>
      ) : null}

      <Button type="button" className="w-full" disabled={!canSell} onClick={() => void submit()}>
        {selling ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Sending airtime…
          </>
        ) : quoting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Checking…
          </>
        ) : (
          <>
            <Signal className="size-4" aria-hidden />
            Send {amountValid ? money(amountValue, currency) : "airtime"}
          </>
        )}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Collect {amountValid ? money(amountValue, currency) : "the face value"} from the
        customer — your wallet funds the top-up and keeps the commission.
      </p>
    </div>
  );
}
