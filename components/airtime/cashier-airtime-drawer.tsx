"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  Check,
  Loader2,
  ShoppingCart,
  Signal,
  Smartphone,
  Sparkles,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import {
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnlineStatus } from "@/hooks/use-online-status";
import styles from "./cashier-airtime-drawer.module.css";
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
import type { AirtimeCartPayload } from "@/lib/airtime-cart-line";
import {
  detectKenyanNetwork,
  KENYAN_NETWORKS,
  kenyanAirtimePhoneMessage,
  kenyanAirtimePhoneOk,
  limitKenyanAirtimePhoneInput,
  looksLikeKenyanMobilePath,
  toKenyanLocal07,
  type KenyanNetwork,
} from "@/lib/kenyan-phone";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function Caption({
  description,
  hideDescription,
}: {
  description: string;
  hideDescription?: boolean;
}) {
  return (
    <div className={styles.caption}>
      <DialogHeader className="space-y-0 p-0 pr-0 text-left">
        <DialogTitle className={styles.title}>
          <Signal className="size-4 shrink-0" aria-hidden />
          Sell airtime
        </DialogTitle>
        <DialogDescription className={hideDescription ? "sr-only" : styles.lede}>
          {description}
        </DialogDescription>
      </DialogHeader>
      <DialogClose aria-label="Close" className={styles.close}>
        <X className="size-3.5" strokeWidth={2.25} />
      </DialogClose>
    </div>
  );
}

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
      className={cn(styles.tile, active && styles.tileOn)}
    >
      <span className={styles.tileIcon}>{icon}</span>
      <span className={styles.tileLabel}>{label}</span>
      {hint ? <span className={styles.tileHint}>{hint}</span> : null}
    </button>
  );
}

type Props = {
  currency?: string;
  channel?: "POS" | "DASHBOARD";
  /** When set, the till can park this top-up on the current sale. */
  onAddToCart?: (payload: AirtimeCartPayload) => boolean;
};

/**
 * Cashier airtime till: pick the network, then either add the top-up to the
 * current sale or collect Cash / M-Pesa / Tab and send immediately.
 */
export function CashierAirtimeDrawer({
  currency: currencyProp,
  channel = "POS",
  onAddToCart,
}: Props) {
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
  const phoneOk = kenyanAirtimePhoneOk(phone);
  const payerOk = kenyanAirtimePhoneOk(payer || phone);
  const phoneHint = kenyanAirtimePhoneMessage(phone);
  const payerHint = kenyanAirtimePhoneMessage(payer);
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
        if (fresh.status !== order.status || fresh.receipt !== order.receipt) {
          setOrder(fresh);
        }
        if (isTerminal(fresh.status)) {
          setOrder(fresh);
          void reloadAvailability();
          return;
        }
      } catch {
        // Keep polling; a blip here should not strand the cashier.
      }
      if (!stopped && attempts < 60) {
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

  const lineReady =
    !blocked &&
    phoneOk &&
    amountValid &&
    !overSellable &&
    network != null &&
    (quote?.sellable ?? false);

  const formReady =
    lineReady &&
    (tender !== "MPESA" || payerOk) &&
    (tender !== "TAB" || Boolean(selectedCustomer)) &&
    !tabWouldExceed;

  const canSubmit = !selling && online && formReady;
  const canAddToCart = Boolean(onAddToCart) && !selling && online && lineReady;

  const addToCart = () => {
    if (!onAddToCart || !canAddToCart || network == null) return;
    const networkLabel =
      KENYAN_NETWORKS.find((n) => n.id === network)?.label ?? network;
    const ok = onAddToCart({
      phone: phone.trim(),
      network,
      networkLabel,
      amount: amountValue,
    });
    if (!ok) {
      setError("Could not add airtime to the sale.");
    }
  };

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
      <div className={styles.root}>
        <Caption description="Checking the Kiosk Pay wallet." />
        <div className={styles.center}>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Checking airtime…
        </div>
      </div>
    );
  }

  if (order) {
    const settled = order.status === "SUCCESS";
    const failed = order.status === "FAILED";
    const awaiting = order.status === "AWAITING_PAYMENT";
    const sending = !settled && !failed && !awaiting;
    return (
      <div className={styles.root}>
        <Caption description="Airtime sale in progress" hideDescription />
        <div className={styles.body}>
          <div
            className={cn(
              styles.status,
              settled && styles.statusOk,
              failed && styles.statusBad,
              !settled && !failed && styles.statusWait,
            )}
          >
            <span className="mt-0.5 shrink-0">
              {settled ? (
                <Check className="size-5" aria-hidden />
              ) : failed ? (
                <X className="size-5" aria-hidden />
              ) : (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-lg font-semibold tracking-tight">
                {money(order.amount, order.currency || currency)} to{" "}
                {formatPhoneDisplay(order.phoneNumber)}
              </p>
              <p className={cn("mt-1 text-sm", styles.muted)}>
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
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold">
                  <Sparkles className="size-3.5" aria-hidden />
                  You earned {money(order.commission, order.currency || currency)}
                </p>
              ) : null}
              {order.receipt ? (
                <p className={cn("mt-1 truncate font-mono text-[11px]", styles.muted)}>
                  {order.receipt}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className={styles.foot}>
          <p className={cn("mb-2 text-center text-[11px]", styles.muted)}>
            Wallet now {money(availability?.walletBalance, currency)}
          </p>
          <button type="button" className={styles.cta} onClick={startNext}>
            Sell another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Caption description="Any network. Your Kiosk Pay wallet funds the top-up; they pay you cash, M-Pesa, or tab." />
      <div className={styles.ledger}>
        <div className={styles.balance}>
          <span className={styles.balanceValue}>
            {amountValid ? amountValue.toFixed(0) : (availability?.walletBalance ?? 0).toFixed(0)}
          </span>
          <span className={styles.balanceUnit}>
            {amountValid ? currency : `${currency} wallet`}
          </span>
        </div>
        <p className={styles.earned}>
          Earned today {money(availability?.commissionEarnedToday, currency)}
        </p>
      </div>

      <div className={styles.body}>
        <div className={styles.stack}>
          {blocked ? (
            <p className={styles.warn}>
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {availability?.reason || "Airtime is not available right now."}
            </p>
          ) : null}

          <fieldset disabled={blocked} className="min-w-0">
            <legend className={styles.label}>Network</legend>
            <div className={styles.grid3}>
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
                    className={cn(styles.chip, selected && styles.chipOn)}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>
            <div className={cn(styles.grid2, "mt-1.5")}>
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
                    className={cn(styles.chip, selected && styles.chipOn)}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="block">
            <span className={styles.label}>Customer phone</span>
            <input
              type="tel"
              inputMode="tel"
              autoFocus
              className={cn(styles.field, "font-heading tracking-wide")}
              placeholder="07…"
              value={phone}
              disabled={blocked}
              onChange={(e) => setPhone(limitKenyanAirtimePhoneInput(e.target.value))}
            />
            {phoneHint ? (
              <p className={cn(styles.amber, "mt-1.5")}>{phoneHint}</p>
            ) : null}
            {networkMismatch ? (
              <p className={cn(styles.amber, "mt-1.5")}>
                That number looks like {detectedFromPhone}, not{" "}
                {KENYAN_NETWORKS.find((n) => n.id === network)?.label}.
              </p>
            ) : null}
          </label>

          <div>
            <span className={styles.label}>Amount</span>
            <div className={styles.quickRow}>
              {quickAmounts.map((a) => (
                <button
                  key={a}
                  type="button"
                  disabled={blocked}
                  onClick={() => setAmount(String(a))}
                  className={cn(styles.quick, Number(amount) === a && styles.quickOn)}
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
              className={cn(styles.field, "font-heading")}
              placeholder={`${whole(availability?.minAmount)}–${whole(availability?.maxSellableNow)}`}
              value={amount}
              disabled={blocked}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) void submit();
              }}
            />
            <p className={styles.hint}>
              {whole(availability?.minAmount)}–{whole(availability?.maxAmount)} per
              sale · {money(availability?.dailyRemaining, currency)} left today
            </p>
          </div>

          {overSellable ? (
            <p className={styles.danger}>
              You can send up to {money(availability?.maxSellableNow, currency)} right
              now — top up the wallet to go higher.
            </p>
          ) : quote && !quote.sellable && quote.reason ? (
            <p className={styles.danger}>{quote.reason}</p>
          ) : quote?.sellable ? (
            <div className={styles.quote}>
              <span>
                Wallet after{" "}
                <strong className="font-semibold tabular-nums">
                  {money(quote.walletBalanceAfter, currency)}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <Sparkles className="size-3.5" aria-hidden />+
                {money(quote.commission, currency)} for you
              </span>
            </div>
          ) : null}

          <section>
            <h3 className={styles.label}>How are they paying?</h3>
            {onAddToCart ? (
              <p className={cn(styles.hint, "mb-2")}>
                Add to the sale and they pay at checkout with everything else.
                Send now only if this is a stand-alone top-up.
              </p>
            ) : null}
            <div className={cn(styles.gridPay, canLookupCustomers && styles.three)}>
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
              <p className={cn(styles.note, "mt-2.5")}>
                Collect {amountValid ? money(amountValue, currency) : "the face value"}{" "}
                from them. Your wallet still funds the telco and keeps the commission.
              </p>
            ) : null}

            {tender === "MPESA" ? (
              <div className={cn(styles.panel, "mt-2.5")}>
                <label className="block">
                  <span className={styles.label}>M-Pesa number</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    className={cn(styles.field, "font-heading")}
                    placeholder="07…"
                    value={payer}
                    disabled={blocked}
                    onChange={(e) => {
                      setPayerTouched(true);
                      setPayer(limitKenyanAirtimePhoneInput(e.target.value));
                    }}
                  />
                </label>
                {payerHint ? (
                  <p className={cn(styles.amber, "mt-1.5")}>{payerHint}</p>
                ) : null}
                <p className={styles.hint}>
                  They pay your till first. Airtime sends after the PIN goes through.
                </p>
              </div>
            ) : null}

            {tender === "TAB" ? (
              <div className={cn(styles.panel, "mt-2.5")}>
                {selectedCustomer ? (
                  <div className={styles.customer}>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">
                        {selectedCustomer.name}
                      </p>
                      <p className={cn("text-[11px]", styles.muted)}>
                        Tab owed{" "}
                        {money(Number(selectedCustomer.credit?.balanceOwed), currency)}
                        {selectedCustomer.credit?.creditLimit != null
                          ? ` · limit ${money(Number(selectedCustomer.credit.creditLimit), currency)}`
                          : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.link}
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
                    <div className={styles.row}>
                      <input
                        className={cn(styles.field, "h-11 min-w-0 flex-1 text-sm")}
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
                      <button
                        type="button"
                        className={cn(styles.find, styles.findSecondary)}
                        disabled={!online || customerBusy || !customerQuery.trim()}
                        onClick={() => void searchCustomers(customerQuery)}
                      >
                        {customerBusy ? "…" : "Find"}
                      </button>
                    </div>
                    {customerHits.length > 0 ? (
                      <ul className="max-h-36 overflow-y-auto">
                        {customerHits.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              className={styles.hit}
                              onClick={() => setSelectedCustomer(c)}
                            >
                              {c.name}
                              <span className={cn("ml-1.5", styles.muted)}>
                                {customerPrimaryPhone(c.phones)}
                              </span>
                              {c.credit ? (
                                <span className={cn("mt-0.5 block text-[11px]", styles.muted)}>
                                  Tab owed {money(Number(c.credit.balanceOwed), currency)}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : customerNoMatch ? (
                      <p className={cn("text-[12px]", styles.muted)}>
                        No customer on that number — open a tab from checkout first.
                      </p>
                    ) : null}
                  </>
                )}
                {tabWouldExceed ? (
                  <p className={styles.danger}>
                    That would pass this customer&apos;s credit limit.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          {error ? <p className={styles.danger}>{error}</p> : null}
          {!online ? (
            <p className={styles.amber}>
              You&apos;re offline — airtime needs a live connection.
            </p>
          ) : null}
        </div>
      </div>

      <div className={styles.foot}>
        {onAddToCart ? (
          <button
            type="button"
            className={styles.cta}
            disabled={!canAddToCart}
            onClick={addToCart}
          >
            {quoting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ShoppingCart className="size-4" aria-hidden />
            )}
            {quoting
              ? "Checking…"
              : amountValid
                ? `Add ${money(amountValue, currency)} to sale`
                : "Add to sale"}
          </button>
        ) : null}
        <button
          type="button"
          className={onAddToCart ? cn(styles.cta, styles.findSecondary, "mt-2") : styles.cta}
          disabled={!canSubmit}
          onClick={() => void submit()}
        >
          {selling || quoting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Signal className="size-4" aria-hidden />
          )}
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
