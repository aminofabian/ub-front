"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleDashed,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  WifiOff,
} from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
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
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(amount);
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
    <ol className="mt-4 flex items-center gap-0" aria-label="Provisioning progress">
      {STEPS.map((step, idx) => {
        const done = live || (!failed && idx < currentIdx) || (live && step.key === "ssl");
        const active = !live && !failed && idx === currentIdx;
        const isFail = failed && idx === currentIdx;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                  done && "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  active && "border-primary/40 bg-primary/10 text-primary",
                  isFail && "border-destructive/40 bg-destructive/10 text-destructive",
                  !done && !active && !isFail && "border-border/70 bg-muted/40 text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : null}
                {active ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                {!done && !active ? idx + 1 : null}
              </span>
              <span
                className={cn(
                  "truncate text-[10px] font-medium tracking-wide",
                  active || done ? "text-foreground" : "text-muted-foreground",
                  isFail && "text-destructive",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 ? (
              <div
                className={cn(
                  "mx-1 mb-5 h-px min-w-[0.5rem] flex-1",
                  idx < currentIdx && !failed ? "bg-emerald-500/40" : "bg-border/70",
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function orderHeadline(order: DomainOrder): { text: string; className: string } {
  if (order.paymentSkippedByStub) {
    return { text: "Test mode — unpaid", className: "bg-amber-500/15 text-amber-900 dark:text-amber-200" };
  }
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

function canBuyQuote(q: DomainQuote): boolean {
  return !!q.available && q.priceCents != null && q.priceCents > 0;
}

function normalizeFqdn(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function pickPrimaryQuote(quotes: DomainQuote[], rawQuery: string): DomainQuote | null {
  if (!quotes.length) return null;
  const q = normalizeFqdn(rawQuery);
  const exact = quotes.find((x) => x.domain === q);
  if (exact) return exact;
  if (!q.includes(".")) {
    const coKe = quotes.find((x) => x.domain === `${q}.co.ke`);
    if (coKe) return coKe;
  }
  return quotes[0] ?? null;
}

function QuoteRow({
  quote,
  currency,
  buying,
  onBuy,
  emphasized,
}: {
  quote: DomainQuote;
  currency: string;
  buying: string | null;
  onBuy: (domain: string) => void;
  emphasized?: boolean;
}) {
  const busy = buying === quote.domain;
  return (
    <li
      className={cn(
        "flex flex-col gap-3 px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between",
        emphasized
          ? "bg-emerald-500/[0.06]"
          : "hover:bg-muted/30",
      )}
    >
      <div className="min-w-0">
        {emphasized ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800/80 dark:text-emerald-300/90">
            Available
          </p>
        ) : null}
        <p className={cn("font-mono font-semibold tracking-tight text-foreground", emphasized ? "mt-0.5 text-base" : "text-sm")}>
          {quote.domain}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground/80">
            {formatPrice(quote.priceCents, quote.currency || currency)}
          </span>
          <span className="text-muted-foreground/80"> · first year</span>
        </p>
      </div>
      <Button
        size={emphasized ? "default" : "sm"}
        disabled={busy}
        className="shrink-0 gap-1.5"
        onClick={() => onBuy(quote.domain)}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        {emphasized ? "Get this domain" : "Get this one"}
      </Button>
    </li>
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
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<DomainQuote[]>([]);
  const [currency, setCurrency] = useState<string>("KES");
  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [payPhone, setPayPhone] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

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

  const runSearch = async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setQuery(q);
    setSearching(true);
    setHasSearched(true);
    try {
      const result = await searchDomainQuotes(q);
      setQuotes(result.results || []);
      setCurrency(result.currency || "KES");
      setSearchedQuery(q);
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

  const onSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await runSearch(query);
  };

  const primaryQuote = useMemo(() => pickPrimaryQuote(quotes, searchedQuery || query), [quotes, searchedQuery, query]);
  const buyableQuotes = useMemo(() => quotes.filter(canBuyQuote), [quotes]);
  const primaryTaken = !!primaryQuote && !canBuyQuote(primaryQuote);
  const alternativeQuotes = useMemo(() => {
    if (!primaryQuote) return buyableQuotes;
    return buyableQuotes.filter((q) => q.domain !== primaryQuote.domain);
  }, [buyableQuotes, primaryQuote]);

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
            : `Order placed for ${domain}. Platform M-Pesa isn't configured yet — ask Super Admin under Platform → Domains.`,
        );
      } else if (order.paymentSkippedByStub) {
        onFeedback(
          "error",
          `Test mode: ${domain} skipped M-Pesa (billing stub is on). No payment was collected. Turn the stub off under Platform → Domains for real STK.`,
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
      <section className={cn(DASHBOARD_SECTION_SURFACE, "border-dashed bg-muted/15")}>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground">
            <WifiOff className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Kenyan domain purchase isn’t ready yet</h2>
            <p className={cn(dashboardHintClass(), "mt-1.5")}>
              Ask a platform admin to finish setup under{" "}
              <span className="font-medium text-foreground">Platform → Domains</span>. You can still connect a domain
              you already own below.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const showResults = hasSearched && !searching;

  return (
    <div className="space-y-6">
      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-xl">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Buy a Kenyan domain
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-[1.35rem]">
              Find your .ke name
            </h2>
            <p className={cn(dashboardHintClass(), "mt-2")}>
              Search, pay with M-Pesa, and we register it, set up DNS, and bring your shop live — no registrar login
              for you.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground sm:inline-flex">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            .co.ke · .or.ke · .me.ke · .ke
          </div>
        </div>

        <form className="mt-6" onSubmit={onSearch}>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
            <label htmlFor="domain-search" className="sr-only">
              Search domain
            </label>
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id="domain-search"
                className={dashboardInputClass(false, "h-12 pl-10 pr-3 text-[15px]")}
                placeholder="Try mama-njeri or mama-njeri.co.ke"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={searching || !query.trim()}
              className="h-12 shrink-0 gap-2 px-6 sm:w-auto"
            >
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
          </div>
        </form>

        {searching ? (
          <div className="mt-6 space-y-3" aria-busy="true" aria-label="Searching domains">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-border/50 bg-muted/30"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        ) : null}

        {showResults && quotes.length > 0 ? (
          <div className="mt-6 space-y-5">
            {primaryTaken && primaryQuote ? (
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.09] via-amber-500/[0.04] to-transparent px-4 py-5 sm:px-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-background/80 text-amber-800 dark:text-amber-200">
                    <CircleDashed className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold tracking-tight text-amber-950 dark:text-amber-50">
                      Oops — you were a little late
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-amber-950/80 dark:text-amber-100/80">
                      <span className="font-mono font-medium text-amber-950 dark:text-amber-50">
                        {primaryQuote.domain}
                      </span>{" "}
                      is already taken and in use.
                      {alternativeQuotes.length > 0
                        ? " These alternatives are still free and work great for a shop."
                        : " Try a different name — add a word, your town, or a shop nickname."}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {primaryQuote && canBuyQuote(primaryQuote) ? (
              <ul className="overflow-hidden rounded-2xl border border-emerald-500/25 shadow-sm ring-1 ring-emerald-500/10">
                <QuoteRow
                  quote={primaryQuote}
                  currency={currency}
                  buying={buying}
                  onBuy={(d) => void onBuy(d)}
                  emphasized
                />
              </ul>
            ) : null}

            {alternativeQuotes.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-primary" aria-hidden />
                  <h3 className="text-sm font-semibold tracking-tight">
                    {primaryTaken ? "Great alternatives" : "Other Kenyan options"}
                  </h3>
                </div>
                <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                  {alternativeQuotes.map((q) => (
                    <QuoteRow
                      key={q.domain}
                      quote={q}
                      currency={currency}
                      buying={buying}
                      onBuy={(d) => void onBuy(d)}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {showResults && quotes.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No Kenyan matches for that search</p>
            <p className={cn(dashboardHintClass(), "mx-auto mt-1.5 max-w-sm")}>
              Try a shorter shop name, or add .co.ke yourself (e.g. mybrand.co.ke).
            </p>
          </div>
        ) : null}
      </section>

      {orders.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3 px-0.5">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Your purchases</h3>
              <p className={dashboardHintClass()}>We keep working in the background — refresh anytime.</p>
            </div>
          </div>
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
                <li
                  key={order.id}
                  className={cn(
                    "rounded-2xl border bg-card p-4 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04] sm:p-5",
                    s === "live" ? "border-emerald-500/25" : "border-border/70",
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold tracking-tight">{order.fqdn}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", badge.className)}>
                          {badge.text}
                        </span>
                        {order.priceCents != null ? (
                          <span className="text-xs text-muted-foreground">
                            {formatPrice(order.priceCents, order.currency)}
                          </span>
                        ) : null}
                      </div>
                      <ProvisioningStepper order={order} />
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {merchantSafeMessage(order)}
                      </p>

                      {showPay && order.paymentAvailable ? (
                        <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-3.5">
                          <p className="text-xs font-medium text-foreground">Pay with M-Pesa</p>
                          <p className={cn(dashboardHintClass(), "mt-0.5")}>
                            Enter the phone that should receive the STK prompt. Payment goes to Palmart’s platform till.
                          </p>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              className={dashboardInputClass(false, "sm:max-w-[15rem]")}
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
                              {order.lastStkStatus?.toLowerCase() === "pending" ? "Resend STK" : "Send M-Pesa prompt"}
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {showPay && !order.paymentAvailable ? (
                        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-3 text-sm text-amber-950 dark:text-amber-100">
                          M-Pesa isn’t available yet. Ask Super Admin to save{" "}
                          <span className="font-medium">Palmart M-Pesa</span> credentials under Platform → Domains and
                          turn <span className="font-medium">Billing stub</span> off.
                        </div>
                      ) : null}

                      {order.paymentSkippedByStub ? (
                        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-3 text-sm text-amber-950 dark:text-amber-100">
                          Test mode: billing stub skipped payment — no STK was sent and no money was charged.
                        </div>
                      ) : null}
                    </div>
                    {showRefresh ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5"
                        disabled={syncing === order.id}
                        onClick={() => void onSync(order)}
                      >
                        {syncing === order.id ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <RefreshCw className="size-3.5" aria-hidden />
                        )}
                        Refresh
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
