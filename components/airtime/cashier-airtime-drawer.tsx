"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  Check,
  Loader2,
  Signal,
  Smartphone,
  Sparkles,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  fetchAirtimeAvailability,
  fetchAirtimeOrder,
  fetchAirtimeQuote,
  fetchCustomers,
  sellAirtime,
  type AirtimeAvailabilityRecord,
  type AirtimeOrderRecord,
  type AirtimeQuoteRecord,
  type CustomerRecord,
} from "@/lib/api";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import {
  detectKenyanNetwork,
  KENYAN_NETWORKS,
  looksLikeKenyanMobilePath,
  toKenyanLocal07,
  type KenyanNetwork,
} from "@/lib/kenyan-phone";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const fieldClass = (extra?: string) =>
  cn(
    "rounded-xl border border-border/55 bg-background px-3 text-[17px] shadow-sm",
    "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_45%,var(--border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_18%,transparent)]",
    extra,
  );

type Tender = "CASH" | "MPESA" | "TAB";

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

function formatPhoneDisplay(raw: string): string {
  const digits = (toKenyanLocal07(raw) || raw).replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("07")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

function isTerminal(status: string) {
  return status === "SUCCESS" || status === "FAILED";
}

function PayMethodTile({
  active,
  disabled,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[4.25rem] flex-col items-start justify-center gap-1 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "scale-[1.02] border-transparent text-[var(--pos-primary-ink)] shadow-md"
          : "border-border/50 bg-background/80 text-foreground hover:border-border hover:bg-card hover:shadow-sm",
      )}
      style={
        active
          ? {
              backgroundColor: "var(--pos-primary)",
              boxShadow:
                "0 10px 28px -12px color-mix(in srgb, var(--pos-primary) 55%, transparent)",
            }
          : undefined
      }
    >
      <span
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-lg",
          active
            ? "bg-[color-mix(in_srgb,var(--pos-primary-ink)_14%,transparent)]"
            : "bg-muted/70 text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="text-[13px] font-semibold leading-none">{label}</span>
      {hint ? (
        <span
          className={cn(
            "text-[11px] leading-tight",
            active ? "opacity-80" : "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      ) : null}
    </button>
  );
}

type Props = {
  currency?: string;
  channel?: "POS" | "DASHBOARD";
};

/**
 * Cashier airtime till: pick the network, collect Cash / M-Pesa / Tab, then
 * send from the Kiosk Pay wallet. Matches checkout drawer tenders so the
 * till does not grow a second payment language.
 */
export function CashierAirtimeDrawer({ currency: currencyProp, channel = "POS" }: Props) {
  const { me } = useDashboard();
  const online = useOnlineStatus();
  const canLookupCustomers = hasPermission(
    me?.permissions,
    Permission.CreditsCustomersRead,
  );

  const [availability, setAvailability] = useState<AirtimeAvailabilityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [payer, setPayer] = useState("");
  const [payerTouched, setPayerTouched] = useState(false);
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<KenyanNetwork | null>(null);
  const [networkTouched, setNetworkTouched] = useState(false);
  const [tender, setTender] = useState<Tender>("CASH");
  const [quote, setQuote] = useState<AirtimeQuoteRecord | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [selling, setSelling] = useState(false);
  const [order, setOrder] = useState<AirtimeOrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<CustomerRecord[]>([]);
  const [customerBusy, setCustomerBusy] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [customerNoMatch, setCustomerNoMatch] = useState(false);

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

  const detectedFromPhone = detectKenyanNetwork(phone);
  useEffect(() => {
    if (networkTouched) return;
    if (detectedFromPhone) setNetwork(detectedFromPhone);
  }, [detectedFromPhone, networkTouched]);

  useEffect(() => {
    if (payerTouched) return;
    setPayer(phone);
  }, [phone, payerTouched]);

  const digits = phone.replace(/\D/g, "");
  const amountValue = Number(amount);
  const amountValid = Number.isFinite(amountValue) && amountValue > 0;
  const phoneOk = looksLikeKenyanMobilePath(phone);
  const payerOk = looksLikeKenyanMobilePath(payer || phone);
  const networkMismatch =
    Boolean(network) && Boolean(detectedFromPhone) && network !== detectedFromPhone;

  useEffect(() => {
    if (!phoneOk || !amountValid) {
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
  }, [phone, amountValue, phoneOk, amountValid]);

  useEffect(() => {
    if (!order || isTerminal(order.status)) return;
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
          return;
        }
      } catch {
        // Keep polling; a blip here should not strand the cashier.
      }
      if (!stopped && attempts < 40) {
        timer = setTimeout(() => void tick(), 2500);
      }
    };
    let timer = setTimeout(() => void tick(), 2000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [order, reloadAvailability]);

  const searchCustomers = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || !canLookupCustomers || !online) return;
      setCustomerBusy(true);
      setCustomerNoMatch(false);
      try {
        const rows = await fetchCustomers(q, {
          flexible: !looksLikeKenyanMobilePath(q),
        });
        setCustomerHits(rows);
        setCustomerNoMatch(rows.length === 0);
        if (rows.length === 1) setSelectedCustomer(rows[0]);
      } catch {
        setCustomerHits([]);
      } finally {
        setCustomerBusy(false);
      }
    },
    [canLookupCustomers, online],
  );

  useEffect(() => {
    if (tender !== "TAB" || !phoneOk || selectedCustomer) return;
    const timer = setTimeout(() => {
      setCustomerQuery(phone);
      void searchCustomers(phone);
    }, 400);
    return () => clearTimeout(timer);
  }, [tender, phone, phoneOk, selectedCustomer, searchCustomers]);

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

  const tabHeadroom = (() => {
    if (!selectedCustomer?.credit) return null;
    const limit = Number(selectedCustomer.credit.creditLimit);
    const owed = Number(selectedCustomer.credit.balanceOwed);
    if (!Number.isFinite(limit) || limit <= 0) return Number.POSITIVE_INFINITY;
    const left = limit - (Number.isFinite(owed) ? owed : 0);
    return left;
  })();
  const tabWouldExceed =
    tender === "TAB" &&
    amountValid &&
    tabHeadroom != null &&
    Number.isFinite(tabHeadroom) &&
    amountValue > tabHeadroom;

  const formReady =
    !blocked &&
    phoneOk &&
    amountValid &&
    !overSellable &&
    network != null &&
    !networkMismatch &&
    (quote?.sellable ?? false) &&
    (tender !== "MPESA" || payerOk) &&
    (tender !== "TAB" || Boolean(selectedCustomer)) &&
    !tabWouldExceed;

  const canSubmit = !selling && online && formReady;

  const submit = async () => {
    if (!canSubmit) return;
    setSelling(true);
    setError(null);
    try {
      const created = await sellAirtime(
        {
          phoneNumber: phone.trim(),
          amount: amountValue,
          channel,
          tender,
          payerPhone: tender === "MPESA" ? (payer.trim() || phone.trim()) : undefined,
          customerId: tender === "TAB" ? selectedCustomer?.id : undefined,
        },
        nextIdempotencyKey(),
      );
      setOrder(created);
      if (created.status === "FAILED") {
        setError(created.failureReason || "Airtime could not be sent.");
      }
      void reloadAvailability();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Airtime could not be sent.");
    } finally {
      setSelling(false);
    }
  };

  const startNext = () => {
    setOrder(null);
    setPhone("");
    setPayer("");
    setPayerTouched(false);
    setAmount("");
    setNetwork(null);
    setNetworkTouched(false);
    setQuote(null);
    setError(null);
    setTender("CASH");
    setSelectedCustomer(null);
    setCustomerHits([]);
    setCustomerQuery("");
    setCustomerNoMatch(false);
  };

  const ctaLabel = (() => {
    if (selling) {
      return tender === "MPESA" ? "Sending prompt…" : "Sending airtime…";
    }
    if (quoting) return "Checking…";
    if (!amountValid) return "Send airtime";
    if (tender === "MPESA") return `Prompt ${money(amountValue, currency)}`;
    if (tender === "TAB") return `Charge tab ${money(amountValue, currency)}`;
    return `Send ${money(amountValue, currency)}`;
  })();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Checking airtime…
      </div>
    );
  }

  if (order) {
    const settled = order.status === "SUCCESS";
    const failed = order.status === "FAILED";
    const awaiting = order.status === "AWAITING_PAYMENT";
    const sending = !settled && !failed && !awaiting;
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border/50 px-4 py-4 pr-12">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Signal className="size-4 text-muted-foreground" aria-hidden />
              Sell airtime
            </DialogTitle>
            <DialogDescription className="sr-only">
              Airtime sale in progress
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div
            className={cn(
              "flex items-start gap-3 rounded-2xl border px-3.5 py-3.5",
              settled
                ? "border-emerald-300/60 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                : failed
                  ? "border-rose-300/60 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30"
                  : "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30",
            )}
          >
            <span className="mt-0.5 shrink-0">
              {settled ? (
                <Check className="size-5 text-emerald-700 dark:text-emerald-300" aria-hidden />
              ) : failed ? (
                <X className="size-5 text-rose-700 dark:text-rose-300" aria-hidden />
              ) : (
                <Loader2 className="size-5 animate-spin text-sky-700 dark:text-sky-300" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-lg font-semibold tracking-tight">
                {money(order.amount, order.currency || currency)} to{" "}
                {formatPhoneDisplay(order.phoneNumber)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {settled
                  ? order.tender === "TAB"
                    ? "Delivered and charged to their tab."
                    : order.tender === "MPESA"
                      ? "Delivered. M-Pesa already paid your till."
                      : "Delivered. Collect the cash — they will get the telco SMS."
                  : failed
                    ? order.failureReason || "This top-up did not go through."
                    : awaiting
                      ? `Ask them to enter PIN on ${formatPhoneDisplay(payer || phone)}.`
                      : sending
                        ? "Payment received — sending to the telco."
                        : "Sent to the telco. This usually lands in a few seconds."}
              </p>
              {settled && order.commission > 0 ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
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
        </div>
        <div className="shrink-0 border-t border-border/50 px-4 py-3">
          <p className="mb-2 text-center text-[11px] text-muted-foreground">
            Wallet now {money(availability?.walletBalance, currency)}
          </p>
          <Button type="button" className="h-12 w-full rounded-xl" onClick={startNext}>
            Sell another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="relative shrink-0 overflow-hidden px-4 pb-4 pt-5"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in srgb, var(--pos-primary) 18%, transparent) 0%, transparent 70%)",
        }}
      >
        <DialogHeader className="relative min-w-0 pr-8">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Signal className="size-4 text-muted-foreground" aria-hidden />
            Sell airtime
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Any network. Your Kiosk Pay wallet funds the top-up; they pay you
            cash, M-Pesa, or tab.
          </DialogDescription>
        </DialogHeader>
        <div className="relative mt-3 flex items-baseline gap-2">
          <span className="text-[2.4rem] font-bold leading-none tracking-tight tabular-nums text-foreground">
            {amountValid ? amountValue.toFixed(0) : (availability?.walletBalance ?? 0).toFixed(0)}
          </span>
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            {amountValid ? currency : `${currency} wallet`}
          </span>
        </div>
        <p className="relative mt-2 text-[11px] font-medium text-muted-foreground">
          Earned today {money(availability?.commissionEarnedToday, currency)}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        <div className="space-y-4">
          {blocked ? (
            <p className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {availability?.reason || "Airtime is not available right now."}
            </p>
          ) : null}

          <fieldset disabled={blocked} className="min-w-0">
            <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
                      "min-h-12 rounded-xl border px-2 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-40",
                      selected
                        ? "border-transparent bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] shadow-sm"
                        : "border-border/50 bg-background hover:bg-card",
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
                    }}
                    className={cn(
                      "min-h-12 rounded-xl border px-2 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-40",
                      selected
                        ? "border-transparent bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] shadow-sm"
                        : "border-border/50 bg-background hover:bg-card",
                    )}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Customer phone
            </span>
            <input
              type="tel"
              inputMode="tel"
              autoFocus
              className={fieldClass("h-12 w-full font-heading tabular-nums tracking-wide")}
              placeholder="07…"
              value={phone}
              disabled={blocked}
              onChange={(e) => setPhone(e.target.value)}
            />
            {networkMismatch ? (
              <p className="text-[12px] font-medium text-amber-800 dark:text-amber-200">
                That number looks like {detectedFromPhone}, not{" "}
                {KENYAN_NETWORKS.find((n) => n.id === network)?.label}.
              </p>
            ) : null}
          </label>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Amount
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickAmounts.map((a) => (
                <button
                  key={a}
                  type="button"
                  disabled={blocked}
                  onClick={() => setAmount(String(a))}
                  className={cn(
                    "min-h-10 rounded-xl border px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors disabled:opacity-40",
                    Number(amount) === a
                      ? "border-transparent bg-foreground text-background"
                      : "border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {whole(a)}
                </button>
              ))}
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={availability?.minAmount ?? 1}
              step="1"
              className={fieldClass("h-12 w-full font-heading tabular-nums")}
              placeholder={`${whole(availability?.minAmount)}–${whole(availability?.maxSellableNow)}`}
              value={amount}
              disabled={blocked}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) void submit();
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              {whole(availability?.minAmount)}–{whole(availability?.maxAmount)} per
              sale · {money(availability?.dailyRemaining, currency)} left today
            </p>
          </div>

          {overSellable ? (
            <p className="text-xs font-medium text-rose-800 dark:text-rose-300">
              You can send up to {money(availability?.maxSellableNow, currency)} right
              now — top up the wallet to go higher.
            </p>
          ) : quote && !quote.sellable && quote.reason ? (
            <p className="text-xs font-medium text-rose-800 dark:text-rose-300">
              {quote.reason}
            </p>
          ) : quote?.sellable ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300/50 bg-emerald-50/70 px-3 py-2 text-xs dark:border-emerald-800/70 dark:bg-emerald-950/25">
              <span className="text-emerald-900 dark:text-emerald-200">
                Wallet after{" "}
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

          <section className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              How are they paying?
            </h3>
            <div className={cn("grid gap-2", canLookupCustomers ? "grid-cols-3" : "grid-cols-2")}>
              <PayMethodTile
                active={tender === "CASH"}
                onClick={() => setTender("CASH")}
                icon={<Banknote className="size-3.5" aria-hidden />}
                label="Cash"
                hint="Collect now"
              />
              <PayMethodTile
                active={tender === "MPESA"}
                disabled={!online}
                onClick={() => setTender("MPESA")}
                icon={<Smartphone className="size-3.5" aria-hidden />}
                label="M-Pesa"
                hint="STK prompt"
              />
              {canLookupCustomers ? (
                <PayMethodTile
                  active={tender === "TAB"}
                  disabled={!online}
                  onClick={() => setTender("TAB")}
                  icon={<UserRound className="size-3.5" aria-hidden />}
                  label="Tab"
                  hint="Charge later"
                />
              ) : null}
            </div>

            {tender === "CASH" ? (
              <p className="rounded-xl border border-border/50 bg-card/90 px-3 py-2.5 text-[12px] text-muted-foreground">
                Collect {amountValid ? money(amountValue, currency) : "the face value"}{" "}
                from them. Your wallet still funds the telco and keeps the commission.
              </p>
            ) : null}

            {tender === "MPESA" ? (
              <div className="space-y-2 rounded-2xl border border-border/50 bg-card/90 p-3 shadow-sm">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    M-Pesa number
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    className={fieldClass("h-12 w-full font-heading tabular-nums")}
                    placeholder="07…"
                    value={payer}
                    disabled={blocked}
                    onChange={(e) => {
                      setPayerTouched(true);
                      setPayer(e.target.value);
                    }}
                  />
                </label>
                <p className="text-[11px] text-muted-foreground">
                  They pay your till first. Airtime sends after the PIN goes through.
                </p>
              </div>
            ) : null}

            {tender === "TAB" ? (
              <div className="space-y-2 rounded-2xl border border-border/50 bg-card/90 p-3 shadow-sm">
                {selectedCustomer ? (
                  <div className="flex items-start justify-between gap-2 rounded-xl bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">
                        {selectedCustomer.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Tab owed{" "}
                        {money(Number(selectedCustomer.credit?.balanceOwed), currency)}
                        {selectedCustomer.credit?.creditLimit != null
                          ? ` · limit ${money(Number(selectedCustomer.credit.creditLimit), currency)}`
                          : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-[var(--pos-primary)]"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerHits([]);
                        setCustomerNoMatch(false);
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        className={fieldClass("h-11 min-w-0 flex-1 text-sm")}
                        value={customerQuery}
                        onChange={(e) => setCustomerQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void searchCustomers(customerQuery);
                          }
                        }}
                        placeholder="Name or phone…"
                        disabled={!online}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 rounded-xl px-3 text-sm font-semibold"
                        disabled={!online || customerBusy || !customerQuery.trim()}
                        onClick={() => void searchCustomers(customerQuery)}
                      >
                        {customerBusy ? "…" : "Find"}
                      </Button>
                    </div>
                    {customerHits.length > 0 ? (
                      <ul className="max-h-36 space-y-1 overflow-y-auto">
                        {customerHits.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] hover:bg-muted/50"
                              onClick={() => setSelectedCustomer(c)}
                            >
                              {c.name}
                              <span className="ml-1.5 text-muted-foreground">
                                {customerPrimaryPhone(c.phones)}
                              </span>
                              {c.credit ? (
                                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                  Tab owed {money(Number(c.credit.balanceOwed), currency)}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : customerNoMatch ? (
                      <p className="text-[12px] text-muted-foreground">
                        No customer on that number — open a tab from checkout first.
                      </p>
                    ) : null}
                  </>
                )}
                {tabWouldExceed ? (
                  <p className="text-[12px] font-medium text-rose-800 dark:text-rose-300">
                    That would pass this customer&apos;s credit limit.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          {error ? (
            <p className="text-xs font-medium text-rose-800 dark:text-rose-300">{error}</p>
          ) : null}
          {!online ? (
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              You&apos;re offline — airtime needs a live connection.
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-border/50 px-4 py-3">
        <Button
          type="button"
          className="h-12 w-full rounded-xl text-sm font-semibold"
          disabled={!canSubmit}
          onClick={() => void submit()}
        >
          {selling || quoting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Signal className="size-4" aria-hidden />
          )}
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
