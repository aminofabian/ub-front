"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Search, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createDomainOrder,
  fetchMyDomainOrders,
  payDomainOrder,
  searchDomainQuotes,
  syncDomainOrder,
  type DomainOrder,
  type DomainQuote,
} from "@/lib/api";

function formatPrice(cents: number | null | undefined, currency: string | null | undefined): string {
  if (cents == null) return "Price on request";
  const amount = cents / 100;
  const cur = (currency || "KES").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(
      amount,
    );
  } catch {
    return `${cur} ${amount.toLocaleString()}`;
  }
}

type StepKey = "pay" | "register" | "dns" | "ns" | "ssl";

function resolveStep(order: DomainOrder): { current: StepKey; failed: boolean; live: boolean } {
  const s = order.status.toLowerCase();
  if (s === "failed") return { current: "register", failed: true, live: false };
  if (s === "live") return { current: "ssl", failed: false, live: true };
  if (s === "awaiting_payment" || s === "quoted") return { current: "pay", failed: false, live: false };
  if (s === "registering") return { current: "register", failed: false, live: false };
  if (s === "owned") return { current: "dns", failed: false, live: false };
  if (s === "provisioning") {
    if (!order.vercelZoneReady) return { current: "dns", failed: false, live: false };
    if ((order.nsStatus || "").toLowerCase() !== "active") return { current: "ns", failed: false, live: false };
    return { current: "ssl", failed: false, live: false };
  }
  return { current: "register", failed: false, live: false };
}

const STEPS: { key: StepKey; label: string }[] = [
  { key: "pay", label: "Pay" },
  { key: "register", label: "Register" },
  { key: "dns", label: "DNS" },
  { key: "ns", label: "Nameservers" },
  { key: "ssl", label: "SSL" },
];

function stepIndex(key: StepKey): number {
  return STEPS.findIndex((s) => s.key === key);
}

function ProvisioningStepper({ order }: { order: DomainOrder }) {
  const { current, failed, live } = resolveStep(order);
  const currentIdx = stepIndex(current);

  return (
    <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Provisioning progress">
      {STEPS.map((step, idx) => {
        const done = live || (!failed && idx < currentIdx) || (live && step.key === "ssl");
        const active = !live && !failed && idx === currentIdx;
        return (
          <li
            key={step.key}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              done && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
              active && "bg-sky-500/15 text-sky-900 dark:text-sky-200",
              failed && idx === currentIdx && "bg-destructive/15 text-destructive",
              !done && !active && !(failed && idx === currentIdx) && "bg-muted text-muted-foreground",
            )}
          >
            {done ? <Check className="size-3" aria-hidden /> : null}
            {active ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

function orderHeadline(order: DomainOrder): { text: string; className: string } {
  const s = order.status.toLowerCase();
  if (s === "live") return { text: "Live", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" };
  if (s === "failed") return { text: "Failed", className: "bg-destructive/15 text-destructive" };
  if (s === "awaiting_payment" || s === "quoted") {
    return { text: "Awaiting payment", className: "bg-amber-500/15 text-amber-900 dark:text-amber-200" };
  }
  if (s === "registering") {
    return { text: "Registering", className: "bg-amber-500/15 text-amber-900 dark:text-amber-200" };
  }
  if (s === "owned" || s === "provisioning") {
    const { current } = resolveStep(order);
    const text =
      current === "dns" ? "Creating DNS" : current === "ns" ? "Finishing DNS" : "Verifying SSL";
    return { text, className: "bg-sky-500/15 text-sky-900 dark:text-sky-200" };
  }
  return { text: order.status, className: "bg-muted text-muted-foreground" };
}

function merchantSafeMessage(order: DomainOrder): string {
  if (order.merchantMessage?.trim()) return order.merchantMessage.trim();
  const { current, failed, live } = resolveStep(order);
  if (live) return "Your shop is live on this domain.";
  if (failed) return "Something went wrong setting up this domain. Contact support if it persists.";
  if (current === "pay") {
    return order.paymentAvailable
      ? "Pay with M-Pesa to continue — we'll handle registration and DNS."
      : "Payment is being confirmed. We'll start registration once it's cleared.";
  }
  if (current === "register") return "We're registering your domain. This usually takes a few minutes.";
  if (current === "dns") return "Creating DNS for your shop…";
  if (current === "ns") return "Finishing DNS with the registrar — no action needed from you.";
  return "Verifying SSL — almost live.";
}

function inputClass() {
  return cn(
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
  );
}

export function BuyKenyanDomainWizard({
  onLive,
  onFeedback,
}: {
  onLive: () => void;
  onFeedback: (kind: "success" | "error", text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<DomainQuote[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currency, setCurrency] = useState<string>("KES");
  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [payPhone, setPayPhone] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState<string | null>(null);

  const reloadOrders = useCallback(async () => {
    try {
      const list = await fetchMyDomainOrders();
      setOrders(list);
      setUnavailable(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (
        msg.toLowerCase().includes("hostafrica") ||
        msg.toLowerCase().includes("503") ||
        msg.toLowerCase().includes("not configured")
      ) {
        setUnavailable(true);
      }
    }
  }, []);

  useEffect(() => {
    void reloadOrders();
  }, [reloadOrders]);

  useEffect(() => {
    const open = orders.some((o) => {
      const s = o.status.toLowerCase();
      return (
        s === "registering" ||
        s === "owned" ||
        s === "provisioning" ||
        (s === "awaiting_payment" && o.lastStkStatus?.toLowerCase() === "pending")
      );
    });
    if (!open) return;
    const id = window.setInterval(() => {
      void (async () => {
        for (const o of orders) {
          const s = o.status.toLowerCase();
          if (
            s === "registering" ||
            s === "owned" ||
            s === "provisioning" ||
            ((s === "awaiting_payment" || s === "quoted") && o.lastStkStatus?.toLowerCase() === "pending")
          ) {
            try {
              await syncDomainOrder(o.id);
            } catch {
              /* keep polling */
            }
          }
        }
        await reloadOrders();
        onLive();
      })();
    }, 15000);
    return () => window.clearInterval(id);
  }, [orders, reloadOrders, onLive]);

  const onPay = async (order: DomainOrder) => {
    const phone = (payPhone[order.id] || "").trim();
    if (!phone) {
      onFeedback("error", "Enter the M-Pesa phone number to charge.");
      return;
    }
    setPaying(order.id);
    try {
      const result = await payDomainOrder(order.id, phone);
      setOrders((prev) => prev.map((o) => (o.id === result.order.id ? result.order : o)));
      if (result.accepted) {
        onFeedback("success", result.message || "Check your phone to complete M-Pesa payment.");
      } else {
        onFeedback("error", result.message || "Payment request declined.");
      }
      await reloadOrders();
    } catch (e) {
      onFeedback("error", e instanceof Error && e.message.trim() ? e.message : "Could not start M-Pesa payment.");
    } finally {
      setPaying(null);
    }
  };

  const onSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const result = await searchDomainQuotes(q);
      setQuotes(result.results || []);
      setSuggestions(result.suggestions || []);
      setCurrency(result.currency || "KES");
      setUnavailable(false);
      if ((result.results || []).length === 0) {
        onFeedback("error", "No Kenyan TLD matches. Try another name.");
      }
    } catch (e) {
      const msg = e instanceof Error && e.message.trim() ? e.message : "Search failed.";
      if (msg.toLowerCase().includes("not configured") || msg.toLowerCase().includes("unavailable")) {
        setUnavailable(true);
      }
      onFeedback("error", msg);
      setQuotes([]);
    } finally {
      setSearching(false);
    }
  };

  const onBuy = async (domain: string) => {
    setBuying(domain);
    try {
      const order = await createDomainOrder(domain);
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      const st = order.status.toLowerCase();
      if (st === "awaiting_payment" || st === "quoted") {
        onFeedback(
          "success",
          order.paymentAvailable
            ? `Order placed for ${domain}. Pay with M-Pesa to continue.`
            : `Order placed for ${domain}. Payment confirmation is pending.`,
        );
      } else {
        onFeedback("success", `Order started for ${domain}. We'll register it and set up DNS automatically.`);
        try {
          const synced = await syncDomainOrder(order.id);
          setOrders((prev) => prev.map((o) => (o.id === synced.id ? synced : o)));
          if (synced.status.toLowerCase() === "live") {
            onFeedback("success", `${synced.fqdn} is live.`);
            onLive();
          }
        } catch {
          /* ownership may still be pending */
        }
      }
      await reloadOrders();
    } catch (e) {
      onFeedback("error", e instanceof Error && e.message.trim() ? e.message : "Could not start purchase.");
    } finally {
      setBuying(null);
    }
  };

  const onSync = async (order: DomainOrder) => {
    setSyncing(order.id);
    try {
      const synced = await syncDomainOrder(order.id);
      setOrders((prev) => prev.map((o) => (o.id === synced.id ? synced : o)));
      if (synced.status.toLowerCase() === "live") {
        onFeedback("success", `${synced.fqdn} is live.`);
        onLive();
      } else {
        onFeedback("success", merchantSafeMessage(synced));
      }
    } catch (e) {
      onFeedback("error", e instanceof Error && e.message.trim() ? e.message : "Could not refresh status.");
      await reloadOrders();
    } finally {
      setSyncing(null);
    }
  };

  if (unavailable) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
        Kenyan domain purchase is not configured yet. Ask a platform admin to finish setup under{" "}
        <span className="font-medium text-foreground">Platform → Domains</span>. You can still connect a domain you
        already own below.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-4 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">Get a .ke domain</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Search Kenyan TLDs (.co.ke and friends). We register it, set up DNS, and bring your shop live — no registrar
          login for you.
        </p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onSearch}>
          <label htmlFor="domain-search" className="sr-only">
            Search domain
          </label>
          <input
            id="domain-search"
            className={cn(inputClass(), "sm:min-w-0 sm:flex-1")}
            placeholder="mama-njeri or mama-njeri.co.ke"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" disabled={searching || !query.trim()} className="shrink-0 gap-2 sm:w-auto">
            {searching ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Searching…
              </>
            ) : (
              <>
                <Search className="size-4" aria-hidden />
                Search
              </>
            )}
          </Button>
        </form>

        {quotes.length > 0 ? (
          <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/70">
                {quotes.map((q) => {
              const canBuy = q.available && q.priceCents != null && q.priceCents > 0;
              return (
              <li
                key={q.domain}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{q.domain}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {canBuy
                      ? formatPrice(q.priceCents, q.currency || currency)
                      : q.available
                        ? "Not available for purchase"
                        : "Unavailable"}
                    {q.premium ? " · Premium" : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!canBuy || buying === q.domain}
                  className="gap-1.5"
                  onClick={() => void onBuy(q.domain)}
                >
                  {buying === q.domain ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                  {canBuy ? "Buy" : "Taken"}
                </Button>
              </li>
              );
            })}
          </ul>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 font-mono text-xs hover:border-primary/30"
                onClick={() => setQuery(s)}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {orders.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Purchase orders</h3>
          <ul className="flex flex-col gap-3">
            {orders.map((order) => {
              const badge = orderHeadline(order);
              const s = order.status.toLowerCase();
              const showPay = s === "awaiting_payment" || s === "quoted";
              const showRefresh =
                s !== "live" &&
                s !== "failed" &&
                !(showPay && !order.paymentAvailable && order.lastStkStatus?.toLowerCase() !== "pending");

              return (
                <li key={order.id} className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium">{order.fqdn}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <span className={cn("rounded-full px-2 py-0.5 font-medium", badge.className)}>
                          {badge.text}
                        </span>
                        {order.priceCents != null ? (
                          <span className="text-muted-foreground">
                            {formatPrice(order.priceCents, order.currency)}
                          </span>
                        ) : null}
                      </div>
                      <ProvisioningStepper order={order} />
                      <p className="mt-2 text-xs text-muted-foreground">{merchantSafeMessage(order)}</p>

                      {showPay && order.paymentAvailable ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              className={cn(inputClass(), "sm:max-w-[14rem]")}
                              placeholder="07xx or 2547…"
                              inputMode="tel"
                              autoComplete="tel"
                              value={payPhone[order.id] || order.payerPhone || ""}
                              onChange={(e) =>
                                setPayPhone((prev) => ({ ...prev, [order.id]: e.target.value }))
                              }
                            />
                            <Button
                              size="sm"
                              className="gap-1.5"
                              disabled={paying === order.id}
                              onClick={() => void onPay(order)}
                            >
                              {paying === order.id ? (
                                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              ) : null}
                              {order.lastStkStatus?.toLowerCase() === "pending" ? "Resend STK" : "Pay with M-Pesa"}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {showRefresh ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={syncing === order.id}
                        onClick={() => void onSync(order)}
                      >
                        {syncing === order.id ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <RefreshCw className="size-3.5" aria-hidden />
                        )}
                        Refresh status
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
